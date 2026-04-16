// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable2Step.sol";

contract TotemAttestation is Ownable2Step {

    mapping(address => bool) public humanVerified;

    event Verified(address indexed user);
    event Revoked(address indexed user);

    function verify(address user) external onlyOwner {
        humanVerified[user] = true;
        emit Verified(user);
    }

    function revoke(address user) external onlyOwner {
        humanVerified[user] = false;
        emit Revoked(user);
    }

    function isHuman(address user) external view returns (bool) {
        return humanVerified[user];
    }
}
