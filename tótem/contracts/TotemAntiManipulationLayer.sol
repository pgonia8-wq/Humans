// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable2Step.sol";

contract TotemAntiManipulationLayer is Ownable2Step {

    // [COMPILE FIX] OZ v5 requiere initialOwner explícito.
    constructor() Ownable(msg.sender) {}

    mapping(address => uint256) public lastOracleUpdate;
    mapping(address => uint256) public emaPrice;

    uint256 public alpha = 20; // smoothing factor

    event OracleUpdated(address indexed user, uint256 value);

    function updateOracle(address user, uint256 newValue) external onlyOwner {

        require(block.timestamp > lastOracleUpdate[user] + 15 minutes, "too fast");

        uint256 prev = emaPrice[user];

        if (prev == 0) {
            emaPrice[user] = newValue;
        } else {
            emaPrice[user] = (prev * (100 - alpha) + newValue * alpha) / 100;
        }

        lastOracleUpdate[user] = block.timestamp;

        emit OracleUpdated(user, emaPrice[user]);
    }

    function getSafeValue(address user) external view returns (uint256) {
        return emaPrice[user];
    }
}
