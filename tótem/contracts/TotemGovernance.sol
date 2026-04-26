// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract TotemGovernance is Ownable2Step, ReentrancyGuard {

    // [COMPILE FIX] OZ v5 requiere initialOwner explícito; constructor estaba implícito.
    constructor() Ownable(msg.sender) {}

    // ========================= STRUCT =========================
    struct Proposal {
        uint256 id;
        address target;
        uint256 value;
        bytes data;
        bool executed;
        uint256 createdAt;
        uint256 executeAfter;
        uint256 expiresAt;
    }

    // ========================= STORAGE =========================
    mapping(uint256 => Proposal) public proposals;
    uint256 public proposalCount;

    // ========================= CONFIG =========================
    uint256 public minDelay = 1 hours;
    uint256 public maxDelay = 3 days;
    uint256 public proposalTTL = 3 days;

    uint256 public emergencyThreshold = 75;
    bool public emergencyMode;

    // ========================= EVENTS =========================
    event ProposalCreated(
        uint256 indexed id,
        address indexed target,
        uint256 value,
        uint256 executeAfter,
        uint256 expiresAt
    );

    event ProposalExecuted(uint256 indexed id);
    event ProposalCancelled(uint256 indexed id);

    event EmergencyActivated(uint256 stressIndex);
    event EmergencyDeactivated();

    event ConfigUpdated(
        uint256 minDelay,
        uint256 maxDelay,
        uint256 ttl
    );

    // ========================= ERRORS =========================
    error InvalidTarget();
    error InvalidDelay();
    error TooEarly();
    error Expired();
    error AlreadyExecuted();
    error ExecutionFailed();
    error EmergencyActive();
    error NotEmergency();

    // ========================= CREATE =========================
    function createProposal(
        address target,
        uint256 value,
        bytes calldata data,
        uint256 delay
    ) external onlyOwner {

        if (target == address(0)) revert InvalidTarget();
        if (delay < minDelay || delay > maxDelay) revert InvalidDelay();

        proposalCount++;

        uint256 executeAfter = block.timestamp + delay;
        uint256 expiresAt = executeAfter + proposalTTL;

        proposals[proposalCount] = Proposal({
            id: proposalCount,
            target: target,
            value: value,
            data: data,
            executed: false,
            createdAt: block.timestamp,
            executeAfter: executeAfter,
            expiresAt: expiresAt
        });

        emit ProposalCreated(
            proposalCount,
            target,
            value,
            executeAfter,
            expiresAt
        );
    }

    // ========================= EXECUTE =========================
    function executeProposal(uint256 id)
        external
        nonReentrant
    {
        Proposal storage p = proposals[id];

        if (p.executed) revert AlreadyExecuted();
        if (block.timestamp < p.executeAfter) revert TooEarly();
        if (block.timestamp > p.expiresAt) revert Expired();

        // 🔥 En emergencia SOLO puedes ejecutar acciones críticas
        if (emergencyMode) {
            revert EmergencyActive();
        }

        p.executed = true;

        (bool success,) = p.target.call{value: p.value}(p.data);
        if (!success) revert ExecutionFailed();

        emit ProposalExecuted(id);
    }

    // ========================= CANCEL =========================
    function cancelProposal(uint256 id) external onlyOwner {
        Proposal storage p = proposals[id];

        if (p.executed) revert AlreadyExecuted();

        delete proposals[id];

        emit ProposalCancelled(id);
    }

    // ========================= EMERGENCY =========================
    function activateEmergency(uint256 stressIndex) external onlyOwner {
        if (stressIndex > emergencyThreshold) {
            emergencyMode = true;
            emit EmergencyActivated(stressIndex);
        }
    }

    function deactivateEmergency() external onlyOwner {
        if (!emergencyMode) revert NotEmergency();

        emergencyMode = false;
        emit EmergencyDeactivated();
    }

    // ========================= CONFIG =========================
    function setConfig(
        uint256 _minDelay,
        uint256 _maxDelay,
        uint256 _ttl
    ) external onlyOwner {

        if (_minDelay == 0 || _maxDelay < _minDelay) revert InvalidDelay();

        minDelay = _minDelay;
        maxDelay = _maxDelay;
        proposalTTL = _ttl;

        emit ConfigUpdated(_minDelay, _maxDelay, _ttl);
    }

    // ========================= VIEW =========================
    function getProposal(uint256 id) external view returns (
        address target,
        uint256 value,
        bool executed,
        uint256 executeAfter,
        uint256 expiresAt
    ) {
        Proposal memory p = proposals[id];

        return (
            p.target,
            p.value,
            p.executed,
            p.executeAfter,
            p.expiresAt
        );
    }

    // ========================= RECEIVE =========================
    receive() external payable {}
}
