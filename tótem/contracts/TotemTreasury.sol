// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract TotemTreasury is Ownable2Step, ReentrancyGuard, Pausable {

    // ================= ROLES =================
    address public operator;

    // ================= RATE LIMIT POR ASSET =================
    struct RateLimit {
        uint256 maxPerPeriod;
        uint256 withdrawn;
        uint256 periodStart;
    }

    uint256 public withdrawPeriod;

    // token => rate limit (address(0) = ETH)
    mapping(address => RateLimit) public rateLimits;

    // ================= EVENTS =================
    event Received(address indexed from, uint256 amount);
    event ERC20Withdrawn(address indexed token, address indexed to, uint256 amount);
    event ETHWithdrawn(address indexed to, uint256 amount);
    event OperatorUpdated(address operator);
    event RateLimitUpdated(address indexed token, uint256 maxAmount);

    // ================= ERRORS =================
    error InsufficientBalance();
    error RateLimitExceeded();
    error ZeroAddress();
    error TransferFailed();
    error NotAuthorized();

    // ================= MODIFIERS =================
    modifier onlyAuthorized() {
        if (msg.sender != owner() && msg.sender != operator) revert NotAuthorized();
        _;
    }

    constructor(uint256 _withdrawPeriod) Ownable(msg.sender) {
        withdrawPeriod = _withdrawPeriod;
    }

    // ================= RECEIVE =================
    receive() external payable {
        emit Received(msg.sender, msg.value);
    }

    // ================= INTERNAL =================
    function _updateRateLimit(address token, uint256 amount) internal {
        RateLimit storage r = rateLimits[token];

        if (block.timestamp >= r.periodStart + withdrawPeriod) {
            r.withdrawn = 0;
            r.periodStart = block.timestamp;
        }

        if (r.withdrawn + amount > r.maxPerPeriod) {
            revert RateLimitExceeded();
        }

        r.withdrawn += amount;
    }

    // ================= WITHDRAW ETH =================
    function withdrawETH(address payable to, uint256 amount)
        external
        onlyAuthorized
        nonReentrant
        whenNotPaused
    {
        if (to == address(0)) revert ZeroAddress();
        if (address(this).balance < amount) revert InsufficientBalance();

        _updateRateLimit(address(0), amount);

        (bool ok,) = to.call{value: amount}("");
        if (!ok) revert TransferFailed();

        emit ETHWithdrawn(to, amount);
    }

    // ================= WITHDRAW ERC20 =================
    function withdrawERC20(address token, address to, uint256 amount)
        external
        onlyAuthorized
        nonReentrant
        whenNotPaused
    {
        if (to == address(0) || token == address(0)) revert ZeroAddress();

        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance < amount) revert InsufficientBalance();

        _updateRateLimit(token, amount);

        bool ok = IERC20(token).transfer(to, amount);
        if (!ok) revert TransferFailed();

        emit ERC20Withdrawn(token, to, amount);
    }

    // ================= ADMIN =================
    function setOperator(address _operator) external onlyOwner {
        if (_operator == address(0)) revert ZeroAddress();
        operator = _operator;
        emit OperatorUpdated(_operator);
    }

    function setRateLimit(address token, uint256 maxAmount) external onlyOwner {
        rateLimits[token].maxPerPeriod = maxAmount;
        emit RateLimitUpdated(token, maxAmount);
    }

    function setWithdrawPeriod(uint256 _period) external onlyOwner {
        withdrawPeriod = _period;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}
