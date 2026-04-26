pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable2Step.sol";

interface IRegistry {
    function isTotem(address user) external view returns (bool);
}

interface IAttestation {
    function isHuman(address user) external view returns (bool);
}

interface IOracle {
    function getMetrics(address user)
        external
        view
        returns (uint256 score, uint256 influence, uint256 timestamp);
}

interface IBondingCurve {
    function getPrice(address user) external view returns (uint256);
}

interface IRateLimiter {
    function check(address user, bytes32 action) external;
}

contract TotemCoreRouter is Ownable2Step {

    // =========================================================
    // DEPENDENCIES
    // =========================================================

    IRegistry public immutable registry;
    IAttestation public immutable attestation;
    IOracle public immutable oracle;
    IBondingCurve public immutable curve;
    IRateLimiter public limiter;

    // =========================================================
    // CACHE (gas optimization layer)
    // =========================================================

    struct CachedUser {
        uint256 score;
        uint256 influence;
        uint256 price;
        bool human;
        uint256 blockNumber;
        bool valid;
    }

    mapping(address => CachedUser) private cache;

    bytes32 public constant ACTION_QUERY = keccak256("QUERY");

    // =========================================================
    // ERRORS
    // =========================================================

    error NotHuman();
    error NotRegistered();
    error RateLimited();
    error StaleCache();

    // =========================================================
    // CONSTRUCTOR
    // =========================================================

    constructor(
        address _registry,
        address _attestation,
        address _oracle,
        address _curve,
        address _limiter
    ) Ownable(msg.sender) { // [COMPILE FIX] OZ v5 requiere initialOwner explícito
        registry = IRegistry(_registry);
        attestation = IAttestation(_attestation);
        oracle = IOracle(_oracle);
        curve = IBondingCurve(_curve);
        limiter = IRateLimiter(_limiter);
    }

    // =========================================================
    // CORE VALIDATION (FAST PATH)
    // =========================================================

    function _loadUser(address user) internal returns (CachedUser memory c) {

        if (cache[user].blockNumber == block.number && cache[user].valid) {
            return cache[user];
        }

        (uint256 score, uint256 influence,) = oracle.getMetrics(user);
        uint256 price = curve.getPrice(user);
        bool human = attestation.isHuman(user);

        c = CachedUser({
            score: score,
            influence: influence,
            price: price,
            human: human,
            blockNumber: block.number,
            valid: true
        });

        cache[user] = c;
    }

    // =========================================================
    // ELIGIBILITY CHECK (GATEKEEPER)
    // =========================================================

    function isEligibleUser(address user) public view returns (bool) {
        return registry.isTotem(user) && attestation.isHuman(user);
    }

    // =========================================================
    // PROTECTED QUERY FLOW
    // =========================================================

    function protectedQuery(address user)
        external
        returns (uint256 score, uint256 influence, uint256 price)
    {
        if (!registry.isTotem(user)) revert NotRegistered();

        limiter.check(user, ACTION_QUERY);

        CachedUser memory c = _loadUser(user);

        if (!c.human) revert NotHuman();

        return (c.score, c.influence, c.price);
    }

    // =========================================================
    // PROTECTED BUY SIGNAL (pre-curve validation layer)
    // =========================================================

    function validateBuy(address user, uint256 maxPrice)
        external
        returns (bool ok, uint256 price)
    {
        CachedUser memory c = _loadUser(user);

        if (!c.human) revert NotHuman();

        price = c.price;

        ok = price <= maxPrice;
    }

    // =========================================================
    // PROTECTED SELL SIGNAL
    // =========================================================

    function validateSell(address user)
        external
        view
        returns (bool ok)
    {
        ok =
            registry.isTotem(user) &&
            attestation.isHuman(user);
    }

    // =========================================================
    // ADMIN
    // =========================================================

    function setLimiter(address _limiter) external onlyOwner {
        limiter = IRateLimiter(_limiter);
    }

    // =========================================================
    // CACHE INVALIDATION (optional control hook)
    // =========================================================

    function invalidate(address user) external onlyOwner {
        delete cache[user];
    }
}
