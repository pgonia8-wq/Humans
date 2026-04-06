import { BONDING_CURVE_CONFIG as C } from "../config/bondingCurve";

const a = C.INITIAL_PRICE_WLD;
const b = 1.72e-20;

export function spotPrice(supply: number): number {
  return a + b * supply * supply;
}

export function spotPriceUsd(supply: number): number {
  return spotPrice(supply) * C.WLD_USD_RATE;
}

export function accumulatedValue(supply: number): number {
  return a * supply + (b * supply * supply * supply) / 3;
}

export function curvePercent(totalWldInCurve: number): number {
  return Math.min(100, (totalWldInCurve / C.GRADUATION_WLD) * 100);
}

export function calculateBuy(amountWld: number, currentSupply: number) {
  if (amountWld <= 0) throw new Error("Amount must be positive");

  const fee = amountWld * C.BUY_FEE;
  const netWld = amountWld - fee;

  const s0 = currentSupply;
  const targetValue = accumulatedValue(s0) + netWld;

  let s1 = s0 + netWld / spotPrice(s0);

  for (let i = 0; i < 30; i++) {
    const f = accumulatedValue(s1) - targetValue;
    const df = spotPrice(s1);
    if (Math.abs(df) < 1e-15) break;
    const step = f / df;
    s1 -= step;
    if (s1 < s0) s1 = s0;
    if (Math.abs(step) < 0.5) break;
  }

  s1 = Math.min(s1, C.TOTAL_SUPPLY);
  s1 = Math.max(s1, s0);

  const tokensReceived = Math.max(0, Math.floor(s1 - s0));

  return {
    tokensReceived,
    feeToTreasury: fee,
    netWldIntoCurve: netWld,
    effectivePrice: tokensReceived > 0 ? netWld / tokensReceived : 0,
    newSupply: s0 + tokensReceived,
    spotPriceAfter: spotPrice(s0 + tokensReceived),
  };
}

export function calculateSell(tokensToSell: number, currentSupply: number) {
  if (tokensToSell <= 0) throw new Error("Amount must be positive");
  if (tokensToSell > currentSupply) throw new Error("Cannot sell more than current supply");

  const s0 = currentSupply;
  const s1 = s0 - tokensToSell;

  const curveReturn = accumulatedValue(s0) - accumulatedValue(s1);
  const slippageAmt = curveReturn * C.SELL_SLIPPAGE;
  const afterSlippage = curveReturn - slippageAmt;
  const fee = afterSlippage * C.SELL_FEE;
  const wldReceived = afterSlippage - fee;

  return {
    wldReceived,
    feeToTreasury: fee,
    slippageToTreasury: slippageAmt,
    totalFees: slippageAmt + fee,
    curveReturn,
    newSupply: s1,
    spotPriceAfter: spotPrice(s1),
  };
}

export function shouldGraduate(totalWldInCurve: number, holderCount: number): boolean {
  return (
    totalWldInCurve >= C.GRADUATION_WLD &&
    holderCount >= C.GRADUATION_HOLDERS
  );
}

export function graduationSplit(totalWldInCurve: number) {
  return {
    toPool: totalWldInCurve * C.GRADUATION_POOL_PERCENT,
    toTreasury: totalWldInCurve * C.GRADUATION_TREASURY_PERCENT,
  };
}

export function validateCreatorLock(userId: string, creatorId: string, createdAt: string): void {
  if (userId !== creatorId) return;
  const elapsed = Date.now() - new Date(createdAt).getTime();
  const lockMs = C.CREATOR_LOCK_HOURS * 3600000;
  if (elapsed < lockMs) {
    const hoursLeft = Math.ceil((lockMs - elapsed) / 3600000);
    throw new Error(`Creator locked for ${hoursLeft} more hours`);
  }
}

export function validateCreatorMaxHold(userId: string, creatorId: string, currentHolding: number, tokensToAdd: number): void {
  if (userId !== creatorId) return;
  const maxTokens = C.TOTAL_SUPPLY * C.MAX_CREATOR_HOLD;
  if (currentHolding + tokensToAdd > maxTokens) {
    throw new Error(`Creator cannot hold more than ${C.MAX_CREATOR_HOLD * 100}% of supply`);
  }
}

export function validateNotGraduated(graduated: boolean): void {
  if (graduated) throw new Error("Token has graduated — trade on DEX pool");
}

export function marketCap(currentSupply: number): number {
  return currentSupply * spotPrice(currentSupply);
}

export function marketCapUsd(currentSupply: number): number {
  return marketCap(currentSupply) * C.WLD_USD_RATE;
}
