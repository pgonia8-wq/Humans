/**
 * invariants.mjs — Cross-module invariant checks (off-chain ↔ on-chain consistency)
 *
 * RESPONSABILIDAD:
 *   Verificar propiedades GLOBALES del sistema económico que deben mantenerse
 *   ciertas a lo largo del tiempo y entre módulos. Útil para:
 *     - smoke tests de deploy
 *     - asserts en endpoints críticos (modo paranoia)
 *     - regression detection cuando se actualiza un contrato
 *
 * NO ES:
 *   - Tests unitarios (eso vive en el harness Node directo)
 *   - Validación de inputs de usuario (eso es responsabilidad de cada endpoint)
 *
 * Cualquier invariant que falle indica drift entre el mirror off-chain y el
 * contrato, o un bug que podría manifestarse económicamente.
 */

import * as Curve from "./curve.mjs";
import { BondingCurve, Oracle, Stability, AntiManip, PROTOCOL_VERSION } from "./protocolConstants.mjs";
import { SCORE_UNIT_ORACLE, INFLUENCE_UNIT_ORACLE, mapEngineToOracleScore } from "./units.mjs";
import { calculateStress, getBuybackRate, repRisk } from "./stability.mjs";
import { updateEma } from "./antiManipulation.mjs";
import { resolveConfig, check, FLAG_SCALE, DEFAULT_CONFIGS } from "./rateLimiter.mjs";
import { Graduation } from "./protocolConstants.mjs";
import { calcLiquidityAmounts, canGraduate } from "./graduation.mjs";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve as pathResolve } from "node:path";

// ════════════════════════════════════════════════════════════════════════════
// INVARIANT #1: Curve monotonicity
// V(s) debe ser monótona no-decreciente en s ∈ [0, ∞)
// ════════════════════════════════════════════════════════════════════════════

export function curveMonotonicity({ samples = 16 } = {}) {
  const points = [];
  for (let i = 0; i <= samples; i++) {
    // Distribución log-ish para cubrir bajo y alto régimen
    const s = i === 0 ? 0n : (10n ** BigInt(2 + i));
    points.push(s);
  }
  for (let i = 1; i < points.length; i++) {
    const v0 = Curve.V(points[i - 1]);
    const v1 = Curve.V(points[i]);
    if (v1 < v0) {
      return {
        ok: false,
        invariant: "curveMonotonicity",
        detail: `V(${points[i]})=${v1} < V(${points[i - 1]})=${v0}`,
      };
    }
  }
  return { ok: true, invariant: "curveMonotonicity" };
}

// ════════════════════════════════════════════════════════════════════════════
// INVARIANT #2: dV(s) > 0 (precio spot estrictamente positivo)
// ════════════════════════════════════════════════════════════════════════════

export function spotPricePositive({ samples = 16 } = {}) {
  for (let i = 0; i <= samples; i++) {
    const s = i === 0 ? 0n : (10n ** BigInt(2 + i));
    const p = Curve.dV(s);
    if (p <= 0n) {
      return { ok: false, invariant: "spotPricePositive", detail: `dV(${s})=${p}` };
    }
  }
  return { ok: true, invariant: "spotPricePositive" };
}

// ════════════════════════════════════════════════════════════════════════════
// INVARIANT #3: Score bounds consistency
// SCORE_UNIT_ORACLE ↔ Oracle.SCORE_MIN/MAX ↔ Curve.SCORE_MIN/MAX
// ════════════════════════════════════════════════════════════════════════════

export function scoreBoundsConsistency() {
  const checks = [
    ["SCORE_UNIT_ORACLE.min === Oracle.SCORE_MIN", BigInt(SCORE_UNIT_ORACLE.min) === Oracle.SCORE_MIN],
    ["SCORE_UNIT_ORACLE.max === Oracle.SCORE_MAX", BigInt(SCORE_UNIT_ORACLE.max) === Oracle.SCORE_MAX],
    ["SCORE_UNIT_ORACLE.min === BondingCurve.SCORE_MIN", BigInt(SCORE_UNIT_ORACLE.min) === BondingCurve.SCORE_MIN],
    ["SCORE_UNIT_ORACLE.max === BondingCurve.SCORE_MAX", BigInt(SCORE_UNIT_ORACLE.max) === BondingCurve.SCORE_MAX],
    ["INFLUENCE_UNIT_ORACLE.min === SCORE_UNIT_ORACLE.min", INFLUENCE_UNIT_ORACLE.min === SCORE_UNIT_ORACLE.min],
    ["INFLUENCE_UNIT_ORACLE.max === SCORE_UNIT_ORACLE.max", INFLUENCE_UNIT_ORACLE.max === SCORE_UNIT_ORACLE.max],
  ];
  for (const [name, ok] of checks) {
    if (!ok) return { ok: false, invariant: "scoreBoundsConsistency", detail: `failed: ${name}` };
  }
  return { ok: true, invariant: "scoreBoundsConsistency" };
}

// ════════════════════════════════════════════════════════════════════════════
// INVARIANT #4: Engine→Oracle mapping range guarantee
// Para todo engineScore ∈ [0,10000], output ∈ [Oracle.SCORE_MIN, Oracle.SCORE_MAX]
// ════════════════════════════════════════════════════════════════════════════

export function engineMappingRange() {
  for (let s = 0; s <= 10000; s += 137) {
    const o = mapEngineToOracleScore(s);
    if (o < Number(Oracle.SCORE_MIN) || o > Number(Oracle.SCORE_MAX)) {
      return { ok: false, invariant: "engineMappingRange", detail: `map(${s})=${o} out of range` };
    }
  }
  // Boundaries exactos
  if (mapEngineToOracleScore(0) !== Number(Oracle.SCORE_MIN))
    return { ok: false, invariant: "engineMappingRange", detail: `map(0) != SCORE_MIN` };
  if (mapEngineToOracleScore(10000) !== Number(Oracle.SCORE_MAX))
    return { ok: false, invariant: "engineMappingRange", detail: `map(10000) != SCORE_MAX` };
  return { ok: true, invariant: "engineMappingRange" };
}

// ════════════════════════════════════════════════════════════════════════════
// INVARIANT #5: Fee invariants (buy + sell << denominator)
// ════════════════════════════════════════════════════════════════════════════

export function feeInvariants() {
  const buy = BondingCurve.BUY_FEE_BPS;
  const sell = BondingCurve.SELL_FEE_BPS;
  const denom = BondingCurve.FEE_DENOMINATOR;
  if (buy < 0n || sell < 0n) return { ok: false, invariant: "feeInvariants", detail: "negative fees" };
  if (buy + sell >= denom)   return { ok: false, invariant: "feeInvariants", detail: "buy+sell >= 100%" };
  if (denom !== 10000n)      return { ok: false, invariant: "feeInvariants", detail: `FEE_DENOMINATOR=${denom} != 10000` };
  // Round-trip ≥ 90% (sanity: si fees > 10% combined, diseño está roto)
  if (buy + sell > 1000n)    return { ok: false, invariant: "feeInvariants", detail: "round-trip recovery < 90%" };
  return { ok: true, invariant: "feeInvariants" };
}

// ════════════════════════════════════════════════════════════════════════════
// INVARIANT #6: Position caps coherentes (owner ≥ user)
// ════════════════════════════════════════════════════════════════════════════

export function positionCapsCoherent() {
  if (BondingCurve.OWNER_MAX_BPS < BondingCurve.USER_MAX_BPS) {
    return { ok: false, invariant: "positionCapsCoherent",
             detail: `OWNER_MAX_BPS=${BondingCurve.OWNER_MAX_BPS} < USER_MAX_BPS=${BondingCurve.USER_MAX_BPS}` };
  }
  if (BondingCurve.OWNER_MAX_BPS > 10000n || BondingCurve.USER_MAX_BPS > 10000n) {
    return { ok: false, invariant: "positionCapsCoherent", detail: "cap > 100%" };
  }
  return { ok: true, invariant: "positionCapsCoherent" };
}

// ════════════════════════════════════════════════════════════════════════════
// INVARIANT #7: Stability piecewise correct at boundaries
// (mirror exacto incluyendo no-monotonía documentada — esto valida la PARIDAD,
// no la calidad del diseño on-chain)
// ════════════════════════════════════════════════════════════════════════════

export function stabilityPiecewiseParity() {
  // stress=0 → 40, stress=19 → 40, stress=20 → 40, stress=21 → 42
  const cases = [
    [0n,  40n],
    [19n, 40n],
    [20n, 40n],
    [21n, 42n],
    [49n, 98n],   // ⚠ no-monotonía intencional (documentada en stability.mjs)
    [50n, 85n],
    [100n, 85n],
  ];
  for (const [s, expected] of cases) {
    const got = getBuybackRate(s);
    if (got !== expected) {
      return { ok: false, invariant: "stabilityPiecewiseParity",
               detail: `getBuybackRate(${s})=${got} expected ${expected}` };
    }
  }
  // repRisk degenerate branch: para todo Oracle score in [975,1025], repRisk=10
  for (let s = 975n; s <= 1025n; s++) {
    if (repRisk(s) !== Stability.REP_RISK_LOW) {
      return { ok: false, invariant: "stabilityPiecewiseParity",
               detail: `repRisk(${s})=${repRisk(s)} expected ${Stability.REP_RISK_LOW}` };
    }
  }
  return { ok: true, invariant: "stabilityPiecewiseParity" };
}

// ════════════════════════════════════════════════════════════════════════════
// INVARIANT #8: Stress ∈ [0, 100] always (clamp efectivo)
// ════════════════════════════════════════════════════════════════════════════

export function stressBounded() {
  // Caso extremo: priceDrop=100, volumeDrop=100, repRisk=30 → 230/3=76 (≤100, ok sin clamp)
  // Caso teórico imposible pero defendido: clamp en stress > 100
  const extremo = calculateStress({
    lastPrice: 10n ** 18n, currentPrice: 0n,
    lastVolume: 10n ** 18n, currentVolume: 0n,
    avgReputation: 100n,  // forzar repRisk=30
  });
  if (extremo > 100n) return { ok: false, invariant: "stressBounded", detail: `stress=${extremo} > 100` };
  if (extremo < 0n)   return { ok: false, invariant: "stressBounded", detail: `stress=${extremo} < 0` };
  return { ok: true, invariant: "stressBounded" };
}

// ════════════════════════════════════════════════════════════════════════════
// INVARIANT #9: AntiManip EMA bounded — el smoothing nunca produce un valor
// fuera del intervalo [min(prev, new), max(prev, new)].
// ════════════════════════════════════════════════════════════════════════════

export function emaBounded() {
  const cases = [
    { prev: 1000n, newValue: 2000n },
    { prev: 5000n, newValue: 1000n },
    { prev: 100n,  newValue: 100n  },
    { prev: 1n,    newValue: 10n ** 18n },
  ];
  for (const c of cases) {
    const ema = updateEma(c);
    const lo = c.prev < c.newValue ? c.prev : c.newValue;
    const hi = c.prev > c.newValue ? c.prev : c.newValue;
    if (ema < lo || ema > hi) {
      return { ok: false, invariant: "emaBounded",
               detail: `updateEma(prev=${c.prev}, new=${c.newValue})=${ema} fuera de [${lo}, ${hi}]` };
    }
  }
  // Stable point: prev === newValue → ema === prev
  if (updateEma({ prev: 777n, newValue: 777n }) !== 777n) {
    return { ok: false, invariant: "emaBounded", detail: "stable point falla" };
  }
  // Init point: prev === 0 → ema === newValue
  if (updateEma({ prev: 0n, newValue: 555n }) !== 555n) {
    return { ok: false, invariant: "emaBounded", detail: "init point (prev=0) falla" };
  }
  return { ok: true, invariant: "emaBounded" };
}

// ════════════════════════════════════════════════════════════════════════════
// INVARIANT #10: AntiManip alpha sanity — α ≤ denominator, no overflow.
// ════════════════════════════════════════════════════════════════════════════

export function antiManipAlphaSanity() {
  if (AntiManip.ALPHA > AntiManip.ALPHA_DENOMINATOR) {
    return { ok: false, invariant: "antiManipAlphaSanity",
             detail: `α=${AntiManip.ALPHA} > denom=${AntiManip.ALPHA_DENOMINATOR}` };
  }
  if (AntiManip.ALPHA <= 0n) {
    return { ok: false, invariant: "antiManipAlphaSanity",
             detail: `α=${AntiManip.ALPHA} debe ser > 0 (sin smoothing efectivo)` };
  }
  if (AntiManip.ALPHA_DENOMINATOR !== 100n) {
    return { ok: false, invariant: "antiManipAlphaSanity",
             detail: `denom=${AntiManip.ALPHA_DENOMINATOR} != 100 (mirror contrato)` };
  }
  if (AntiManip.MIN_INTERVAL_SEC !== 900n) {
    return { ok: false, invariant: "antiManipAlphaSanity",
             detail: `MIN_INTERVAL=${AntiManip.MIN_INTERVAL_SEC} != 900s (15min)` };
  }
  return { ok: true, invariant: "antiManipAlphaSanity" };
}

// ════════════════════════════════════════════════════════════════════════════
// INVARIANT #11: RateLimiter capacity respected — refill nunca excede capacity.
// ════════════════════════════════════════════════════════════════════════════

export function rateLimiterCapacityRespected() {
  // Bucket vacío + tiempo enorme → tokens debe quedar capped en capacity.
  const cap = 5n;
  const refill = 1n;
  const { newBucket } = check({
    bucket: { tokens: 0n, lastRefill: 1000n },
    capacity: cap, refill, now: 10n ** 9n,  // ~31 años después
  });
  // tras refill (capped) consumimos 1 → debe quedar cap-1
  if (newBucket.tokens !== cap - 1n) {
    return { ok: false, invariant: "rateLimiterCapacityRespected",
             detail: `tokens=${newBucket.tokens} expected ${cap - 1n}` };
  }
  return { ok: true, invariant: "rateLimiterCapacityRespected" };
}

// ════════════════════════════════════════════════════════════════════════════
// INVARIANT #12: Asimetría intencional UPDATE vs QUERY — UPDATE más restrictivo,
// QUERY escala con level. Si esto se rompe, el modelo de abuso del protocolo
// se invalida.
// ════════════════════════════════════════════════════════════════════════════

export function rateLimiterActionAsymmetry() {
  const Q = DEFAULT_CONFIGS.QUERY;
  const U = DEFAULT_CONFIGS.UPDATE;
  // QUERY DEBE tener FLAG_SCALE
  if ((Q.flags & FLAG_SCALE) === 0n) {
    return { ok: false, invariant: "rateLimiterActionAsymmetry",
             detail: "QUERY no tiene FLAG_SCALE (debería escalar con level)" };
  }
  // UPDATE NO debe tener FLAG_SCALE (anti-abuso fijo)
  if ((U.flags & FLAG_SCALE) !== 0n) {
    return { ok: false, invariant: "rateLimiterActionAsymmetry",
             detail: "UPDATE tiene FLAG_SCALE (debería ser fijo, anti-abuso)" };
  }
  // UPDATE.cap debe ser MENOR que QUERY.cap (más restrictivo)
  if (U.baseCapacity >= Q.baseCapacity) {
    return { ok: false, invariant: "rateLimiterActionAsymmetry",
             detail: `UPDATE.cap=${U.baseCapacity} >= QUERY.cap=${Q.baseCapacity} (debería ser <)` };
  }
  // Verificar scaling simétrico de QUERY (cap y refill ambos * level)
  const r1 = resolveConfig({ action: "QUERY", level: 1n, locked: false });
  const r5 = resolveConfig({ action: "QUERY", level: 5n, locked: false });
  if (r5.capacity !== r1.capacity * 5n || r5.refill !== r1.refill * 5n) {
    return { ok: false, invariant: "rateLimiterActionAsymmetry",
             detail: `scaling no simétrico: lvl1={${r1.capacity},${r1.refill}} lvl5={${r5.capacity},${r5.refill}}` };
  }
  // UPDATE no debe escalar (mismo a nivel 1 y 5)
  const u1 = resolveConfig({ action: "UPDATE", level: 1n, locked: false });
  const u5 = resolveConfig({ action: "UPDATE", level: 5n, locked: false });
  if (u1.capacity !== u5.capacity || u1.refill !== u5.refill) {
    return { ok: false, invariant: "rateLimiterActionAsymmetry",
             detail: "UPDATE escaló con level (debería ser fijo)" };
  }
  return { ok: true, invariant: "rateLimiterActionAsymmetry" };
}

// ════════════════════════════════════════════════════════════════════════════
// INVARIANT #13: Graduation thresholds coherent.
// Verifica que las constantes de graduación sean consistentes con el resto del
// protocolo (level dentro del rango LEVEL_MIN..LEVEL_MAX del rateLimiter, etc.)
// ════════════════════════════════════════════════════════════════════════════

export function graduationThresholdsCoherent() {
  const G = Graduation;
  if (G.MIN_LEVEL < 1n || G.MIN_LEVEL > 5n) {
    return { ok: false, invariant: "graduationThresholdsCoherent",
             detail: `MIN_LEVEL=${G.MIN_LEVEL} fuera de [1,5]` };
  }
  if (G.MIN_SUPPLY <= 0n) {
    return { ok: false, invariant: "graduationThresholdsCoherent",
             detail: `MIN_SUPPLY=${G.MIN_SUPPLY} debe ser > 0` };
  }
  if (G.MIN_VOLUME_WEI <= 0n) {
    return { ok: false, invariant: "graduationThresholdsCoherent",
             detail: `MIN_VOLUME_WEI=${G.MIN_VOLUME_WEI} debe ser > 0` };
  }
  if (G.MIN_AGE_SEC <= 0n) {
    return { ok: false, invariant: "graduationThresholdsCoherent",
             detail: `MIN_AGE_SEC=${G.MIN_AGE_SEC} debe ser > 0` };
  }
  if (G.LIQUIDITY_BPS <= 0n || G.LIQUIDITY_BPS > G.BPS_DENOMINATOR) {
    return { ok: false, invariant: "graduationThresholdsCoherent",
             detail: `LIQUIDITY_BPS=${G.LIQUIDITY_BPS} fuera de (0, ${G.BPS_DENOMINATOR}]` };
  }
  if (G.BPS_DENOMINATOR !== 10_000n) {
    return { ok: false, invariant: "graduationThresholdsCoherent",
             detail: `BPS_DENOMINATOR=${G.BPS_DENOMINATOR} != 10000` };
  }
  if (G.WEI_PER_TOKEN !== 10n ** G.TOKEN_DECIMALS) {
    return { ok: false, invariant: "graduationThresholdsCoherent",
             detail: `WEI_PER_TOKEN no coincide con 10^TOKEN_DECIMALS` };
  }
  return { ok: true, invariant: "graduationThresholdsCoherent" };
}

// ════════════════════════════════════════════════════════════════════════════
// INVARIANT #14: Liquidity math determinista.
// Caso conocido: supply=10_000, price=1e18, bps=1_000 → amountToken=1_000,
// amountTokenWei=1_000e18, amountWLD=1_000e18.
// Si esto cambia, el módulo divergió del contrato.
// ════════════════════════════════════════════════════════════════════════════

export function liquidityMathConsistent() {
  const supply = 10_000n;
  const price = 10n ** 18n;
  const r = calcLiquidityAmounts({ supply, price });
  const expectedToken = 1_000n;
  const expectedWei   = 1_000n * 10n ** 18n;
  if (r.amountToken !== expectedToken) {
    return { ok: false, invariant: "liquidityMathConsistent",
             detail: `amountToken=${r.amountToken} expected ${expectedToken}` };
  }
  if (r.amountTokenWei !== expectedWei) {
    return { ok: false, invariant: "liquidityMathConsistent",
             detail: `amountTokenWei=${r.amountTokenWei} expected ${expectedWei}` };
  }
  if (r.amountWLD !== expectedWei) {
    return { ok: false, invariant: "liquidityMathConsistent",
             detail: `amountWLD=${r.amountWLD} expected ${expectedWei}` };
  }
  // Sanity: con bps al máximo, amountToken == supply
  const full = calcLiquidityAmounts({ supply, price, liquidityBps: Graduation.BPS_DENOMINATOR });
  if (full.amountToken !== supply) {
    return { ok: false, invariant: "liquidityMathConsistent",
             detail: `bps=10000 amountToken=${full.amountToken} expected ${supply}` };
  }
  return { ok: true, invariant: "liquidityMathConsistent" };
}

// ════════════════════════════════════════════════════════════════════════════
// INVARIANT #15: E2E_PIPELINE_ORDER — scan estático anti-regresión
// Verifica que los endpoints económicos NO reimplementen math del contrato
// inline (constantes de la curva, fees, sell-window) y que SÍ importen del
// mirror canonical. Defensa contra regresiones tipo F8.
// ════════════════════════════════════════════════════════════════════════════

const __dirInv = dirname(fileURLToPath(import.meta.url));

// Endpoint → checks. `mustImport` = todos requeridos. `mustNotMatch` = ninguno
// debe aparecer fuera de comentario (heurística: línea sin `//` ni `*`).
const E2E_ENDPOINT_RULES = [
  {
    file: "../market/execute.mjs",
    mustImport: ["lib/curve.mjs"],
    mustNotMatch: [
      /INITIAL_PRICE_WEI\s*=/,
      /\bCURVE_K\s*=\s*\d/,
      /function\s+estimatePriceFromSupply/,
      /\b5\.5e8\b/,
    ],
  },
  {
    file: "../market/buy.mjs",
    mustImport: ["lib/curve.mjs"],
    mustNotMatch: [/INITIAL_PRICE_WEI/, /\bCURVE_K\s*=/, /\b5\.5e8\b/],
  },
  {
    file: "../market/sellPreview.mjs",
    mustImport: ["lib/curve.mjs", "lib/protocolConstants.mjs"],
    mustNotMatch: [/SELL_DAILY_LIMIT\s*=\s*0\.45\b/, /=\s*4500\b(?!_)/],
  },
  {
    file: "../market/tradeLimits.mjs",
    mustImport: ["lib/protocolConstants.mjs"],
    mustNotMatch: [/SELL_DAILY_LIMIT\s*=\s*0\.45\b/, /=\s*4500\b(?!_)/],
  },
  {
    file: "../system/stability.mjs",
    mustImport: ["lib/stability.mjs", "lib/protocolConstants.mjs"],
    mustNotMatch: [
      /baseBuybackRate\s*=\s*40\b/,
      /maxBuybackRate\s*=\s*85\b/,
      /=\s*REP_RISK_HIGH/i,  // no recalcular repRisk inline
    ],
  },
];

function stripCommentLines(src) {
  // Quita líneas que son sólo comentarios y bloques /* */
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((l) => !/^\s*(\/\/|\*)/.test(l))
    .join("\n");
}

export function e2ePipelineOrder() {
  const failures = [];
  for (const rule of E2E_ENDPOINT_RULES) {
    let src;
    try {
      src = readFileSync(pathResolve(__dirInv, rule.file), "utf8");
    } catch (e) {
      failures.push(`${rule.file}: cannot read (${e.code ?? e.message})`);
      continue;
    }
    const code = stripCommentLines(src);

    for (const needle of rule.mustImport) {
      if (!src.includes(needle)) {
        failures.push(`${rule.file}: missing import "${needle}"`);
      }
    }
    for (const re of rule.mustNotMatch) {
      if (re.test(code)) {
        failures.push(`${rule.file}: forbidden pattern matched ${re}`);
      }
    }
  }
  if (failures.length > 0) {
    return { ok: false, invariant: "e2ePipelineOrder", detail: failures.join(" | ") };
  }
  return { ok: true, invariant: "e2ePipelineOrder" };
}

// ════════════════════════════════════════════════════════════════════════════
// RUNNER — corre todos los invariants y reporta
// ════════════════════════════════════════════════════════════════════════════

export function runAllInvariants() {
  const results = [
    curveMonotonicity(),
    spotPricePositive(),
    scoreBoundsConsistency(),
    engineMappingRange(),
    feeInvariants(),
    positionCapsCoherent(),
    stabilityPiecewiseParity(),
    stressBounded(),
    emaBounded(),
    antiManipAlphaSanity(),
    rateLimiterCapacityRespected(),
    rateLimiterActionAsymmetry(),
    graduationThresholdsCoherent(),
    liquidityMathConsistent(),
    e2ePipelineOrder(),
  ];
  const failures = results.filter(r => !r.ok);
  return {
    ok: failures.length === 0,
    protocolVersion: PROTOCOL_VERSION,
    total: results.length,
    passed: results.length - failures.length,
    failed: failures.length,
    results,
  };
}
