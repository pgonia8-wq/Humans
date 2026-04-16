// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";

interface IRegistry {
    function isTotem(address user) external view returns (bool);
}

interface IOracle {
    function getMetrics(address user) external view returns (
        uint256 score,
        uint256 influence,
        uint256 timestamp
    );
}

interface IBondingCurve {
    function getPrice(address user) external view returns (uint256);
}

interface IRateLimiter {
    function check(address user, bytes32 action) external;
}

contract TotemAccessGateway is ReentrancyGuard, Pausable, Ownable2Step {

    // -------------------------
    // 🔗 DEPENDENCIES
    // -------------------------
    IRegistry public immutable registry;
    IOracle public immutable oracle;
    IBondingCurve public immutable curve;
    IRateLimiter public limiter;

    // -------------------------
    // 🔐 SIGNERS
    // -------------------------
    address public signer;
    address public backupSigner;

    // -------------------------
    // 🔁 NONCES
    // -------------------------
    mapping(address => uint256) public nonces;

    // -------------------------
    // 📜 EIP-712
    // -------------------------
    uint256 private INITIAL_CHAIN_ID;
    bytes32 private INITIAL_DOMAIN_SEPARATOR;

    bytes32 private constant QUERY_TYPEHASH =
        keccak256("Query(address user,uint256 maxPrice,uint256 nonce,uint256 deadline)");

    bytes32 public constant ACTION_QUERY = keccak256("QUERY");

    // -------------------------
    // 📡 EVENTS
    // -------------------------
    event QueryConsumed(
        address indexed user,
        uint256 score,
        uint256 influence,
        uint256 price
    );

    event Withdraw(address indexed to, uint256 amount);

    // -------------------------
    // 🏗️ CONSTRUCTOR
    // -------------------------
    constructor(
        address _registry,
        address _oracle,
        address _curve,
        address _limiter,
        address _signer,
        address _backupSigner
    ) {
        registry = IRegistry(_registry);
        oracle = IOracle(_oracle);
        curve = IBondingCurve(_curve);
        limiter = IRateLimiter(_limiter);

        signer = _signer;
        backupSigner = _backupSigner;

        INITIAL_CHAIN_ID = block.chainid;
        INITIAL_DOMAIN_SEPARATOR = _buildDomainSeparator();
    }

    // -------------------------
    // 🔐 DOMAIN LOGIC
    // -------------------------
    function _domainSeparator() internal view returns (bytes32) {
        if (block.chainid == INITIAL_CHAIN_ID) {
            return INITIAL_DOMAIN_SEPARATOR;
        } else {
            return _buildDomainSeparator();
        }
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
    // 🔐 SIGNATURE VERIFY
    // -------------------------
    function _verify(
        address user,
        uint256 maxPrice,
        uint256 nonce,
        uint256 deadline,
        bytes memory signature
    ) internal view returns (address) {

        require(block.timestamp <= deadline, "expired");

        bytes32 structHash = keccak256(
            abi.encode(
                QUERY_TYPEHASH,
                user,
                maxPrice,
                nonce,
                deadline
            )
        );

        bytes32 digest = keccak256(
            abi.encodePacked("\x19\x01", _domainSeparator(), structHash)
        );

        return _recover(digest, signature);
    }

    function _recover(bytes32 digest, bytes memory sig) internal pure returns (address) {
        require(sig.length == 65, "bad sig");

        bytes32 r;
        bytes32 s;
        uint8 v;

        assembly {
            r := mload(add(sig, 32))
            s := mload(add(sig, 64))
            v := byte(0, mload(add(sig, 96)))
        }

        return ecrecover(digest, v, r, s);
    }

    function _isValidSigner(address recovered) internal view returns (bool) {
        return recovered == signer || recovered == backupSigner;
    }

    // -------------------------
    // 💰 MAIN ENTRYPOINT
    // -------------------------
    function query(
        uint256 maxPrice,
        uint256 deadline,
        bytes calldata signature
    )
        external
        payable
        whenNotPaused
        nonReentrant
        returns (uint256 score, uint256 influence)
    {
        address user = msg.sender;

        require(registry.isTotem(user), "not Totem");

        // 🔒 Rate limit
        limiter.check(user, ACTION_QUERY);

        uint256 nonce = nonces[user]++;

        address recovered = _verify(user, maxPrice, nonce, deadline, signature);
        require(_isValidSigner(recovered), "invalid sig");

        uint256 currentPrice = curve.getPrice(user);

        // 🔒 Slippage-safe check
        require(currentPrice <= maxPrice, "slippage exceeded");

        require(msg.value >= currentPrice, "insufficient fee");

        (score, influence,) = oracle.getMetrics(user);

        emit QueryConsumed(user, score, influence, currentPrice);
    }

    // -------------------------
    // 💸 WITHDRAW
    // -------------------------
    function withdraw(address payable to, uint256 amount)
        external
        onlyOwner
        nonReentrant
    {
        require(amount <= address(this).balance, "too much");

        (bool ok,) = to.call{value: amount}("");
        require(ok, "transfer failed");

        emit Withdraw(to, amount);
    }

    // -------------------------
    // ⚙️ ADMIN
    // -------------------------
    function setLimiter(address _limiter) external onlyOwner {
        limiter = IRateLimiter(_limiter);
    }

    function setSigners(address _primary, address _backup) external onlyOwner {
        signer = _primary;
        backupSigner = _backup;
    }

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }
}
