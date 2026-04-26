const INITIAL_PRICE_WLD = 0.00000055;
const CURVE_K = 2.35e-20; // Alineado con TotemBondingCurve.sol: CURVE_K=235, SCALE=1e20
const BUY_FEE = 0.02;
const SELL_FEE = 0.03;
const BASE_SELL_SLIPPAGE = 0.03;
const MAX_SELL_SLIPPAGE = 0.10;
const TOTAL_SUPPLY = 100_000_000;
const MIN_BUY_TOKENS = 1000;

function spotPrice(s: number): number {
  return INITIAL_PRICE_WLD + CURVE_K * s * s;
}

function V(s: number): number {
  return INITIAL_PRICE_WLD * s + (CURVE_K / 3) * s * s * s;
}

export function estimateBuy(amountWld: number, currentSupply: number): number {
  if (amountWld <= 0 || currentSupply < 0) return 0;

  const netWld = amountWld * (1 - BUY_FEE);
  let s0 = currentSupply;
  let s1 = s0 + (netWld / spotPrice(s0)) * 1.02;

  for (let i = 0; i < 12; i++) {
    const f = V(s1) - (V(s0) + netWld);
    const df = spotPrice(s1);
    if (Math.abs(df) < 1e-12) break;
    s1 -= f / df;
  }

  if (!isFinite(s1) || s1 <= s0) {
    s1 = s0 + netWld / spotPrice(s0);
  }

  if (s1 > TOTAL_SUPPLY) s1 = TOTAL_SUPPLY;

  return Math.max(0, Math.floor(s1 - s0));
}

export function estimateSell(tokensToSell: number, currentSupply: number): number {
  if (tokensToSell <= 0 || tokensToSell > currentSupply) return 0;

  const s0 = currentSupply;
  const s1 = s0 - tokensToSell;

  let grossWld = V(s0) - V(s1);

  const sellRatio = tokensToSell / currentSupply;
  const dynamicSlippage = Math.min(
    BASE_SELL_SLIPPAGE + Math.pow(sellRatio, 0.7) * 0.12,
    MAX_SELL_SLIPPAGE
  );

  grossWld *= (1 - dynamicSlippage);

  return grossWld * (1 - SELL_FEE);
}
