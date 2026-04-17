// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC721Minimal {
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    function balanceOf(address owner) external view returns (uint256);
    function ownerOf(uint256 tokenId) external view returns (address);
}

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

contract Totem is IERC721Minimal {

    string public constant name = "Human Totem";
    string public constant symbol = "TOTEM";

    uint256 public totalSupply;

    IRegistry public immutable registry;
    IOracle public immutable oracle;
    IBondingCurve public curve;

    address public admin;
    address public pendingAdmin;
    bool public paused;

    uint256 public constant MIN_SYNC_INTERVAL = 1 hours;
    uint256 public constant MAX_ACCUMULATED_SCORE = 10_000_000;
    uint256 public constant MAX_FUTURE_DRIFT = 5 minutes;
    uint256 public constant MAX_STALE_TIME = 10 minutes;

    uint256 public manualFraudDelay;

    struct History {
        uint256 totalScoreAccumulated;
        uint256 lastScore;
        uint256 lastInfluence;
        uint256 lastUpdate;
        uint256 negativeEvents;
        bool initialized;
    }

    struct Status {
        bool fraudLocked;
        uint256 level;
        uint256 badge;
    }

    struct FraudRequest {
        uint256 executeAfter;
        bool lock;
        string reason;
        bytes evidence;
    }

    mapping(uint256 => address) private _ownerOf;
    mapping(address => uint256) public tokenOf;

    mapping(address => History) public history;
    mapping(address => Status) public status;
    mapping(address => FraudRequest) public pendingFraud;

    event Mint(address indexed user, uint256 tokenId);
    event HistoryInitialized(address indexed user, uint256 score, uint256 influence);
    event Sync(address indexed user, uint256 score, uint256 influence, uint256 level, uint256 badge);
    event ScoreAccumulated(address indexed user, uint256 total);
    event NegativeEvent(address indexed user, uint256 totalNegativeEvents);

    event FraudLockRequested(address indexed user, bool lock, string reason, bytes evidence, uint256 executeAfter);
    event FraudLockExecuted(address indexed user, bool locked);

    event Paused(address indexed admin, bool status);
    event AdminTransferStarted(address indexed current, address indexed pending);
    event AdminTransferred(address indexed newAdmin);
    event CurveReadFailed(address indexed user);

    error NotAdmin();
    error NotRegistered();
    error AlreadyMinted();
    error Soulbound();
    error TokenNotExists();
    error InvalidTimestamp();
    error SyncTooFrequent();
    error FraudLocked();
    error PausedError();
    error ZeroAddress();
    error NotPendingAdmin();
    error FraudDelayNotMet();

    modifier onlyAdmin() {
        if (msg.sender != admin) revert NotAdmin();
        _;
    }

    modifier notPaused() {
        if (paused) revert PausedError();
        _;
    }

    constructor(address _registry, address _oracle, address _curve) {
        if (_registry == address(0) || _oracle == address(0) || _curve == address(0)) revert ZeroAddress();

        registry = IRegistry(_registry);
        oracle = IOracle(_oracle);
        curve = IBondingCurve(_curve);

        admin = msg.sender;
    }

    // ====================== ERC721 MINIMAL ======================
    function balanceOf(address owner) external view returns (uint256) {
        return tokenOf[owner] == 0 ? 0 : 1;
    }

    function ownerOf(uint256 tokenId) public view returns (address) {
        address owner = _ownerOf[tokenId];
        if (owner == address(0)) revert TokenNotExists();
        return owner;
    }

    // ====================== MINT ======================
    function mint() external notPaused {
        if (!registry.isTotem(msg.sender)) revert NotRegistered();
        if (tokenOf[msg.sender] != 0) revert AlreadyMinted();
        if (status[msg.sender].fraudLocked) revert FraudLocked();

        totalSupply++;
        uint256 tokenId = totalSupply;

        _ownerOf[tokenId] = msg.sender;
        tokenOf[msg.sender] = tokenId;

        emit Transfer(address(0), msg.sender, tokenId);
        emit Mint(msg.sender, tokenId);
    }

    // ====================== SOULBOUND ======================
    function transferFrom(address, address, uint256) external pure { revert Soulbound(); }
    function safeTransferFrom(address, address, uint256) external pure { revert Soulbound(); }
    function safeTransferFrom(address, address, uint256, bytes calldata) external pure { revert Soulbound(); }
    function approve(address, uint256) external pure { revert Soulbound(); }
    function setApprovalForAll(address, bool) external pure { revert Soulbound(); }

    // ====================== SYNC ======================
    function sync(address user) external notPaused {
        if (tokenOf[user] == 0) revert TokenNotExists();
        if (!registry.isTotem(user)) revert NotRegistered();
        if (status[user].fraudLocked) revert FraudLocked();

        History storage h = history[user];

        if (h.initialized && block.timestamp < h.lastUpdate + MIN_SYNC_INTERVAL) {
            revert SyncTooFrequent();
        }

        (uint256 score, uint256 influence, uint256 timestamp) = oracle.getMetrics(user);

        if (timestamp > block.timestamp + MAX_FUTURE_DRIFT || block.timestamp - timestamp > MAX_STALE_TIME) {
            revert InvalidTimestamp();
        }

        if (!h.initialized) {
            h.lastScore = score;
            h.lastInfluence = influence;
            h.lastUpdate = timestamp;
            h.initialized = true;

            emit HistoryInitialized(user, score, influence);
            return;
        }

        if (timestamp <= h.lastUpdate) revert InvalidTimestamp();

        // Decay
        if (h.totalScoreAccumulated > 0) {
            uint256 decay = (h.totalScoreAccumulated * (block.timestamp - h.lastUpdate)) / 1 days / 100;
            h.totalScoreAccumulated = decay >= h.totalScoreAccumulated ? 0 : h.totalScoreAccumulated - decay;
        }

        // Delta + penalización
        if (score > h.lastScore) {
            h.totalScoreAccumulated += (score - h.lastScore);
        } else if (score < h.lastScore) {
            h.negativeEvents++;
            emit NegativeEvent(user, h.negativeEvents);

            uint256 penalty = (h.lastScore - score) / 3;
            uint256 maxPenalty = h.totalScoreAccumulated / 2;
            if (penalty > maxPenalty) penalty = maxPenalty;

            h.totalScoreAccumulated = penalty >= h.totalScoreAccumulated ? 0 : h.totalScoreAccumulated - penalty;
        }

        if (h.totalScoreAccumulated > MAX_ACCUMULATED_SCORE) {
            h.totalScoreAccumulated = MAX_ACCUMULATED_SCORE;
        }

        h.lastScore = score;
        h.lastInfluence = influence;
        h.lastUpdate = timestamp;

        uint256 level = calculateLevel(h.totalScoreAccumulated);
        uint256 badge = calculateBadge(score, h.negativeEvents);

        status[user].level = level;
        status[user].badge = badge;

        emit Sync(user, score, influence, level, badge);
        emit ScoreAccumulated(user, h.totalScoreAccumulated);
    }

    // ====================== FRAUD ======================
    function getFraudDelay(address user) public view returns (uint256) {
        if (manualFraudDelay != 0) return manualFraudDelay;

        uint256 level = status[user].level;
        uint256 levelDelay = level >= 5 ? 6 hours : level >= 4 ? 3 hours : level >= 3 ? 1 hours : 5 minutes;

        uint256 valueDelay = 5 minutes;
        if (address(curve) != address(0)) {
            try curve.getPrice(user) returns (uint256 price) {
                valueDelay = price >= 1 ether ? 6 hours : price >= 0.1 ether ? 1 hours : 5 minutes;
            } catch {
                emit CurveReadFailed(user);
            }
        }

        return levelDelay > valueDelay ? levelDelay : valueDelay;
    }

    function requestFraudLock(
        address user,
        bool lock,
        string calldata reason,
        bytes calldata evidence
    ) external onlyAdmin {
        if (tokenOf[user] == 0) revert TokenNotExists();

        uint256 delay = getFraudDelay(user);
        uint256 executeAfter = block.timestamp + delay;

        pendingFraud[user] = FraudRequest({
            executeAfter: executeAfter,
            lock: lock,
            reason: reason,
            evidence: evidence
        });

        emit FraudLockRequested(user, lock, reason, evidence, executeAfter);
    }

    function executeFraudLock(address user) external onlyAdmin {
        FraudRequest memory req = pendingFraud[user];
        if (block.timestamp < req.executeAfter) revert FraudDelayNotMet();

        status[user].fraudLocked = req.lock;
        delete pendingFraud[user];

        emit FraudLockExecuted(user, req.lock);
    }

    // ====================== ADMIN ======================
    function setPaused(bool _paused) external onlyAdmin {
        paused = _paused;
        emit Paused(msg.sender, _paused);
    }

    function setManualFraudDelay(uint256 delay) external onlyAdmin {
        manualFraudDelay = delay;
    }

    function setCurve(address _curve) external onlyAdmin {
        require(_curve != address(0), "Zero address");
        curve = IBondingCurve(_curve);
    }

    function startAdminTransfer(address newAdmin) external onlyAdmin {
        require(newAdmin != address(0), "Zero address");
        pendingAdmin = newAdmin;
        emit AdminTransferStarted(admin, newAdmin);
    }

    function acceptAdmin() external {
        if (msg.sender != pendingAdmin) revert NotPendingAdmin();
        admin = pendingAdmin;
        pendingAdmin = address(0);
        emit AdminTransferred(admin);
    }

    // ====================== VIEW ======================
    function calculateLevel(uint256 total) public pure returns (uint256) {
        if (total > 1_000_000) return 5;
        if (total > 500_000) return 4;
        if (total > 100_000) return 3;
        if (total > 10_000) return 2;
        return 1;
    }

    function calculateBadge(uint256 score, uint256 neg) public pure returns (uint256) {
        if (neg > 50) return 0;
        if (score > 8000) return 3;
        if (score > 5000) return 2;
        return 1;
    }
}
