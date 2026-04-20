// curve.mjs — Matemática pura de la bonding curve (sin dependencias externas)
// Fuente: token/api/_curve.mjs — constantes y funciones intactas

const TOTAL_SUPPLY            = 100_000_000;
const INITIAL_PRICE_WLD       = 0.00000055;
const CURVE_K                 = 2.35e-20;

const BUY_FEE                 = 0.02;
const SELL_FEE                = 0.03;
const BASE_SELL_SLIPPAGE      = 0.03;
const MAX_SELL_SLIPPAGE       = 0.10;

const GRADUATION_WLD          = 2000;
const GRADUATION_HOLDERS      = 300;
const GRADUATION_MIN_SUPPLY   = 25_000_000;

const POOL_PERCENT            = 0.70;
const TREASURY_PERCENT        = 0.30;

const CREATOR_LOCK_HOURS      = 24;
const MAX_CREATOR_HOLD        = 0.10;

const MAX_BUY_WLD_PER_TX      = 120;
const MAX_SELL_PERCENT_PER_TX = 0.025;
const MIN_BUY_TOKENS          = 1000;

const WLD_USD                 = 1.0;
const MAX_RETRIES             = 3;

export function spotPrice(s) {
  return INITIAL_PRICE_WLD + CURVE_K * s * s;
}

export function V(s) {
  return INITIAL_PRICE_WLD * s + (CURVE_K / 3) * s * s * s;
}

export function solveBuy(amountWld, currentSupply) {
  if (amountWld <= 0 || amountWld > MAX_BUY_WLD_PER_TX) {
    throw new Error(`Buy between 0.0001 and ${MAX_BUY_WLD_PER_TX} WLD`);
  }

  const fee    = amountWld * BUY_FEE;
  const netWld = amountWld - fee;

  let s0 = currentSupply;
  let s1 = s0 + (netWld / spotPrice(s0)) * 1.02;

  for (let i = 0; i < 12; i++) {
    const f  = V(s1) - (V(s0) + netWld);
    const df = spotPrice(s1);
    if (Math.abs(df) < 1e-12) break;
    s1 -= f / df;
  }

  if (!isFinite(s1) || s1 <= s0) {
    s1 = s0 + netWld / spotPrice(s0);
  }

  if (s1 > TOTAL_SUPPLY) s1 = TOTAL_SUPPLY;

  const tokensOut = Math.floor(s1 - s0);

  if (tokensOut < MIN_BUY_TOKENS) {
    throw new Error(`Minimum buy: ${MIN_BUY_TOKENS} tokens`);
  }

  const newSupply  = s0 + tokensOut;
  const actualCost = V(newSupply) - V(s0);

  return {
    tokensOut,
    fee,
    netWld: actualCost,
    newSupply,
    newPrice: spotPrice(newSupply),
  };
}

export function solveSell(tokensToSell, currentSupply, treasuryBalance) {
  if (tokensToSell <= 0) throw new Error("Invalid sell amount");
  if (currentSupply <= 0) throw new Error("Invalid supply");

  if (tokensToSell > currentSupply * MAX_SELL_PERCENT_PER_TX) {
    throw new Error(`Max sell: ${(MAX_SELL_PERCENT_PER_TX * 100).toFixed(1)}% of supply per tx`);
  }

  const s0 = currentSupply;
  const s1 = s0 - tokensToSell;
  if (s1 < 0) throw new Error("Cannot sell more than circulating supply");

  let grossWld = V(s0) - V(s1);
  const curveReturn = grossWld;

  const sellRatio = tokensToSell / currentSupply;
  const dynamicSlippage = Math.min(
    BASE_SELL_SLIPPAGE + Math.pow(sellRatio, 0.7) * 0.12,
    MAX_SELL_SLIPPAGE
  );

  grossWld *= (1 - dynamicSlippage);
  const slippageAmt = curveReturn - grossWld;

  const fee     = grossWld * SELL_FEE;
  const payout  = grossWld - fee;

  const safePayout = Math.min(payout, treasuryBalance ?? Infinity);

  const safeFee = safePayout / (1 - SELL_FEE) * SELL_FEE;

  return {
    wldReceived: safePayout,
    fee: safeFee,
    slippageAmt,
    totalFees: safeFee + slippageAmt,
    curveReturn,
    newSupply: s1,
    newPrice: spotPrice(s1),
    wasPartial: safePayout < payout,
  };
}

export function curvePercent(totalWldInCurve) {
  return Math.min(100, (totalWldInCurve / GRADUATION_WLD) * 100);
}

export function checkGraduation(totalWldInCurve, holders, currentSupply) {
  return (
    (currentSupply ?? 0) >= GRADUATION_MIN_SUPPLY &&
    totalWldInCurve >= GRADUATION_WLD &&
    holders >= GRADUATION_HOLDERS
  );
}

export function graduationSplit(totalWld) {
  return {
    toPool:     totalWld * POOL_PERCENT,
    toTreasury: totalWld * TREASURY_PERCENT,
  };
}

export {
  TOTAL_SUPPLY, BUY_FEE, SELL_FEE,
  BASE_SELL_SLIPPAGE, MAX_SELL_SLIPPAGE,
  MAX_SELL_PERCENT_PER_TX, MAX_BUY_WLD_PER_TX, MIN_BUY_TOKENS,
  GRADUATION_WLD, GRADUATION_HOLDERS, GRADUATION_MIN_SUPPLY,
  POOL_PERCENT, TREASURY_PERCENT,
  CREATOR_LOCK_HOURS, MAX_CREATOR_HOLD,
  WLD_USD, MAX_RETRIES,
  INITIAL_PRICE_WLD, CURVE_K,
};
