// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

interface IRegistry {
    function isTotem(address user) external view returns (bool);
}

interface IBondingCurve {
    function getPrice(address user) external view returns (uint256);
}

interface IRateLimiter {
    function check(address user, bytes32 action) external;
}

contract TotemAccessGateway is ReentrancyGuard, Pausable, Ownable2Step {
    using ECDSA for bytes32;

    // -------------------------
    // 🔗 DEPENDENCIES
    // -------------------------
    IRegistry public immutable registry;
    IBondingCurve public curve;
    IRateLimiter public limiter;

    // -------------------------
    // 🔐 SIGNERS
    // -------------------------
    mapping(address => bool) public authorizedSigners;

    // -------------------------
    // 🔁 NONCES
    // -------------------------
    mapping(address => uint256) public nonces;

    // -------------------------
    // ⚙️ CONFIG
    // -------------------------
    uint256 public constant MAX_DATA_AGE = 2 minutes;
    uint256 public priceToleranceBps = 200; // 2%

    // -------------------------
    // 📜 EIP-712
    // -------------------------
    uint256 private immutable INITIAL_CHAIN_ID;
    bytes32 private immutable INITIAL_DOMAIN_SEPARATOR;

    bytes32 private constant QUERY_TYPEHASH =
        keccak256(
            "Query(address user,uint256 price,uint256 score,uint256 influence,uint256 nonce,uint256 deadline,uint256 signedAt)"
        );

    bytes32 public constant ACTION_QUERY = keccak256("QUERY");

    // -------------------------
    // 📡 EVENTS
    // -------------------------
    event QueryConsumed(
        address indexed user,
        uint256 price,
        uint256 score,
        uint256 influence
    );

    event SignerUpdated(address indexed signer, bool allowed);
    event Withdraw(address indexed to, uint256 amount);

    // -------------------------
    // ❌ ERRORS
    // -------------------------
    error NotTotem();
    error Expired();
    error InvalidSignature();
    error InvalidNonce();
    error StaleData();
    error SlippageExceeded();
    error ScoreTooLow();
    error InsufficientFee();
    error ZeroAddress();
    error TransferFailed();

    // -------------------------
    // 🏗️ CONSTRUCTOR
    // -------------------------
    constructor(
        address _registry,
        address _curve,
        address _limiter,
        address _signer
    ) Ownable(msg.sender) {
        if (_registry == address(0) || _curve == address(0) || _signer == address(0))
            revert ZeroAddress();

        registry = IRegistry(_registry);
        curve = IBondingCurve(_curve);
        limiter = IRateLimiter(_limiter);

        authorizedSigners[_signer] = true;

        INITIAL_CHAIN_ID = block.chainid;
        INITIAL_DOMAIN_SEPARATOR = _buildDomainSeparator();
    }

    // -------------------------
    // 🔐 DOMAIN
    // -------------------------
    function _domainSeparator() internal view returns (bytes32) {
        return block.chainid == INITIAL_CHAIN_ID
            ? INITIAL_DOMAIN_SEPARATOR
            : _buildDomainSeparator();
    }

    function _buildDomainSeparator() private view returns (bytes32) {
        return keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256(bytes("TotemGateway")),
                keccak256(bytes("1")),
                block.chainid,
                address(this)
            )
        );
    }

    // -------------------------
    // 💰 MAIN
    // -------------------------
    function query(
        uint256 signedPrice,
        uint256 signedScore,
        uint256 signedInfluence,
        uint256 minScore,        // UX protection
        uint256 nonce,
        uint256 deadline,
        uint256 signedAt,
        bytes calldata signature
    )
        external
        payable
        whenNotPaused
        nonReentrant
        returns (uint256 score, uint256 influence)
    {
        address user = msg.sender;

        if (!registry.isTotem(user)) revert NotTotem();

        limiter.check(user, ACTION_QUERY);

        if (nonce != nonces[user]) revert InvalidNonce();
        if (block.timestamp > deadline) revert Expired();
        if (block.timestamp > signedAt + MAX_DATA_AGE) revert StaleData();

        bytes32 structHash = keccak256(
            abi.encode(
                QUERY_TYPEHASH,
                user,
                signedPrice,
                signedScore,
                signedInfluence,
                nonce,
                deadline,
                signedAt
            )
        );

        bytes32 digest = keccak256(
            abi.encodePacked("\x19\x01", _domainSeparator(), structHash)
        );

        address recovered = digest.recover(signature);
        if (!authorizedSigners[recovered]) revert InvalidSignature();

        nonces[user] = nonce + 1;

        // 🔥 PRICE PROTECTION (ANTI-UNDERPRICING)
        uint256 currentPrice = curve.getPrice(user);

        uint256 maxAllowed = (signedPrice * (10_000 + priceToleranceBps)) / 10_000;
        if (currentPrice > maxAllowed) revert SlippageExceeded();

        if (msg.value < signedPrice) revert InsufficientFee();

        // 🔥 SCORE UX PROTECTION
        if (signedScore < minScore) revert ScoreTooLow();

        emit QueryConsumed(user, signedPrice, signedScore, signedInfluence);

        return (signedScore, signedInfluence);
    }

    // -------------------------
    // 💸 WITHDRAW
    // -------------------------
    function withdraw(address payable to, uint256 amount)
        external
        onlyOwner
        nonReentrant
    {
        if (to == address(0)) revert ZeroAddress();
        if (amount > address(this).balance) revert InsufficientFee();

        (bool ok,) = to.call{value: amount}("");
        if (!ok) revert TransferFailed();

        emit Withdraw(to, amount);
    }

    // -------------------------
    // ⚙️ ADMIN
    // -------------------------
    function authorizeSigner(address signer, bool allowed) external onlyOwner {
        if (signer == address(0)) revert ZeroAddress();
        authorizedSigners[signer] = allowed;
        emit SignerUpdated(signer, allowed);
    }

    function setTolerance(uint256 bps) external onlyOwner {
        require(bps <= 1000, "too high"); // max 10%
        priceToleranceBps = bps;
    }

    function setLimiter(address _limiter) external onlyOwner {
        limiter = IRateLimiter(_limiter);
    }

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }
}
