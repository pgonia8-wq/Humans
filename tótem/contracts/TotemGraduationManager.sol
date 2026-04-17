// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";   // FIX ALTO-1: OZ v5 path
import "@openzeppelin/contracts/utils/Pausable.sol";          // FIX ALTO-1: OZ v5 path
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./HumanTotem.sol";

// ---------------- INTERFACES ----------------

interface ITotem {
    function status(address user) external view returns (
        bool fraudLocked,
        uint256 level,
        uint256 badge
    );
}

interface ICurve {
    function getSupply(address totem) external view returns (uint256);
    function getPrice(address totem) external view returns (uint256);
    function freeze(address totem) external;
}

interface IMetrics {
    function markets(address totem) external view returns (
        uint256 rawVolume,
        uint256 verifiedVolume,
        uint256 createdAt,
        uint256 lastTradeAt
    );
}

interface IUniswapV2Factory {
    function createPair(address tokenA, address tokenB) external returns (address pair);
}

interface IUniswapV2Router {
    function addLiquidity(
        address tokenA,
        address tokenB,
        uint amountA,
        uint amountB,
        uint minA,
        uint minB,
        address to,
        uint deadline
    ) external returns (uint, uint, uint);
}

// ---------------- CONTRACT ----------------

contract TotemGraduationManager is Ownable2Step, ReentrancyGuard, Pausable {

    ITotem public immutable totem;
    ICurve public immutable curve;
    IMetrics public immutable metrics;

    address public immutable wldToken;
    address public router;
    address public factory;

    uint256 public minLevel = 4;
    uint256 public minSupply = 10_000;
    uint256 public minVolume = 15_000 ether;
    uint256 public minAge = 45 days;

    uint256 public staleWindow = 1 days;
    uint256 public liquidityBps = 1000; // 10%

    mapping(address => bool) public graduated;
    mapping(address => address) public ammPair;
    mapping(address => address) public totemAsset;

    // ---------------- EVENTS ----------------

    event Graduated(address indexed totem, address pair);
    event ParamsUpdated();
    event RouterUpdated(address router);
    event FactoryUpdated(address factory);

    // ---------------- ERRORS ----------------

    error AlreadyGraduated();
    error NotEligible();
    error FraudLocked();
    error InvalidMarket();
    error PairExists();

    constructor(
        address _totem,
        address _curve,
        address _metrics,
        address _wld,
        address _router,
        address _factory
    ) Ownable(msg.sender) {
        require(_totem != address(0), "zero");
        require(_curve != address(0), "zero");
        require(_metrics != address(0), "zero");
        require(_wld != address(0), "zero");

        totem = ITotem(_totem);
        curve = ICurve(_curve);
        metrics = IMetrics(_metrics);

        wldToken = _wld;
        router = _router;
        factory = _factory;
    }

    // ---------------- INTERNAL LOGIC ----------------

    function _getVolume(address user) internal view returns (uint256) {
        (
            uint256 rawVolume,
            uint256 verifiedVolume,
            ,
            uint256 lastTradeAt
        ) = metrics.markets(user);

        if (verifiedVolume > 0) return verifiedVolume;

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

    // ---------------- AMM CREATION ----------------

    function _createAMM(address user, string memory name, string memory symbol) internal returns (address pair) {

        if (ammPair[user] != address(0)) revert PairExists();

        HumanTotem newTotem = new HumanTotem(
            name,
            symbol,
            user,
            address(totem)
        );
        address token = address(newTotem);
        totemAsset[user] = token;

        pair = IUniswapV2Factory(factory).createPair(token, wldToken);
        ammPair[user] = pair;

        uint256 supply = curve.getSupply(user);
        require(supply > 0, "no supply");

        uint256 price = curve.getPrice(user);

        uint256 amountToken = (supply * liquidityBps) / 10_000;
        uint256 amountWLD = (amountToken * price) / 1e18;

        newTotem.mint(address(this), amountToken);

        // FIX CRIT-1: A single transferFrom call — the duplicate was draining 2x WLD on every graduation.
        require(IERC20(wldToken).transferFrom(owner(), address(this), amountWLD), "wld transfer fail");

        IERC20(token).approve(router, amountToken);
        IERC20(wldToken).approve(router, amountWLD);

        IUniswapV2Router(router).addLiquidity(
            token,
            wldToken,
            amountToken,
            amountWLD,
            0,
            0,
            owner(),
            block.timestamp
        );
    }

    // ---------------- MAIN ----------------

    function graduate(address user, string calldata name, string calldata symbol)
        external
        nonReentrant
        whenNotPaused
    {
        if (graduated[user]) revert AlreadyGraduated();

        (bool fraudLocked,,) = totem.status(user);
        if (fraudLocked) revert FraudLocked();

        if (!canGraduate(user)) revert NotEligible();

        graduated[user] = true;

        curve.freeze(user);

        address pair = _createAMM(user, name, symbol);

        emit Graduated(user, pair);
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

    function setRouter(address _router) external onlyOwner {
        router = _router;
        emit RouterUpdated(_router);
    }

    function setFactory(address _factory) external onlyOwner {
        factory = _factory;
        emit FactoryUpdated(_factory);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}
