// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable2Step.sol";

contract TotemControl is Ownable2Step {

    // [COMPILE FIX] OZ v5 requiere initialOwner explícito.
    constructor() Ownable(msg.sender) {}

    // ========================= CONFIG =========================
    uint256 public fee = 0.01 ether;

    uint256 public constant MIN_FEE = 0.001 ether;
    uint256 public constant MAX_FEE = 0.1 ether;

    uint256 public constant MAX_CHANGE_BPS = 2000; // 20%
    uint256 public constant BPS_DENOMINATOR = 10_000;

    uint256 public delay = 1 hours;
    uint256 public cooldown = 30 minutes;

    bool public frozen;

    // ========================= STATE =========================
    struct PendingFee {
        uint256 newFee;
        uint256 executeAfter;
    }

    PendingFee public pending;

    uint256 public lastChangeTimestamp;
    uint256 public lastRequestTimestamp;

    // ========================= EVENTS =========================
    event FeeChangeRequested(uint256 newFee, uint256 executeAfter);
    event FeeUpdated(uint256 newFee);
    event PendingCancelled();
    event Frozen(bool status);

    // ========================= ERRORS =========================
    error InvalidFee();
    error ChangeTooLarge();
    error DelayNotMet();
    error CooldownActive();
    error FrozenState();
    error NoPending();
    error PendingExists();

    // ========================= MODIFIERS =========================
    modifier notFrozen() {
        if (frozen) revert FrozenState();
        _;
    }

    // ========================= REQUEST =========================
    function requestFeeChange(uint256 newFee) external onlyOwner notFrozen {
        if (newFee < MIN_FEE || newFee > MAX_FEE) revert InvalidFee();

        // 🚫 evitar overwrite silencioso
        if (pending.executeAfter != 0) revert PendingExists();

        // 🔒 cooldown también en request
        if (block.timestamp < lastRequestTimestamp + cooldown) {
            revert CooldownActive();
        }

        // 🔒 límite de cambio %
        uint256 diff = newFee > fee ? newFee - fee : fee - newFee;
        if ((diff * BPS_DENOMINATOR) / fee > MAX_CHANGE_BPS) {
            revert ChangeTooLarge();
        }

        uint256 executeAfter = block.timestamp + delay;

        pending = PendingFee({
            newFee: newFee,
            executeAfter: executeAfter
        });

        lastRequestTimestamp = block.timestamp;

        emit FeeChangeRequested(newFee, executeAfter);
    }

    // ========================= EXECUTE =========================
    function executeFeeChange() external onlyOwner notFrozen {
        if (pending.executeAfter == 0) revert NoPending();
        if (block.timestamp < pending.executeAfter) revert DelayNotMet();

        fee = pending.newFee;

        delete pending;

        lastChangeTimestamp = block.timestamp;

        emit FeeUpdated(fee);
    }

    // ========================= CANCEL =========================
    function cancelPending() external onlyOwner {
        if (pending.executeAfter == 0) revert NoPending();

        delete pending;

        emit PendingCancelled();
    }

    // ========================= EMERGENCY =========================
    function emergencySetFee(uint256 newFee) external onlyOwner {
        if (frozen) revert FrozenState();
        if (newFee < MIN_FEE || newFee > MAX_FEE) revert InvalidFee();

        uint256 diff = newFee > fee ? newFee - fee : fee - newFee;
        if ((diff * BPS_DENOMINATOR) / fee > MAX_CHANGE_BPS) {
            revert ChangeTooLarge();
        }

        fee = newFee;

        delete pending;

        lastChangeTimestamp = block.timestamp;

        emit FeeUpdated(newFee);
    }

    // ========================= FREEZE =========================
    function setFrozen(bool _frozen) external onlyOwner {
        frozen = _frozen;
        emit Frozen(_frozen);
    }

    // ========================= VIEW =========================
    function getPending()
        external
        view
        returns (uint256 newFee, uint256 executeAfter)
    {
        PendingFee memory p = pending;
        return (p.newFee, p.executeAfter);
    }
}
