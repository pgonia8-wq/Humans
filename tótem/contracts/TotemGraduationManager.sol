// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./HumanTotem.sol";

// ---------------- INTERFACES ----------------

interface ITotem {
    function status(address user) external view returns (bool fraudLocked, uint256 level, uint256 badge);
    function oracle() external view returns (address);   // Necesario para el despliegue
    function registry() external view returns (address); // Necesario para el despliegue
}

interface ICurve {
    function realSupply(address totem) external view returns (uint256); [span_3](start_span)// FIX: Nombre correcto del getter[span_3](end_span)
    function getPrice(address totem) external view returns (uint256);
    function freeze(address totem) external;
    function treasury() external view returns (address); [span_4](start_span)// Necesario para el despliegue[span_4](end_span)
}

interface IMetrics {
    function markets(address totem) external view returns (uint256 rawVolume, uint256 verifiedVolume, uint256 createdAt, uint256 lastTradeAt);
}

interface IUniswapV2Factory {
    function createPair(address tokenA, address tokenB) external returns (address pair);
}

interface IUniswapV2Router {
    function addLiquidity(address tokenA, address tokenB, uint amountA, uint amountB, uint minA, uint minB, address to, uint deadline) external returns (uint, uint, uint);
}

contract TotemGraduationManager is Ownable2Step, ReentrancyGuard, Pausable {
    ITotem public immutable totem;
    ICurve public immutable curve;
    IMetrics public immutable metrics;
    address public immutable wldToken;
    address public router;
    address public factory;
    address public liquidityProvider;

    uint256 public minLevel = 4;
    uint256 public minSupply = 10_000 * 1e18; // Definido en Wei para coherencia
    uint256 public minVolume = 15_000 ether;
    uint256 public minAge = 45 days;
    uint256 public liquidityBps = 1000;

    mapping(address => bool) public graduated;
    mapping(address => address) public ammPair;
    mapping(address => address) public totemAsset;

    error AlreadyGraduated();
    error NotEligible();
    error FraudLocked();
    error PairExists();
    error InsufficientLiquidity();

    constructor(address _totem, address _curve, address _metrics, address _wld, address _router, address _factory, address _liquidityProvider) Ownable(msg.sender) {
        totem = ITotem(_totem);
        curve = ICurve(_curve);
        metrics = IMetrics(_metrics);
        wldToken = _wld;
        router = _router;
        factory = _factory;
        liquidityProvider = _liquidityProvider;
    }

    function canGraduate(address user) public view returns (bool) {
        if (graduated[user]) return false;
        (bool fraudLocked, uint256 level,) = totem.status(user);
        if (fraudLocked) return false;

        uint256 supply = curve.realSupply(user); [span_5](start_span)// FIX: Uso de realSupply[span_5](end_span)
        (,, uint256 createdAt,) = metrics.markets(user);
        if (createdAt == 0) return false;

        uint256 volume = 0;
        (, uint256 verifiedVolume,,) = metrics.markets(user);
        volume = verifiedVolume;

        if (level < minLevel) return false;
        if (supply < minSupply) return false;
        if (volume < minVolume) return false;
        if (block.timestamp < createdAt + minAge) return false;
        return true;
    }

    function _createAMM(address user, string memory name, string memory symbol) internal returns (address pair) {
        if (ammPair[user] != address(0)) revert PairExists();

        [span_6](start_span)// FIX: Despliegue con todos los parámetros requeridos por el constructor de HumanTotem[span_6](end_span)
        HumanTotem newTotem = new HumanTotem(
            name,
            symbol,
            user,
            totem.oracle(),
            totem.registry(),
            curve.treasury()
        );

        address token = address(newTotem);
        totemAsset[user] = token;
        pair = IUniswapV2Factory(factory).createPair(token, wldToken);
        ammPair[user] = pair;

        uint256 supply = curve.realSupply(user); [span_7](start_span)// FIX: Uso de realSupply[span_7](end_span)
        uint256 price = curve.getPrice(user);

        [span_8](start_span)// FIX DECIMAL: 'supply' ya viene en Wei (1e18), no multiplicar de nuevo[span_8](end_span)
        uint256 amountTokenWei = (supply * liquidityBps) / 10_000;
        uint256 amountWLD = (amountTokenWei * price) / 1e18;

        newTotem.mint(address(this), amountTokenWei);

        if (IERC20(wldToken).balanceOf(liquidityProvider) < amountWLD) revert InsufficientLiquidity();
        require(IERC20(wldToken).transferFrom(liquidityProvider, address(this), amountWLD), "wld transfer fail");

        IERC20(token).approve(router, amountTokenWei);
        IERC20(wldToken).approve(router, amountWLD);

        IUniswapV2Router(router).addLiquidity(token, wldToken, amountTokenWei, amountWLD, 0, 0, user, block.timestamp);
    }

    function graduate(address user, string calldata name, string calldata symbol) external nonReentrant whenNotPaused {
        if (graduated[user]) revert AlreadyGraduated();
        (bool fraudLocked,,) = totem.status(user);
        if (fraudLocked) revert FraudLocked();
        if (!canGraduate(user)) revert NotEligible();

        graduated[user] = true;
        curve.freeze(user);
        _createAMM(user, name, symbol);
    }

    function setLiquidityProvider(address _provider) external onlyOwner {
        liquidityProvider = _provider;
    }
}
