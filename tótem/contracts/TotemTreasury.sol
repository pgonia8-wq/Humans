// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// FIX ALTO-6: Added Ownable2Step (safe ownership transfer), ReentrancyGuard,
// events for full auditability, and a per-period withdrawal rate limit.
import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract TotemTreasury is Ownable2Step, ReentrancyGuard {

    // Rate limit: maximum ETH that can be withdrawn in a single period
    uint256 public maxWithdrawPerPeriod;
    uint256 public withdrawPeriod;
    uint256 public withdrawnInPeriod;
    uint256 public periodStart;

    event Received(address indexed from, uint256 amount);
    event Withdrawn(address indexed to, uint256 amount);
    event RateLimitUpdated(uint256 maxAmount, uint256 period);

    error InsufficientBalance();
    error RateLimitExceeded();
    error ZeroAddress();
    error TransferFailed();

    constructor(uint256 _maxWithdrawPerPeriod, uint256 _withdrawPeriod) Ownable(msg.sender) {
        maxWithdrawPerPeriod = _maxWithdrawPerPeriod;
        withdrawPeriod = _withdrawPeriod;
        periodStart = block.timestamp;
    }

    receive() external payable {
        emit Received(msg.sender, msg.value);
    }

    function withdraw(address payable to, uint256 amount) external onlyOwner nonReentrant {
        if (to == address(0)) revert ZeroAddress();
        if (address(this).balance < amount) revert InsufficientBalance();

        // Reset period if enough time has passed
        if (block.timestamp >= periodStart + withdrawPeriod) {
            withdrawnInPeriod = 0;
            periodStart = block.timestamp;
        }

        if (withdrawnInPeriod + amount > maxWithdrawPerPeriod) revert RateLimitExceeded();

        withdrawnInPeriod += amount;

        (bool ok,) = to.call{value: amount}("");
        if (!ok) revert TransferFailed();

        emit Withdrawn(to, amount);
    }

    function setRateLimit(uint256 _maxAmount, uint256 _period) external onlyOwner {
        maxWithdrawPerPeriod = _maxAmount;
        withdrawPeriod = _period;
        emit RateLimitUpdated(_maxAmount, _period);
    }
}
