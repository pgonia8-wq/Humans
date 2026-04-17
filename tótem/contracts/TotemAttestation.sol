// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract TotemAttestation is Ownable2Step, Pausable, ReentrancyGuard {

    // ========================= STATE =========================

    mapping(address => bool) private _humanVerified;

    struct PendingAction {
        bool value;
        uint64 executeAfter;
        bool exists;
    }

    mapping(address => PendingAction) public pending;

    uint256 public constant MIN_DELAY = 1 hours;
    uint256 public constant MAX_DELAY = 3 days;

    // ========================= EVENTS =========================

    event Verified(address indexed user);
    event Revoked(address indexed user);

    event VerificationRequested(
        address indexed user,
        bool value,
        uint256 executeAfter
    );

    event VerificationExecuted(
        address indexed user,
        bool value
    );

    event Paused(address indexed by, bool status);

    // ========================= ERRORS =========================

    error AlreadySet();
    error NotPending();
    error DelayNotMet();
    error ZeroAddress();

    // ========================= CONSTRUCTOR =========================

    constructor() Ownable(msg.sender) {}

    // ========================= CORE VIEW =========================

    function isHuman(address user) external view returns (bool) {
        return _humanVerified[user];
    }

    // ========================= IMMEDIATE ADMIN (SAFE MODE) =========================

    function verify(address user) external onlyOwner whenNotPaused {
        if (user == address(0)) revert ZeroAddress();

        _humanVerified[user] = true;

        // clear pending state
        delete pending[user];

        emit Verified(user);
    }

    function revoke(address user) external onlyOwner whenNotPaused {
        if (user == address(0)) revert ZeroAddress();

        _humanVerified[user] = false;

        // clear pending state
        delete pending[user];

        emit Revoked(user);
    }

    // ========================= SCHEDULED EXECUTION (FASE 4 PRO) =========================

    /**
     * @notice Permissionless execution AFTER delay (audit-friendly + decentralized execution)
     */
    function executeScheduled(address user)
        external
        whenNotPaused
        nonReentrant
    {
        PendingAction memory p = pending[user];

        if (!p.exists) revert NotPending();
        if (block.timestamp < p.executeAfter) revert DelayNotMet();

        _humanVerified[user] = p.value;

        delete pending[user];

        emit VerificationExecuted(user, p.value);
    }

    /**
     * @notice Schedule a verification change (admin only)
     * @dev Includes delay clamping for safety
     */
    function scheduleVerification(address user, bool value, uint256 delay)
        external
        onlyOwner
        whenNotPaused
    {
        if (user == address(0)) revert ZeroAddress();

        if (delay < MIN_DELAY) {
            delay = MIN_DELAY;
        } else if (delay > MAX_DELAY) {
            delay = MAX_DELAY;
        }

        pending[user] = PendingAction({
            value: value,
            executeAfter: uint64(block.timestamp + delay),
            exists: true
        });

        emit VerificationRequested(user, value, block.timestamp + delay);
    }

    // ========================= EMERGENCY CONTROLS =========================

    function pause(bool status) external onlyOwner {
        if (status) _pause();
        else _unpause();

        emit Paused(msg.sender, status);
    }
}
