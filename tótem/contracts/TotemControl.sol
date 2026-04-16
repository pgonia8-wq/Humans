// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable2Step.sol";

contract TotemControl is Ownable2Step {

    uint256 public fee = 0.01 ether;

    event FeeUpdated(uint256 newFee);

    function setFee(uint256 newFee) external onlyOwner {
        fee = newFee;
        emit FeeUpdated(newFee);
    }
}
