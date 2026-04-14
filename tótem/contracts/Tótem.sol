// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

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

/**
 * @title Totem
 * @notice Soulbound NFT identity (1 humano = 1 tótem)
 * @dev FINAL PRODUCTION: reputación económica viva, anti-gaming, decay, cap, integración limpia
 */
contract Totem {

    string public constant name = "Human Totem";
    string public constant symbol = "TOTEM";

    uint256 public totalSupply;

    IRegistry public immutable registry;
    IOracle public immutable oracle;

    address public admin;
    address public pendingAdmin;
    bool public paused;

    uint256 public constant MIN_SYNC_INTERVAL = 1 hours;
    uint256 public constant MAX_ACCUMULATED_SCORE = 10_000_000;
    uint256 public constant MAX_FUTURE_DRIFT = 5 minutes;

    struct History {
        uint256 totalScoreAccumulated;
        uint256 lastScore;
        uint256 lastInfluence;
        uint256 lastUpdate;
        uint256 negativeEvents;
    }

    struct Status {
        bool fraudLocked;
        uint256 level;
        uint256 badge;
    }

    mapping(uint256 => address) public ownerOf;
    mapping(address => uint256) public tokenOf;

    mapping(address => History) public history;
    mapping(address => Status) public status;

    event Mint(address indexed user, uint256 tokenId);
    event HistoryInitialized(address indexed user, uint256 score, uint256 influence);
    event Sync(address indexed user, uint256 score, uint256 influence, uint256 level, uint256 badge);
    event NegativeEvent(address indexed user, uint256 totalNegativeEvents);
    event FraudLock(address indexed user, bool locked);
    event LevelUpdated(address indexed user, uint256 level);
    event BadgeUpdated(address indexed user, uint256 badge);
    event Paused(address indexed admin, bool status);
    event AdminTransferStarted(address indexed current, address indexed pending);
    event AdminTransferred(address indexed newAdmin);

    error NotAdmin();
    error NoPendingAdmin();
    error NotRegistered();
    error AlreadyMinted();
    error Soulbound();
    error TokenNotExists();
    error InvalidTimestamp();
    error SyncTooFrequent();
    error FraudLocked();
    error PausedError();
    error ZeroAddress();

    modifier onlyAdmin() {
        if (msg.sender != admin) revert NotAdmin();
        _;
    }

    modifier notPaused() {
        if (paused) revert PausedError();
        _;
    }

    constructor(address _registry, address _oracle) {
        if (_registry == address(0) || _oracle == address(0)) revert ZeroAddress();

        registry = IRegistry(_registry);
        oracle = IOracle(_oracle);

        admin = msg.sender;
        paused = false;
    }

    function mint() external notPaused {
        if (!registry.isTotem(msg.sender)) revert NotRegistered();
        if (tokenOf[msg.sender] != 0) revert AlreadyMinted();
        if (status[msg.sender].fraudLocked) revert FraudLocked();

        unchecked { totalSupply++; }
        uint256 tokenId = totalSupply;

        ownerOf[tokenId] = msg.sender;
        tokenOf[msg.sender] = tokenId;

        (uint256 score, uint256 influence, ) = oracle.getMetrics(msg.sender);

        history[msg.sender] = History({
            totalScoreAccumulated: 0,
            lastScore: score,
            lastInfluence: influence,
            lastUpdate: block.timestamp,
            negativeEvents: 0
        });

        emit Mint(msg.sender, tokenId);
        emit HistoryInitialized(msg.sender, score, influence);
    }

    // Soulbound real
    function transferFrom(address, address, uint256) external pure { revert Soulbound(); }
    function safeTransferFrom(address, address, uint256) external pure { revert Soulbound(); }
    function safeTransferFrom(address, address, uint256, bytes calldata) external pure { revert Soulbound(); }
    function approve(address, uint256) external pure { revert Soulbound(); }
    function setApprovalForAll(address, bool) external pure { revert Soulbound(); }

    function sync(address user) external onlyAdmin notPaused {
        if (tokenOf[user] == 0) revert TokenNotExists();
        if (!registry.isTotem(user)) revert NotRegistered();
        if (status[user].fraudLocked) revert FraudLocked();

        History storage h = history[user];

        if (block.timestamp < h.lastUpdate + MIN_SYNC_INTERVAL) {
            revert SyncTooFrequent();
        }

        (uint256 score, uint256 influence, uint256 timestamp) = oracle.getMetrics(user);

        if (timestamp <= h.lastUpdate || timestamp > block.timestamp + MAX_FUTURE_DRIFT) {
            revert InvalidTimestamp();
        }

        // Decay suave (reputación viva)
        uint256 decay = h.totalScoreAccumulated / 100;
        if (h.totalScoreAccumulated > decay) {
            h.totalScoreAccumulated -= decay;
        }

        uint256 delta = 0;

        if (score > h.lastScore) {
            delta = score - h.lastScore;
        } else if (h.lastUpdate > 0) {
            h.negativeEvents++;
            emit NegativeEvent(user, h.negativeEvents);

            uint256 penalty = (h.lastScore - score) / 3;
            uint256 maxPenalty = h.totalScoreAccumulated / 2;
            if (penalty > maxPenalty) penalty = maxPenalty;

            if (h.totalScoreAccumulated > penalty) {
                h.totalScoreAccumulated -= penalty;
            } else {
                h.totalScoreAccumulated = 0;
            }
        }

        unchecked {
            h.totalScoreAccumulated += delta;
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
        emit LevelUpdated(user, level);
        emit BadgeUpdated(user, badge);
    }

    function setFraudLock(address user, bool locked) external onlyAdmin notPaused {
        if (tokenOf[user] == 0) revert TokenNotExists();
        if (!registry.isTotem(user)) revert NotRegistered();

        status[user].fraudLocked = locked;
        emit FraudLock(user, locked);
    }

    function isLocked(address user) external view returns (bool) {
        return status[user].fraudLocked;
    }

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

    function tokenURI(uint256 tokenId) external view returns (string memory) {
        address user = ownerOf[tokenId];
        if (user == address(0)) revert TokenNotExists();

        History memory h = history[user];
        Status memory s = status[user];

        return string(abi.encodePacked(
            '{"name":"Human Totem #', uint2str(tokenId), '",',
            '"description":"1 Human = 1 Totem - On-chain economic identity",',
            '"attributes":[',
                '{"trait_type":"Score","value":', uint2str(h.lastScore), '},',
                '{"trait_type":"Influence","value":', uint2str(h.lastInfluence), '},',
                '{"trait_type":"Accumulated Score","value":', uint2str(h.totalScoreAccumulated), '},',
                '{"trait_type":"Level","value":', uint2str(s.level), '},',
                '{"trait_type":"Badge","value":', uint2str(s.badge), '},',
                '{"trait_type":"Negative Events","value":', uint2str(h.negativeEvents), '},',
                '{"trait_type":"Fraud Locked","value":', s.fraudLocked ? "true" : "false", '}',
            ']}'
        ));
    }

    function setPaused(bool _paused) external onlyAdmin {
        paused = _paused;
        emit Paused(msg.sender, _paused);
    }

    function startAdminTransfer(address newAdmin) external onlyAdmin {
        if (newAdmin == address(0)) revert ZeroAddress();
        pendingAdmin = newAdmin;
        emit AdminTransferStarted(admin, newAdmin);
    }

    function acceptAdmin() external {
        if (msg.sender != pendingAdmin) revert NoPendingAdmin();
        admin = pendingAdmin;
        pendingAdmin = address(0);
        emit AdminTransferred(admin);
    }

    function uint2str(uint256 _i) internal pure returns (string memory) {
        if (_i == 0) return "0";
        uint256 j = _i;
        uint256 len = 0;
        while (j != 0) { len++; j /= 10; }
        bytes memory b = new bytes(len);
        uint256 k = len;
        while (_i != 0) {
            b[--k] = bytes1(uint8(48 + _i % 10));
            _i /= 10;
        }
        return string(b);
    }
}
