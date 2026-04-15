

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

contract TotemBondingCurve is ReentrancyGuard, Ownable {

    IERC20 public immutable wldToken;
    IRegistry public immutable registry;
    IOracle public immutable oracle;
    address public treasury;

    uint256 public constant INITIAL_PRICE_WLD = 55 * 10**7;
    uint256 public constant SCALE = 1e20;
    uint256 public constant CURVE_K = 235;

    uint256 public constant BUY_FEE_BPS = 200;
    uint256 public constant SELL_FEE_BPS = 300;
    uint256 public constant FEE_DENOMINATOR = 10_000;

    uint256 public constant SCORE_MIN = 925;
    uint256 public constant SCORE_MAX = 1075;
    uint256 public constant SCORE_BASE = 1000;

    mapping(address => uint256) public realSupply;

    event Buy(address indexed totem, uint256 wldIn, uint256 tokensOut, uint256 score);
    event Sell(address indexed totem, uint256 tokensIn, uint256 wldOut, uint256 score);
    event TreasuryUpdated(address newTreasury);

    error NotATotem();
    error ZeroAmount();
    error InsufficientSupply();
    error SlippageExceeded();
    error OracleAnomaly();

    constructor(address _wld, address _registry, address _oracle, address _treasury) Ownable(msg.sender) {
        wldToken = IERC20(_wld);
        registry = IRegistry(_registry);
        oracle = IOracle(_oracle);
        treasury = _treasury;
    }

    function _g(uint256 score) internal pure returns (uint256) {
        if (score < SCORE_MIN || score > SCORE_MAX) revert OracleAnomaly();
        return score;
    }

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

    // ================= SOLVER =================
    function _solveBuyEff(uint256 s0Eff, uint256 wldIn) internal pure returns (uint256 s1Eff) {
        uint256 target = V(s0Eff) + wldIn;

        // Newton inicial
        s1Eff = s0Eff + (wldIn * 1e18) / dV(s0Eff);

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

        // 🔥 FALLBACK: BISECTION (garantiza convergencia)
        uint256 low = s0Eff;
        uint256 high = s1Eff > s0Eff ? s1Eff : s0Eff + 1;

        while (V(high) < target) {
            high = high * 2;
        }

        for (uint256 i = 0; i < 32; i++) {
            uint256 mid = (low + high) / 2;
            uint256 v = V(mid);

            if (v > target) high = mid;
            else low = mid;
        }

        return (low + high) / 2;
    }

    // ================= PREVIEW =================
    function previewBuy(address totem, uint256 amountWldIn) external view returns (uint256 tokensOut) {
        if (!registry.isTotem(totem) || amountWldIn == 0) return 0;

        uint256 score = _g(oracle.getScore(totem));

        uint256 fee = (amountWldIn * BUY_FEE_BPS) / FEE_DENOMINATOR;
        uint256 netWld = amountWldIn - fee;

        uint256 s0Eff = _effective(realSupply[totem], score);
        uint256 s1Eff = _solveBuyEff(s0Eff, netWld);

        tokensOut = ((s1Eff - s0Eff) * SCORE_BASE) / score;
    }

    function previewSell(address totem, uint256 tokensIn) external view returns (uint256 wldOut) {
        if (!registry.isTotem(totem) || tokensIn == 0) return 0;

        uint256 score = _g(oracle.getScore(totem));

        uint256 s0Eff = _effective(realSupply[totem], score);
        uint256 deltaEff = (tokensIn * score) / SCORE_BASE;

        if (deltaEff > s0Eff) return 0;

        uint256 s1Eff = s0Eff - deltaEff;

        uint256 baseValue = V(s0Eff) - V(s1Eff);
        uint256 fee = (baseValue * SELL_FEE_BPS) / FEE_DENOMINATOR;

        return baseValue - fee;
    }

    // ================= BUY =================
    function buy(address totem, uint256 amountWldIn, uint256 minTokensOut) external nonReentrant {
        if (!registry.isTotem(totem)) revert NotATotem();
        if (amountWldIn == 0) revert ZeroAmount();

        uint256 score = _g(oracle.getScore(totem));

        uint256 fee = (amountWldIn * BUY_FEE_BPS) / FEE_DENOMINATOR;
        uint256 netWld = amountWldIn - fee;

        uint256 s0Eff = _effective(realSupply[totem], score);
        uint256 s1Eff = _solveBuyEff(s0Eff, netWld);

        uint256 tokensOut = ((s1Eff - s0Eff) * SCORE_BASE) / score;

        if (tokensOut < minTokensOut) revert SlippageExceeded();

        require(wldToken.transferFrom(msg.sender, address(this), netWld), "WLD transfer failed");
        require(wldToken.transferFrom(msg.sender, treasury, fee), "Fee transfer failed");

        realSupply[totem] += tokensOut;

        emit Buy(totem, amountWldIn, tokensOut, score);
    }

    // ================= SELL =================
    function sell(address totem, uint256 tokensIn, uint256 minWldOut) external nonReentrant {
        if (!registry.isTotem(totem)) revert NotATotem();
        if (tokensIn == 0) revert ZeroAmount();

        uint256 s0Real = realSupply[totem];
        if (tokensIn > s0Real) revert InsufficientSupply();

        uint256 score = _g(oracle.getScore(totem));

        uint256 s0Eff = _effective(s0Real, score);
        uint256 deltaEff = (tokensIn * score) / SCORE_BASE;

        if (deltaEff > s0Eff) revert InsufficientSupply();

        uint256 s1Eff = s0Eff - deltaEff;

        uint256 baseValue = V(s0Eff) - V(s1Eff);
        uint256 fee = (baseValue * SELL_FEE_BPS) / FEE_DENOMINATOR;
        uint256 payout = baseValue - fee;

        if (payout < minWldOut) revert SlippageExceeded();

        realSupply[totem] = s0Real - tokensIn;

        require(wldToken.transfer(msg.sender, payout), "Payout failed");
        require(wldToken.transfer(treasury, fee), "Fee transfer failed");

        emit Sell(totem, tokensIn, payout, score);
    }

    // ================= VIEW =================
    function effectiveSupply(address totem) external view returns (uint256) {
        uint256 score = _g(oracle.getScore(totem));
        return _effective(realSupply[totem], score);
    }

    function getSupply(address totem) external view returns (uint256) {
        return realSupply[totem];
    }

    function setTreasury(address _newTreasury) external onlyOwner {
        require(_newTreasury != address(0), "Zero address");
        treasury = _newTreasury;
        emit TreasuryUpdated(_newTreasury);
    }
}


