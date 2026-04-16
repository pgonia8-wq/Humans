// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

interface ITotem {
    function status(address user) external view returns (
        bool fraudLocked,
        uint256 level,
        uint256 badge
    );
}

interface ICurve {
    function getSupply(address totem) external view returns (uint256);
}

interface IMetrics {
    function markets(address totem) external view returns (
        uint256 rawVolume,
        uint256 verifiedVolume,
        uint256 createdAt,
        uint256 lastTradeAt
    );
}

contract TotemGraduationManager is Ownable2Step, ReentrancyGuard, Pausable {

    ITotem public immutable totem;
    ICurve public immutable curve;
    IMetrics public immutable metrics;

    // ---------------- PARAMETERS ----------------

    uint256 public minLevel = 4;
    uint256 public minSupply = 10_000;
    uint256 public minVolume = 15_000 ether;
    uint256 public minAge = 45 days;

    uint256 public staleWindow = 1 days; // fallback safety

    mapping(address => bool) public graduated;

    // ---------------- EVENTS ----------------

    event Graduated(address indexed totem, uint256 timestamp);
    event ParamsUpdated();
    event StaleWindowUpdated(uint256 window);

    // ---------------- ERRORS ----------------

    error AlreadyGraduated();
    error NotEligible();
    error FraudLocked();
    error InvalidMarket();

    constructor(
        address _totem,
        address _curve,
        address _metrics
    ) {
        require(_totem != address(0), "zero");
        require(_curve != address(0), "zero");
        require(_metrics != address(0), "zero");

        totem = ITotem(_totem);
        curve = ICurve(_curve);
        metrics = IMetrics(_metrics);
    }

    // ---------------- CORE LOGIC ----------------

    function _getVolume(address user) internal view returns (uint256) {
        (
            uint256 rawVolume,
            uint256 verifiedVolume,
            ,
            uint256 lastTradeAt
        ) = metrics.markets(user);

        // 🔐 prefer verified
        if (verifiedVolume > 0) {
            return verifiedVolume;
        }

        // ⚠️ fallback only if fresh
        if (block.timestamp - lastTradeAt <= staleWindow) {
            return rawVolume;
        }

        return 0;
    }

    function canGraduate(address user) public view returns (bool) {

        if (graduated[user]) return false;

        (bool fraudLocked, uint256 level,) = totem.status(user);
        if (fraudLocked) return false;

        uint256 supply = curve.getSupply(user);

        (
            ,
            ,
            uint256 createdAt,
            
        ) = metrics.markets(user);

        if (createdAt == 0) return false;

        uint256 volume = _getVolume(user);

        if (level < minLevel) return false;
        if (supply < minSupply) return false;
        if (volume < minVolume) return false;
        if (block.timestamp < createdAt + minAge) return false;

        return true;
    }

    function graduate(address user)
        external
        nonReentrant
        whenNotPaused
    {
        if (graduated[user]) revert AlreadyGraduated();

        (bool fraudLocked,,) = totem.status(user);
        if (fraudLocked) revert FraudLocked();

        if (!canGraduate(user)) revert NotEligible();

        graduated[user] = true;

        emit Graduated(user, block.timestamp);

        // =============================
        // 🔥 HOOK PARA AMM
        // =============================
        // Aquí conectas:
        // - freeze curve (si quieres)
        // - crear pool (Uniswap / WorldChain)
        // - seed liquidity
        //
        // Ejemplo futuro:
        // amm.createPool(user, price, liquidity);
    }

    // ---------------- ADMIN ----------------

    function setParams(
        uint256 _level,
        uint256 _supply,
        uint256 _volume,
        uint256 _age
    ) external onlyOwner {
        minLevel = _level;
        minSupply = _supply;
        minVolume = _volume;
        minAge = _age;

        emit ParamsUpdated();
    }

    function setStaleWindow(uint256 _window) external onlyOwner {
        staleWindow = _window;
        emit StaleWindowUpdated(_window);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}
