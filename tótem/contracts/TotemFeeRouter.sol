// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IUniswapV2Pair {
    function transfer(address to, uint value) external returns (bool);
    function balanceOf(address owner) external view returns (uint);
}

contract TotemFeeRouter is Ownable2Step, ReentrancyGuard {

    address public immutable lpToken; // LP token del AMM pair
    address public treasury;
    address public buybackVault;
    address public rewardPool;

    uint256 public lastCheckpoint;

    event FeesHarvested(uint256 amount);
    event Distributed(uint256 treasury, uint256 buyback, uint256 rewards);

    constructor(
        address _lpToken,
        address _treasury,
        address _buybackVault,
        address _rewardPool
    ) {
        require(_lpToken != address(0), "zero");

        lpToken = _lpToken;
        treasury = _treasury;
        buybackVault = _buybackVault;
        rewardPool = _rewardPool;
    }

    // ---------------- CORE ----------------

    function harvest() external nonReentrant {

        uint256 balance = IERC20(lpToken).balanceOf(address(this));

        require(balance > 0, "no fees");

        // simple split model
        uint256 treasuryShare = (balance * 40) / 100;
        uint256 buybackShare = (balance * 40) / 100;
        uint256 rewardShare = balance - treasuryShare - buybackShare;

        require(IERC20(lpToken).transfer(treasury, treasuryShare), "treasury fail");
        require(IERC20(lpToken).transfer(buybackVault, buybackShare), "buyback fail");
        require(IERC20(lpToken).transfer(rewardPool, rewardShare), "reward fail");

        lastCheckpoint = block.timestamp;

        emit FeesHarvested(balance);
        emit Distributed(treasuryShare, buybackShare, rewardShare);
    }

    // ---------------- ADMIN ----------------

    function setTreasury(address _t) external onlyOwner {
        treasury = _t;
    }

    function setBuybackVault(address _b) external onlyOwner {
        buybackVault = _b;
    }

    function setRewardPool(address _r) external onlyOwner {
        rewardPool = _r;
    }
}
