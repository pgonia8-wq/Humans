// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

interface IRegistry {
    function isTotem(address user) external view returns (bool);
}

contract TotemMarketMetrics is Ownable2Step, ReentrancyGuard {

    using ECDSA for bytes32;

    IRegistry public immutable registry;

    address public curve;
    address public signer;
    address public backupSigner;

    struct MarketData {
        uint256 rawVolume;
        uint256 verifiedVolume;
        uint256 createdAt;
        uint256 lastTradeAt;
    }

    mapping(address => MarketData) public markets;
    mapping(address => uint256) public nonces;

    bytes32 private DOMAIN_SEPARATOR;

    bytes32 private constant VERIFY_TYPEHASH =
        keccak256("Verify(address totem,uint256 volume,uint256 nonce,uint256 deadline)");

    // EVENTS
    event TradeRecorded(address indexed totem, uint256 amount);
    event VolumeVerified(address indexed totem, uint256 volume);
    event CurveUpdated(address curve);
    event SignersUpdated(address primary, address backup);

    error NotCurve();
    error NotTotem();
    error InvalidSig();
    error Expired();

    modifier onlyCurve() {
        if (msg.sender != curve) revert NotCurve();
        _;
    }

    constructor(
        address _registry,
        address _curve,
        address _signer,
        address _backup
    ) {
        require(_registry != address(0), "zero");

        registry = IRegistry(_registry);
        curve = _curve;
        signer = _signer;
        backupSigner = _backup;

        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256(bytes("TotemMetrics")),
                keccak256(bytes("1")),
                block.chainid,
                address(this)
            )
        );
    }

    // ================= RAW TRACKING =================

    function recordBuy(address totem, uint256 amount) external onlyCurve {
        _record(totem, amount);
    }

    function recordSell(address totem, uint256 amount) external onlyCurve {
        _record(totem, amount);
    }

    function _record(address totem, uint256 amount) internal {
        if (!registry.isTotem(totem)) revert NotTotem();
        if (amount == 0) return;

        MarketData storage m = markets[totem];

        if (m.createdAt == 0) {
            m.createdAt = block.timestamp;
        }

        m.rawVolume += amount;
        m.lastTradeAt = block.timestamp;

        emit TradeRecorded(totem, amount);
    }

    // ================= VERIFIED (ORACLE) =================

    function verifyVolume(
        address totem,
        uint256 volume,
        uint256 deadline,
        bytes calldata sig
    ) external nonReentrant {

        if (block.timestamp > deadline) revert Expired();

        uint256 nonce = nonces[totem]++;

        bytes32 structHash = keccak256(
            abi.encode(
                VERIFY_TYPEHASH,
                totem,
                volume,
                nonce,
                deadline
            )
        );

        bytes32 digest = keccak256(
            abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, structHash)
        );

        // 🔥 FIX CRÍTICO: ECDSA estándar (anti-malleability)
        address recovered = digest.recover(sig);

        if (recovered != signer && recovered != backupSigner) revert InvalidSig();

        markets[totem].verifiedVolume = volume;

        emit VolumeVerified(totem, volume);
    }

    // ================= VIEW =================

    function getVolume(address totem) external view returns (uint256) {
        uint256 v = markets[totem].verifiedVolume;
        return v > 0 ? v : markets[totem].rawVolume;
    }

    // ================= ADMIN =================

    function setCurve(address _curve) external onlyOwner {
        curve = _curve;
        emit CurveUpdated(_curve);
    }

    function setSigners(address _primary, address _backup) external onlyOwner {
        signer = _primary;
        backupSigner = _backup;
        emit SignersUpdated(_primary, _backup);
    }
}
