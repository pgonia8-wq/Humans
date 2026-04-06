const TOTAL_SUPPLY  = 100_000_000;
const a             = 0.0000005;
const b             = 1.72e-20;

const BUY_FEE             = 0.02;
const SELL_FEE            = 0.03;
const SELL_SLIPPAGE       = 0.10;
const GRADUATION_WLD      = 2000;
const GRADUATION_HOLDERS  = 300;
const POOL_PERCENT        = 0.70;
const TREASURY_PERCENT    = 0.30;
const CREATOR_LOCK_HOURS  = 24;
const MAX_CREATOR_HOLD    = 0.10;
const WLD_USD             = 3.0;
const MAX_RETRIES         = 3;

export function spotPrice(s) {
  return a + b * s * s;
}

export function V(s) {
  return a * s + (b * s * s * s) / 3;
}

export function solveBuy(amountWld, currentSupply) {
  const fee    = amountWld * BUY_FEE;
  const netWld = amountWld - fee;

  const targetV = V(currentSupply) + netWld;

  let s1 = currentSupply + netWld / spotPrice(currentSupply);

  for (let i = 0; i < 30; i++) {
    const fVal = V(s1) - targetV;
    const dVal = spotPrice(s1);
    if (dVal === 0) break;
    const step = fVal / dVal;
    s1 -= step;
    if (s1 < currentSupply) s1 = currentSupply;
    if (Math.abs(step) < 0.5) break;
  }

  s1 = Math.min(s1, TOTAL_SUPPLY);
  s1 = Math.max(s1, currentSupply);

  const tokensOut = Math.floor(s1 - currentSupply);

  return {
    tokensOut,
    fee,
    netWld,
    newSupply: currentSupply + tokensOut,
    newPrice:  spotPrice(currentSupply + tokensOut),
  };
}

export function solveSell(tokensToSell, currentSupply) {
  const s0 = currentSupply;
  const s1 = s0 - tokensToSell;
  if (s1 < 0) throw new Error("Cannot sell more than circulating supply");

  const curveReturn   = V(s0) - V(s1);
  const slippageAmt   = curveReturn * SELL_SLIPPAGE;
  const afterSlippage  = curveReturn - slippageAmt;
  const fee           = afterSlippage * SELL_FEE;
  const wldReceived   = afterSlippage - fee;
  const totalFees     = slippageAmt + fee;

  return {
    wldReceived,
    fee,
    slippageAmt,
    totalFees,
    curveReturn,
    newSupply:  s1,
    newPrice:   spotPrice(s1),
  };
}

export function curvePercent(totalWldInCurve) {
  return Math.min(100, (totalWldInCurve / GRADUATION_WLD) * 100);
}

export function checkGraduation(totalWldInCurve, holders) {
  return totalWldInCurve >= GRADUATION_WLD && holders >= GRADUATION_HOLDERS;
}

export function graduationSplit(totalWld) {
  return {
    toPool:     totalWld * POOL_PERCENT,
    toTreasury: totalWld * TREASURY_PERCENT,
  };
}

export {
  TOTAL_SUPPLY, BUY_FEE, SELL_FEE, SELL_SLIPPAGE,
  GRADUATION_WLD, GRADUATION_HOLDERS,
  POOL_PERCENT, TREASURY_PERCENT,
  CREATOR_LOCK_HOURS, MAX_CREATOR_HOLD,
  WLD_USD, MAX_RETRIES,
  a as INITIAL_PRICE, b as B_COEFFICIENT,
};
