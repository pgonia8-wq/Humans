// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable2Step.sol";

interface ITotemRegistry {
    function status(address user) external view returns (
        bool fraudLocked,
        uint256 level,
        uint256 badge
    );
}

contract TotemRateLimiter is Ownable2Step {

    // =========================
    // 🔹 STRUCTS (PACKED)
    // =========================

    // 1 slot (16 + 8 + 8 = 32 bytes)
    struct Config {
        uint128 baseCapacity;
        uint64 baseRefill;
        uint64 flags; // bitmask
    }

    // 1 slot (16 + 8 = 24 bytes)
    struct Bucket {
        uint128 tokens;
        uint64 lastRefill;
    }

    // 1 slot (8 + 1 + 1 = 10 bytes)
    struct Cache {
        uint64 blockNumber;
        uint8 level;
        uint8 locked;
    }

    // =========================
    // 🔹 STORAGE
    // =========================

    mapping(bytes32 => Config) public configs;
    mapping(address => mapping(bytes32 => Bucket)) public buckets;
    mapping(address => bool) public authorizedCallers;

    mapping(address => Cache) private _cache;

    ITotemRegistry public immutable registry;

    // =========================
    // 🔹 CONSTANTS
    // =========================

    bytes32 public constant ACTION_QUERY  = keccak256("QUERY");
    bytes32 public constant ACTION_UPDATE = keccak256("UPDATE");

    uint64 internal constant FLAG_SCALE = 1; // bit 0

    // =========================
    // 🔹 EVENTS
    // =========================

    event ConfigUpdated(bytes32 indexed action, uint128 cap, uint64 refill, uint64 flags);
    event CallerAuthorized(address indexed caller, bool allowed);

    // =========================
    // 🔹 ERRORS
    // =========================

    error RateLimited();
    error NotAuthorized();
    error InvalidConfig();
    error FraudBlocked();

    // =========================
    // 🔹 CONSTRUCTOR
    // =========================

    constructor(address _registry) Ownable(msg.sender) { // [COMPILE FIX] OZ v5 requiere initialOwner explícito
        registry = ITotemRegistry(_registry);

        // QUERY → escala con nivel
        configs[ACTION_QUERY] = Config({
            baseCapacity: 5,
            baseRefill: 1,
            flags: FLAG_SCALE
        });

        // UPDATE → fijo (anti abuso)
        configs[ACTION_UPDATE] = Config({
            baseCapacity: 2,
            baseRefill: 1,
            flags: 0
        });
    }

    // =========================
    // 🔹 CACHE (1 CALL / BLOCK)
    // =========================

    function _getUserState(address user)
        internal
        returns (uint8 level, bool locked)
    {
        Cache storage c = _cache[user];

        if (c.blockNumber == block.number) {
            return (c.level, c.locked == 1);
        }

        (bool l, uint256 lvl,) = registry.status(user);

        // clamp seguro
        if (lvl < 1) lvl = 1;
        if (lvl > 5) lvl = 5;

        c.blockNumber = uint64(block.number);
        c.level = uint8(lvl);
        c.locked = l ? 1 : 0;

        return (uint8(lvl), l);
    }

    // =========================
    // 🔹 CONFIG RESOLUTION
    // =========================

    function _resolveConfig(address user, bytes32 action)
        internal
        returns (uint128 capacity, uint128 refill)
    {
        Config memory cfg = configs[action];

        if (cfg.baseCapacity == 0 || cfg.baseRefill == 0) {
            revert InvalidConfig();
        }

        (uint8 level, bool locked) = _getUserState(user);

        if (locked) revert FraudBlocked();

        if ((cfg.flags & FLAG_SCALE) != 0) {
            capacity = cfg.baseCapacity * level;
            refill   = uint128(uint256(cfg.baseRefill) * level);
        } else {
            capacity = cfg.baseCapacity;
            refill   = cfg.baseRefill;
        }
    }

    // =========================
    // 🔹 CORE CHECK
    // =========================

    function check(address user, bytes32 action) external {
        if (!authorizedCallers[msg.sender]) revert NotAuthorized();

        (uint128 capacity, uint128 refillRate) = _resolveConfig(user, action);

        Bucket storage b = buckets[user][action];
        uint64 nowTs = uint64(block.timestamp);

        if (b.lastRefill == 0) {
            b.lastRefill = nowTs;
            b.tokens = capacity;
        }

        uint64 elapsed = nowTs - b.lastRefill;

        if (elapsed > 0) {
            uint256 refill = uint256(elapsed) * uint256(refillRate);

            if (refill > 0) {
                uint256 newTokens = uint256(b.tokens) + refill;

                if (newTokens > capacity) {
                    newTokens = capacity;
                }

                b.tokens = uint128(newTokens);

                uint256 consumedTime = refill / refillRate;
                if (consumedTime > elapsed) consumedTime = elapsed;

                b.lastRefill = uint64(uint256(b.lastRefill) + consumedTime);
            }
        }

        if (b.tokens == 0) revert RateLimited();

        unchecked {
            b.tokens -= 1;
        }
    }

    // =========================
    // 🔹 ADMIN
    // =========================

    function setConfig(
        bytes32 action,
        uint128 capacity,
        uint64 refillRate,
        uint64 flags
    ) external onlyOwner {
        if (capacity == 0 || refillRate == 0) revert InvalidConfig();

        configs[action] = Config(capacity, refillRate, flags);

        emit ConfigUpdated(action, capacity, refillRate, flags);
    }

    function setCaller(address caller, bool allowed) external onlyOwner {
        authorizedCallers[caller] = allowed;
        emit CallerAuthorized(caller, allowed);
    }
}
