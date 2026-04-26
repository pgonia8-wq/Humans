// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IWorldIDVerifier {
    function verifyProof(
        uint256 root,
        uint256 groupId,
        uint256 signalHash,
        uint256 nullifierHash,
        uint256 externalNullifierHash,
        uint256[8] calldata proof
    ) external view;
}

interface ITotem {
    function migrateToken(address oldUser, address newUser) external;
}

/**
 * @title TotemRegistry
 * @dev FIX ALTO-5: Old nullifiers after migration are moved to a dedicated
 *      `migratedNullifiers` mapping instead of being set back to false.
 *      This prevents a compromised or re-used nullifier from registering a
 *      second identity after a migration completes.
 */
contract TotemRegistry {

    address public immutable WORLD_ID_VERIFIER;
    address public immutable TOTEM;

    uint256 public constant GROUP_ID = 1;
    bytes32 public immutable EXTERNAL_NULLIFIER;

    address public admin;
    address public pendingAdmin;
    bool public paused;

    mapping(address => bool) public hasTotem;
    mapping(address => bool) public isBlocked;

    mapping(uint256 => bool) public usedNullifiers;
    mapping(uint256 => address) public nullifierToAddress;
    mapping(address => uint256) public totemNullifier;

    // FIX ALTO-5: Permanently marks nullifiers that have been migrated away.
    // These can never be reused for a new identity, even after migration.
    mapping(uint256 => bool) public migratedNullifiers;

    uint256 public totalTotems;

    struct MigrationRequest {
        address oldUser;
        uint256 oldNullifierHash;
        uint256 newNullifierHash;
        uint256 requestedAt;
        uint256 root;
        bool approved;
    }

    mapping(address => MigrationRequest) public migrationRequests;

    uint256 public constant MIGRATION_DELAY = 24 hours;

    // ========================= EVENTS =========================
    event TotemCreated(
        address indexed user,
        uint256 indexed nullifierHash,
        uint256 root,
        uint256 signalHash,
        uint256 totalTotems,
        uint256 timestamp
    );

    event MigrationRequested(
        address indexed oldUser,
        address indexed newUser,
        uint256 oldNullifier,
        uint256 newNullifier,
        uint256 executeAfter
    );

    event MigrationApproved(address indexed oldUser, address indexed newUser);
    event MigrationExecuted(address indexed oldUser, address indexed newUser, uint256 newNullifier);

    event TotemBlocked(address indexed user, string reason);
    event TotemUnblocked(address indexed user);

    event Paused(bool status);
    event AdminTransferStarted(address indexed current, address indexed pending);
    event AdminTransferred(address indexed newAdmin);

    // ========================= ERRORS =========================
    error NotAdmin();
    error PausedError();
    error TotemAlreadyExists();
    error NullifierAlreadyUsed();
    error InvalidNullifier();
    error NotRegistered();
    error AlreadyBlocked();
    error NotBlocked();
    error NoPendingAdmin();
    error ZeroAddress();
    error MigrationNotRequested();
    error MigrationDelayNotMet();
    error MigrationNotApproved();
    error InvalidMigration();
    error BlockedUserCannotMigrate();
    error BlockedUserCannotReceive(); // [ALTO-4 FIX] destino bloqueado durante el delay
    // FIX ALTO-5: Explicit error for re-use of a migrated nullifier
    error NullifierWasMigrated();

    modifier onlyAdmin() {
        if (msg.sender != admin) revert NotAdmin();
        _;
    }

    modifier notPaused() {
        if (paused) revert PausedError();
        _;
    }

    constructor(address _worldIdVerifier, address _totem) {
        if (_worldIdVerifier == address(0) || _totem == address(0)) revert ZeroAddress();

        WORLD_ID_VERIFIER = _worldIdVerifier;
        TOTEM = _totem;
        admin = msg.sender;
        paused = false;

        EXTERNAL_NULLIFIER = keccak256("create-totem");
    }

    // ========================= CREATE =========================
    function createTotem(
        uint256 root,
        uint256 nullifierHash,
        uint256[8] calldata proof
    ) external notPaused {
        if (isBlocked[msg.sender]) revert AlreadyBlocked();
        if (hasTotem[msg.sender]) revert TotemAlreadyExists();
        if (nullifierHash == 0) revert InvalidNullifier();
        if (usedNullifiers[nullifierHash]) revert NullifierAlreadyUsed();
        // FIX ALTO-5: Also block migrated nullifiers from being re-registered
        if (migratedNullifiers[nullifierHash]) revert NullifierWasMigrated();

        uint256 signalHash = uint256(keccak256(abi.encodePacked(msg.sender)));

        IWorldIDVerifier(WORLD_ID_VERIFIER).verifyProof(
            root,
            GROUP_ID,
            signalHash,
            nullifierHash,
            uint256(EXTERNAL_NULLIFIER), // [COMPILE FIX] cast bytes32→uint256 explícito
            proof
        );

        hasTotem[msg.sender] = true;
        usedNullifiers[nullifierHash] = true;
        nullifierToAddress[nullifierHash] = msg.sender;
        totemNullifier[msg.sender] = nullifierHash;

        unchecked { totalTotems++; }

        emit TotemCreated(
            msg.sender,
            nullifierHash,
            root,
            signalHash,
            totalTotems,
            block.timestamp
        );
    }

    // ========================= MIGRACIÓN SEGURA =========================
    function requestMigration(
        address oldUser,
        uint256 newNullifierHash,
        uint256 root,
        uint256[8] calldata proof
    ) external notPaused {
        if (!hasTotem[oldUser]) revert NotRegistered();
        if (hasTotem[msg.sender]) revert TotemAlreadyExists();
        if (usedNullifiers[newNullifierHash]) revert NullifierAlreadyUsed();
        // FIX ALTO-5: New nullifier must not be a previously migrated one either
        if (migratedNullifiers[newNullifierHash]) revert NullifierWasMigrated();
        if (oldUser == msg.sender) revert InvalidMigration();
        if (isBlocked[oldUser]) revert BlockedUserCannotMigrate();

        uint256 oldNullifierHash = totemNullifier[oldUser];

        uint256 signalHash = uint256(keccak256(abi.encodePacked(msg.sender)));

        IWorldIDVerifier(WORLD_ID_VERIFIER).verifyProof(
            root,
            GROUP_ID,
            signalHash,
            newNullifierHash,
            uint256(EXTERNAL_NULLIFIER), // [COMPILE FIX] cast bytes32→uint256 explícito
            proof
        );

        migrationRequests[msg.sender] = MigrationRequest({
            oldUser: oldUser,
            oldNullifierHash: oldNullifierHash,
            newNullifierHash: newNullifierHash,
            requestedAt: block.timestamp,
            root: root,
            approved: false
        });

        emit MigrationRequested(
            oldUser,
            msg.sender,
            oldNullifierHash,
            newNullifierHash,
            block.timestamp + MIGRATION_DELAY
        );
    }

    function approveMigration(address newUser) external onlyAdmin {
        MigrationRequest storage req = migrationRequests[newUser];
        if (req.requestedAt == 0) revert MigrationNotRequested();
        if (req.approved) revert InvalidMigration();

        req.approved = true;
        emit MigrationApproved(req.oldUser, newUser);
    }

    function executeMigration(address newUser) external notPaused {
        // [ALTO-4 FIX] storage en lugar de memory — evita copia innecesaria del struct
        MigrationRequest storage req = migrationRequests[newUser];
        if (req.requestedAt == 0) revert MigrationNotRequested();
        if (!req.approved) revert MigrationNotApproved();
        if (block.timestamp < req.requestedAt + MIGRATION_DELAY) revert MigrationDelayNotMet();
        // [ALTO-4 FIX] simétrico al check de oldUser en requestMigration:
        // si admin bloqueó al newUser durante el delay de 24h, abortar.
        if (isBlocked[newUser]) revert BlockedUserCannotReceive();

        address oldUser = req.oldUser;

        ITotem(TOTEM).migrateToken(oldUser, newUser);

        hasTotem[oldUser] = false;
        hasTotem[newUser] = true;

        // FIX ALTO-5: Mark old nullifier as permanently migrated — never reusable.
        // Do NOT set usedNullifiers[oldNullifier] = false. That would allow Sybil re-registration.
        usedNullifiers[req.oldNullifierHash] = true;          // keep it "used"
        migratedNullifiers[req.oldNullifierHash] = true;       // mark as migrated (permanent)
        nullifierToAddress[req.oldNullifierHash] = address(0); // unlink from old address only

        usedNullifiers[req.newNullifierHash] = true;
        nullifierToAddress[req.newNullifierHash] = newUser;

        totemNullifier[oldUser] = 0;
        totemNullifier[newUser] = req.newNullifierHash;

        delete migrationRequests[newUser];

        emit MigrationExecuted(oldUser, newUser, req.newNullifierHash);
    }

    // ========================= FRAUD CONTROL =========================
    function blockTotem(address user, string calldata reason) external onlyAdmin {
        if (!hasTotem[user]) revert NotRegistered();
        if (isBlocked[user]) revert AlreadyBlocked();

        isBlocked[user] = true;
        emit TotemBlocked(user, reason);
    }

    function unblockTotem(address user) external onlyAdmin {
        if (!isBlocked[user]) revert NotBlocked();

        isBlocked[user] = false;
        emit TotemUnblocked(user);
    }

    // ========================= ADMIN =========================
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

    function setPaused(bool _paused) external onlyAdmin {
        paused = _paused;
        emit Paused(_paused);
    }

    // ========================= VIEWS =========================
    function isTotem(address user) external view returns (bool) {
        return hasTotem[user] && !isBlocked[user];
    }

    function getNullifier(address user) external view returns (uint256) {
        return totemNullifier[user];
    }
}
