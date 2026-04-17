// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface IRegistry {
    function isTotem(address user) external view returns (bool);
}

interface IOracle {
    function getScore(address user) external view returns (uint256);
}

interface IMetrics {
    function recordBuy(address totem, uint256 amount) external;
    function recordSell(address totem, uint256 amount) external;
}

contract TotemBondingCurve is ReentrancyGuard, Ownable {

    IERC20 public immutable wldToken;
    IRegistry public immutable registry;
    IOracle public immutable oracle;
    IMetrics public metrics;

    address public treasury;

    mapping(address => uint256) public realSupply;
    mapping(address => mapping(address => uint256)) public balances;
    mapping(address => bool) public frozen;

    struct SellWindow {
        uint256 sold;
        uint256 lastReset;
    }

    mapping(address => mapping(address => SellWindow)) public sellWindows;

    uint256 public constant SELL_WINDOW = 1 days;
    uint256 public maxSellBps = 4500;

    uint256 public constant OWNER_MAX_BPS = 2500;
    uint256 public constant USER_MAX_BPS = 1000;

    uint256 public constant INITIAL_PRICE_WLD = 55 * 10**7;
    uint256 public constant SCALE = 1e20;
    uint256 public constant CURVE_K = 235;

    uint256 public constant BUY_FEE_BPS = 200;
    uint256 public constant SELL_FEE_BPS = 300;
    uint256 public constant FEE_DENOMINATOR = 10_000;

    // 🔥 FIX FINAL: score alineado a fees
    uint256 public constant SCORE_MIN = 975;
    uint256 public constant SCORE_MAX = 1025;
    uint256 public constant SCORE_BASE = 1000;

    event Buy(address indexed totem, address indexed user, uint256 wldIn, uint256 tokensOut);
    event Sell(address indexed totem, address indexed user, uint256 tokensIn, uint256 wldOut);
    event Frozen(address indexed totem);
    event TreasuryUpdated(address treasury);
    event MetricsUpdated(address metrics);

    error NotATotem();
    error ZeroAmount();
    error InsufficientBalance();
    error SlippageExceeded();
    error MaxPositionExceeded();
    error SellLimitExceeded();
    error FrozenError();
    error ZeroAddress();

    constructor(
        address _wld,
        address _registry,
        address _oracle,
        address _treasury,
        address _metrics
    ) Ownable(msg.sender) {
        if (_wld == address(0) || _registry == address(0) || _oracle == address(0) || _treasury == address(0)) 
            revert ZeroAddress();

        wldToken = IERC20(_wld);
        registry = IRegistry(_registry);
        oracle = IOracle(_oracle);
        treasury = _treasury;
        metrics = IMetrics(_metrics);
    }

    modifier notFrozen(address totem) {
        if (frozen[totem]) revert FrozenError();
        _;
    }

    // ================= SAFE SCORE =================
    function _safeScore(address totem) internal view returns (uint256) {
        try oracle.getScore(totem) returns (uint256 s) {
            if (s < SCORE_MIN || s > SCORE_MAX) return SCORE_BASE;
            return s;
        } catch {
            return SCORE_BASE;
        }
    }

    // ================= CURVE =================

    function V(uint256 s) public pure returns (uint256) {
        uint256 linear = INITIAL_PRICE_WLD * s;
        uint256 s2 = (s * s) / SCALE;
        uint256 s3 = (s2 * s) / SCALE;
        uint256 cubic = (CURVE_K * s3) / 3;
        return linear + cubic;
    }

    function dV(uint256 s) public pure returns (uint256) {
        uint256 s2 = (s * s) / SCALE;
        return INITIAL_PRICE_WLD + (CURVE_K * s2);
    }

    function _effective(uint256 real, uint256 score) internal pure returns (uint256) {
        return (real * score) / SCORE_BASE;
    }

    function _solveBuyEff(uint256 s0Eff, uint256 wldIn) internal pure returns (uint256 s1Eff) {
        uint256 target = V(s0Eff) + wldIn;

        uint256 dv0 = dV(s0Eff);
        if (dv0 == 0) return s0Eff;

        s1Eff = s0Eff + (wldIn / dv0);

        for (uint256 i = 0; i < 10; i++) {
            uint256 v1 = V(s1Eff);

            int256 f = int256(v1) - int256(target);
            int256 df = int256(dV(s1Eff));

            if (df == 0 || f == 0) return s1Eff;

            int256 delta = f / df;
            if (delta == 0) return s1Eff;

            int256 maxStep = int256(s1Eff) / 4;
            if (delta > maxStep) delta = maxStep;
            if (delta < -maxStep) delta = -maxStep;

            if (delta > 0) s1Eff -= uint256(delta);
            else s1Eff += uint256(-delta);
        }

        uint256 low = s0Eff;
        uint256 high = s1Eff > s0Eff ? s1Eff : s0Eff + 1;

        while (V(high) < target) {
            if (high > type(uint256).max / 2) break;
            high *= 2;
        }

        for (uint256 i = 0; i < 32; i++) {
            uint256 mid = (low + high) / 2;
            uint256 v = V(mid);

            if (v > target) high = mid;
            else low = mid;
        }

        return (low + high) / 2;
    }

    // ================= BUY =================
    function buy(address totem, uint256 amountWldIn, uint256 minTokensOut)
        external
        nonReentrant
        notFrozen(totem)
    {
        if (!registry.isTotem(totem)) revert NotATotem();
        if (amountWldIn == 0) revert ZeroAmount();

        uint256 score = _safeScore(totem);

        uint256 fee = (amountWldIn * BUY_FEE_BPS) / FEE_DENOMINATOR;
        uint256 netWld = amountWldIn - fee;

        uint256 s0Eff = _effective(realSupply[totem], score);
        uint256 s1Eff = _solveBuyEff(s0Eff, netWld);

        uint256 tokensOut = ((s1Eff - s0Eff) * SCORE_BASE) / score;

        if (tokensOut < minTokensOut) revert SlippageExceeded();

        uint256 newBalance = balances[totem][msg.sender] + tokensOut;
        uint256 supplyAfter = realSupply[totem] + tokensOut;

        if (realSupply[totem] != 0) {
            uint256 maxBps = (msg.sender == totem) ? OWNER_MAX_BPS : USER_MAX_BPS;
            if (newBalance > (supplyAfter * maxBps) / 10000) revert MaxPositionExceeded();
        }

        require(wldToken.transferFrom(msg.sender, address(this), netWld), "WLD net fail");
        require(wldToken.transferFrom(msg.sender, treasury, fee), "fee fail");

        balances[totem][msg.sender] = newBalance;
        realSupply[totem] += tokensOut;

        metrics.recordBuy(totem, amountWldIn);

        emit Buy(totem, msg.sender, amountWldIn, tokensOut);
    }

    // ================= SELL =================
    function sell(address totem, uint256 tokensIn, uint256 minWldOut)
        external
        nonReentrant
        notFrozen(totem)
    {
        if (!registry.isTotem(totem)) revert NotATotem();
        if (tokensIn == 0) revert ZeroAmount();

        uint256 userBalance = balances[totem][msg.sender];
        if (tokensIn > userBalance) revert InsufficientBalance();

        SellWindow storage w = sellWindows[totem][msg.sender];

        if (block.timestamp > w.lastReset + SELL_WINDOW) {
            w.sold = 0;
            w.lastReset = block.timestamp;
        }

        if (w.sold + tokensIn > (userBalance * maxSellBps) / 10000) {
            revert SellLimitExceeded();
        }

        uint256 score = _safeScore(totem);

        uint256 s0Eff = _effective(realSupply[totem], score);
        uint256 deltaEff = (tokensIn * score) / SCORE_BASE;

        if (deltaEff > s0Eff) revert InsufficientBalance();

        uint256 s1Eff = s0Eff - deltaEff;

        uint256 baseValue = V(s0Eff) - V(s1Eff);
        uint256 fee = (baseValue * SELL_FEE_BPS) / FEE_DENOMINATOR;
        uint256 payout = baseValue - fee;

        if (payout < minWldOut) revert SlippageExceeded();

        balances[totem][msg.sender] -= tokensIn;
        realSupply[totem] -= tokensIn;
        w.sold += tokensIn;

        require(wldToken.transfer(msg.sender, payout), "payout fail");
        require(wldToken.transfer(treasury, fee), "fee fail");

        metrics.recordSell(totem, payout);

        emit Sell(totem, msg.sender, tokensIn, payout);
    }

    // ================= FREEZE =================
    function freeze(address totem) external onlyOwner {
        frozen[totem] = true;
        emit Frozen(totem);
    }

    // ================= ADMIN =================
    function setTreasury(address _treasury) external onlyOwner {
        if (_treasury == address(0)) revert ZeroAddress();
        treasury = _treasury;
        emit TreasuryUpdated(_treasury);
    }

    function setMetrics(address _metrics) external onlyOwner {
        metrics = IMetrics(_metrics);
        emit MetricsUpdated(_metrics);
    }

    function setMaxSellBps(uint256 _bps) external onlyOwner {
        require(_bps <= 10000, "invalid bps");
        maxSellBps = _bps;
    }
}
