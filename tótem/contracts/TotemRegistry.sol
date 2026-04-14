// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract TotemRegistry {

    mapping(address => bool) public hasTotem;

    event TotemCreated(address indexed user);

    function createTotem() external {
        require(!hasTotem[msg.sender], "Totem exists");

        hasTotem[msg.sender] = true;

        emit TotemCreated(msg.sender);
    }

    function isTotem(address user) external view returns (bool) {
        return hasTotem[user];
    }
}
