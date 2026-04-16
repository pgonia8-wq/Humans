// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IOracle {
    function getMetrics(address user) external view returns (
        uint256 score,
        uint256 influence,
        uint256 timestamp
    );
}

interface IRegistry {
    function isTotem(address user) external view returns (bool);
}

contract TotemReader {

    IOracle public oracle;
    IRegistry public registry;

    constructor(address _oracle, address _registry) {
        oracle = IOracle(_oracle);
        registry = IRegistry(_registry);
    }

    function getScore(address user) external view returns (uint256) {
        (uint256 score,,) = oracle.getMetrics(user);
        return score;
    }

    function getInfluence(address user) external view returns (uint256) {
        (,uint256 influence,) = oracle.getMetrics(user);
        return influence;
    }

    function isVerified(address user) external view returns (bool) {
        return registry.isTotem(user);
    }

    function getFullProfile(address user)
        external
        view
        returns (uint256 score, uint256 influence, bool verified)
    {
        (score, influence,) = oracle.getMetrics(user);
        verified = registry.isTotem(user);
    }
}
