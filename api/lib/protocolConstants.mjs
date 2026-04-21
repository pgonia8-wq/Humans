/**
 * protocolConstants.mjs — Single source of truth para CONSTANTES del protocolo
 *
 * Este módulo es el lookup CENTRAL de constantes derivadas directamente de los
 * contratos Solidity. Ningún otro módulo debe declarar constantes propias del
 * protocolo: importarlas siempre de aquí (o, para curve, vía re-export).
 *
 * Estructura:
 *   - BondingCurve: re-export desde curve.mjs (que es el mirror BigInt exacto)
 *   - Oracle:       constantes propias (MIN_INTERVAL, UPDATE_FEE, etc.)
 *   - [Stability, AntiManip, RateLimiter, Graduation se agregan en Fases 3-6]
 *
 * Reglas:
 *   - NO modificar valores aquí sin que el contrato cambie primero.
 *   - NO duplicar: cualquier número de los .sol vive aquí o en curve.mjs.
 */

import * as Curve from "./curve.mjs";
import { SCORE_UNIT_ORACLE, INFLUENCE_UNIT_ORACLE } from "./units.mjs";

// ════════════════════════════════════════════════════════════════════════════
// PROTOCOL VERSION — bump cuando cambien constantes del protocolo
// ════════════════════════════════════════════════════════════════════════════
//
// SemVer del mirror off-chain respecto al deploy on-chain. Sirve para detectar
// drift en auditorías y para que clientes (frontend, tests) puedan validar
// que están hablando con la versión esperada.
//
//   0.1.0 — Fases 1-3: curve mirror + units + Oracle constants + Stability
//   0.2.0 — Fase 14: cobertura C7..C20 (HumanTotem, Tótem, FeeRouter mirrors;
//                     Registry/AccessGateway/Attestation/Control/Governance/
//                     MarketMetrics/Treasury constants).
//
export const PROTOCOL_VERSION = "0.2.0";

// ════════════════════════════════════════════════════════════════════════════
// BondingCurve — re-export del mirror canonical (curve.mjs)
// ════════════════════════════════════════════════════════════════════════════

export const BondingCurve = Object.freeze({
  // Curva
  INITIAL_PRICE_WLD: Curve.INITIAL_PRICE_WLD,   // BigInt wld-wei
  SCALE:             Curve.SCALE,
  CURVE_K:           Curve.CURVE_K,
  // Fees
  BUY_FEE_BPS:       Curve.BUY_FEE_BPS,
  SELL_FEE_BPS:      Curve.SELL_FEE_BPS,
  FEE_DENOMINATOR:   Curve.FEE_DENOMINATOR,
  // Position caps
  OWNER_MAX_BPS:     Curve.OWNER_MAX_BPS,
  USER_MAX_BPS:      Curve.USER_MAX_BPS,
  // Sell window
  MAX_SELL_BPS_DEFAULT: Curve.MAX_SELL_BPS_DEFAULT,
  SELL_WINDOW_SEC:      Curve.SELL_WINDOW_SEC,
  // Score
  SCORE_MIN:  Curve.SCORE_MIN,
  SCORE_MAX:  Curve.SCORE_MAX,
  SCORE_BASE: Curve.SCORE_BASE,
});

// ════════════════════════════════════════════════════════════════════════════
// Oracle — TotemOracle.sol
// ════════════════════════════════════════════════════════════════════════════

export const Oracle = Object.freeze({
  UPDATE_FEE_WEI:    10n ** 16n,        // 0.01 ether
  MIN_INTERVAL_SEC:  3600n,             // 1 hours
  // Rangos validados on-chain (mismos que SCORE_UNIT_ORACLE de units.mjs)
  SCORE_MIN:         BigInt(SCORE_UNIT_ORACLE.min),
  SCORE_MAX:         BigInt(SCORE_UNIT_ORACLE.max),
  SCORE_BASE_NEUTRAL: BigInt(SCORE_UNIT_ORACLE.base),  // getScore default cuando == 0
  // EIP-712 domain (debe coincidir con contrato)
  EIP712_DOMAIN_NAME:    "HTPOracle",
  EIP712_DOMAIN_VERSION: "1",
  EIP712_TYPE_NAME:      "UpdateMetrics",
});

// Aliases de seguridad: si alguien importa Influence pensando que es distinto,
// le sale el mismo objeto que SCORE_UNIT_ORACLE (decisión: misma escala).
export const OracleInfluence = INFLUENCE_UNIT_ORACLE;

// ════════════════════════════════════════════════════════════════════════════
// Graduation — TotemGraduationManager.sol
// ════════════════════════════════════════════════════════════════════════════
//
// Reglas REALES del contrato (NO inventar):
//   minLevel     = 4           (level del Registry, escala [1,5])
//   minSupply    = 10_000      (raw, no wei — comparado contra curve.getSupply)
//   minVolume    = 15_000 ether (15_000 * 1e18, comparado contra verifiedVolume)
//   minAge       = 45 days     (45 * 86_400 segundos)
//   liquidityBps = 1000        (10% del supply va al pool inicial AMM)
//
// Volumen usado para gating: SOLO verifiedVolume (rawVolume queda fuera del
// criterio anti-wash). Si verifiedVolume == 0 → volume = 0.
//
// Liquidity math (al graduar):
//   amountToken    = (supply * liquidityBps) / BPS_DENOMINATOR
//   amountTokenWei = amountToken * 1e18
//   amountWLD      = (amountTokenWei * price) / 1e18
//
export const Graduation = Object.freeze({
  MIN_LEVEL:              4n,
  MIN_SUPPLY:             10_000n,
  MIN_VOLUME_WEI:         15_000n * (10n ** 18n),
  MIN_AGE_SEC:            45n * 86_400n,
  LIQUIDITY_BPS:          1_000n,
  BPS_DENOMINATOR:        10_000n,
  TOKEN_DECIMALS:         18n,
  WEI_PER_TOKEN:          10n ** 18n,
});

// ════════════════════════════════════════════════════════════════════════════
// RateLimiter — TotemRateLimiter.sol
// ════════════════════════════════════════════════════════════════════════════
//
// Token bucket por (user, action). Defaults inicializados en el constructor:
//   ACTION_QUERY  → cap=5, refill=1, flags=FLAG_SCALE   (escala con level)
//   ACTION_UPDATE → cap=2, refill=1, flags=0            (anti-abuso, NO escala)
//
// Asimetría intencional: UPDATE más restrictivo, QUERY escala con reputación.
// NO hacerlos simétricos "por UX" — rompe el modelo de abuso del protocolo.
//
export const RateLimiter = Object.freeze({
  // Bitmask flags
  FLAG_SCALE:           1n,                  // bit 0: si activo, cap y refill escalan con level

  // Action labels (off-chain mirror — el contrato usa keccak256(<name>))
  ACTION_QUERY:         "QUERY",
  ACTION_UPDATE:        "UPDATE",

  // Default configs del constructor
  DEFAULT_CONFIGS: Object.freeze({
    QUERY:  Object.freeze({ baseCapacity: 5n, baseRefill: 1n, flags: 1n }),  // FLAG_SCALE
    UPDATE: Object.freeze({ baseCapacity: 2n, baseRefill: 1n, flags: 0n }),
  }),

  // Level clamp del Registry (status devuelve [1, 5])
  LEVEL_MIN:            1n,
  LEVEL_MAX:            5n,
});

// ════════════════════════════════════════════════════════════════════════════
// AntiManipulation — TotemAntiManipulationLayer.sol
// ════════════════════════════════════════════════════════════════════════════
//
// IMPORTANTE: el contrato SOLO implementa EMA smoothing + cooldown.
// NO tiene: wash detection, sandwich detection, velocity, ML heuristics.
// Cualquier extensión "inteligente" off-chain crearía desync con on-chain.
//
export const AntiManip = Object.freeze({
  ALPHA:                20n,        // smoothing factor (mutable on-chain via owner, default 20)
  ALPHA_DENOMINATOR:    100n,       // ema = (prev*(100-α) + new*α) / 100
  MIN_INTERVAL_SEC:     15n * 60n,  // 15 minutes between updateOracle calls
});

// ════════════════════════════════════════════════════════════════════════════
// Stability — TotemStabilityModule.sol
// ════════════════════════════════════════════════════════════════════════════

export const Stability = Object.freeze({
  BASE_BUYBACK_RATE:       40n,         // baseBuybackRate (mutable on-chain via owner, default 40)
  MAX_BUYBACK_RATE:        85n,         // maxBuybackRate (mutable on-chain via owner, default 85)
  COOLDOWN_SEC:            6n * 3600n,  // 6 hours
  // Stress calculation
  REP_RISK_THRESHOLD:      800n,        // avgReputation threshold para repRisk alto
  REP_RISK_HIGH:           30n,         // repRisk si avgReputation < 800
  REP_RISK_LOW:            10n,         // repRisk si avgReputation >= 800
  STRESS_PIECEWISE_LOW:    20n,         // stress < 20  → baseBuybackRate
  STRESS_PIECEWISE_HIGH:   50n,         // stress >= 50 → maxBuybackRate
  STRESS_MAX:              100n,        // clamp final
});

// ════════════════════════════════════════════════════════════════════════════
// Registry — TotemRegistry.sol  (C7)
// ════════════════════════════════════════════════════════════════════════════
//
// World ID gating + migración con delay anti-Sybil. NO hay matemática on-chain;
// el mirror sirve para que el frontend conozca delays y enforce labels.
//
export const Registry = Object.freeze({
  GROUP_ID:               1n,                              // World ID group
  EXTERNAL_NULLIFIER_LABEL: "create-totem",                // keccak256(<label>) on-chain
  MIGRATION_DELAY_SEC:    24n * 3600n,                     // 24 horas
});

// ════════════════════════════════════════════════════════════════════════════
// HumanTotem — HumanTotem.sol  (C8)  [mirror BigInt en humanTotemFees.mjs]
// ════════════════════════════════════════════════════════════════════════════
//
// ERC20 con penalty fee dinámico según score:
//   score <  2000 → 2000 bps (20%)
//   score <  4000 → 1000 bps (10%)
//   score >= 4000 → baseFeeBps  (default 0)
// Owner exempted (AMM safe). Stale > 10min → revert.
//
export const HumanTotem = Object.freeze({
  SCORE_THRESHOLD_LOW:        4000n,
  SCORE_THRESHOLD_CRITICAL:   2000n,
  FEE_BPS_LOW:                1000n,
  FEE_BPS_CRITICAL:           2000n,
  FEE_BPS_DEFAULT:            0n,
  FEE_BPS_DENOMINATOR:        10_000n,
  MAX_SCORE_STALENESS_SEC:    600n,                         // 10 minutes
});

// ════════════════════════════════════════════════════════════════════════════
// TotemSync — Tótem.sol  (C9)  [mirror BigInt en totemSync.mjs]
// ════════════════════════════════════════════════════════════════════════════
//
// ERC721 soulbound + sync de score con DECAY/PENALTY/LEVEL/BADGE on-chain.
// calculateLevel: 1M/500K/100K/10K → 5/4/3/2/1.
// calculateBadge: neg>50 → 0; score>8000 → 3; score>5000 → 2; else 1.
// DECAY: total*(now-lastUpdate)/1day/100. PENALTY: (last-cur)/3 cap total/2.
// MAX_ACCUMULATED_SCORE = 10M (clamp). MIN_SYNC_INTERVAL = 1h.
//
export const TotemSync = Object.freeze({
  MIN_SYNC_INTERVAL_SEC:      3_600n,                       // 1 hour
  MAX_ACCUMULATED_SCORE:      10_000_000n,
  MAX_FUTURE_DRIFT_SEC:       300n,                         // 5 minutes
  MAX_STALE_TIME_SEC:         600n,                         // 10 minutes
  ONE_DAY_SEC:                86_400n,
  NEGATIVE_BADGE_THRESHOLD:   50n,
  // Level thresholds (>): [10K, 100K, 500K, 1M]
  LEVEL_THRESHOLDS:           Object.freeze([10_000n, 100_000n, 500_000n, 1_000_000n]),
  // Badge thresholds (>): [5000, 8000]
  BADGE_THRESHOLDS:           Object.freeze([5_000n, 8_000n]),
});

// ════════════════════════════════════════════════════════════════════════════
// AccessGateway — TotemAccessGateway.sol  (C10)
// ════════════════════════════════════════════════════════════════════════════
//
// EIP-712 query gate con price tolerance check:
//   maxAllowed = (signedPrice * (10_000 + priceToleranceBps)) / 10_000
// priceToleranceBps default 200 (2%), max 1000 (10%) on-chain.
// MAX_DATA_AGE = 2 min antes de revert StaleData.
//
export const AccessGateway = Object.freeze({
  MAX_DATA_AGE_SEC:               120n,                     // 2 minutes
  PRICE_TOLERANCE_BPS_DEFAULT:    200n,                     // 2%
  PRICE_TOLERANCE_BPS_MAX:        1_000n,                   // 10% (admin clamp)
  BPS_DENOMINATOR:                10_000n,
  EIP712_DOMAIN_NAME:             "TotemGateway",
  EIP712_DOMAIN_VERSION:          "1",
  ACTION_QUERY_LABEL:             "QUERY",                  // keccak256(<label>) on-chain
});

// ════════════════════════════════════════════════════════════════════════════
// Attestation — TotemAttestation.sol  (C11)
// ════════════════════════════════════════════════════════════════════════════
//
// Verificación humana con scheduling. delay clamp [MIN_DELAY, MAX_DELAY].
//
export const Attestation = Object.freeze({
  MIN_DELAY_SEC:              3_600n,                       // 1 hour
  MAX_DELAY_SEC:              3n * 86_400n,                 // 3 days
});

/**
 * Mirror del clamp en scheduleVerification(user, value, delay):
 *   delay = clamp(delay, MIN_DELAY, MAX_DELAY)
 */
export function clampAttestationDelay(delaySec) {
  const d = BigInt(delaySec);
  if (d < Attestation.MIN_DELAY_SEC) return Attestation.MIN_DELAY_SEC;
  if (d > Attestation.MAX_DELAY_SEC) return Attestation.MAX_DELAY_SEC;
  return d;
}

// ════════════════════════════════════════════════════════════════════════════
// TotemControl — TotemControl.sol  (C12)
// ════════════════════════════════════════════════════════════════════════════
//
// Fee admin con request/execute + cooldown + límite de cambio %:
//   diff = |newFee - fee|
//   require((diff * 10_000) / fee <= MAX_CHANGE_BPS)
// MAX_CHANGE_BPS = 2000 (20%). delay request→execute = 1h. cooldown entre
// requests = 30min. Bounds absolutos [MIN_FEE, MAX_FEE].
//
export const TotemControl = Object.freeze({
  FEE_DEFAULT_WEI:        10n ** 16n,                       // 0.01 ether
  MIN_FEE_WEI:            10n ** 15n,                       // 0.001 ether
  MAX_FEE_WEI:            10n ** 17n,                       // 0.1 ether
  MAX_CHANGE_BPS:         2_000n,                           // 20%
  BPS_DENOMINATOR:        10_000n,
  DELAY_SEC:              3_600n,                           // 1 hour
  COOLDOWN_SEC:           1_800n,                           // 30 minutes
});

/**
 * Mirror exact de las validaciones de requestFeeChange / emergencySetFee:
 *   - newFee in [MIN_FEE, MAX_FEE]
 *   - (|newFee - fee| * BPS_DENOMINATOR) / fee <= MAX_CHANGE_BPS
 *
 * Devuelve { ok, reason? }. NO checa cooldown/pending/frozen (state-dependent).
 */
export function validateFeeChange({ currentFeeWei, newFeeWei }) {
  const cur = BigInt(currentFeeWei);
  const nxt = BigInt(newFeeWei);
  if (nxt < TotemControl.MIN_FEE_WEI || nxt > TotemControl.MAX_FEE_WEI) {
    return { ok: false, reason: "InvalidFee" };
  }
  if (cur === 0n) {
    // El contrato dividiría por cero → revert. Reflejamos.
    return { ok: false, reason: "InvalidFee", detail: "current_fee_zero" };
  }
  const diff = nxt > cur ? nxt - cur : cur - nxt;
  if ((diff * TotemControl.BPS_DENOMINATOR) / cur > TotemControl.MAX_CHANGE_BPS) {
    return { ok: false, reason: "ChangeTooLarge" };
  }
  return { ok: true };
}

// ════════════════════════════════════════════════════════════════════════════
// FeeRouter — TotemFeeRouter.sol  (C15)  [mirror BigInt en feeRouter.mjs]
// ════════════════════════════════════════════════════════════════════════════
//
// Split LP fees harvest:
//   treasury = balance * 40 / 100
//   buyback  = balance * 40 / 100
//   reward   = balance - treasury - buyback   ← por RESTA, preserva sum.
//
export const FeeRouter = Object.freeze({
  TREASURY_PCT:           40n,
  BUYBACK_PCT:            40n,
  REWARD_PCT:             20n,                              // 100 - 40 - 40
  PCT_DENOMINATOR:        100n,
});

// ════════════════════════════════════════════════════════════════════════════
// Governance — TotemGovernance.sol  (C16)
// ════════════════════════════════════════════════════════════════════════════
//
// Timelock proposals con TTL y emergencia. delay clamp [minDelay, maxDelay].
// emergencyMode bloquea executeProposal hasta deactivar.
//
export const Governance = Object.freeze({
  MIN_DELAY_SEC:              3_600n,                       // 1 hour
  MAX_DELAY_SEC:              3n * 86_400n,                 // 3 days
  PROPOSAL_TTL_SEC:           3n * 86_400n,                 // 3 days
  EMERGENCY_THRESHOLD:        75n,                          // stressIndex > 75 → activate
});

// ════════════════════════════════════════════════════════════════════════════
// MarketMetrics — TotemMarketMetrics.sol  (C18)
// ════════════════════════════════════════════════════════════════════════════
//
// View getVolume(totem) = verifiedVolume > 0 ? verifiedVolume : rawVolume.
// rawVolume es trade-recorded (puede inflarse via wash). verifiedVolume es
// firmado por signer/backupSigner via EIP-712.
//
export const MarketMetrics = Object.freeze({
  EIP712_DOMAIN_NAME:         "TotemMetrics",
  EIP712_DOMAIN_VERSION:      "1",
});

/**
 * Mirror de getVolume(totem). Devuelve verified si > 0, sino raw.
 */
export function resolveVolume({ rawVolume = 0n, verifiedVolume = 0n }) {
  const v = BigInt(verifiedVolume);
  return v > 0n ? v : BigInt(rawVolume);
}

// ════════════════════════════════════════════════════════════════════════════
// Treasury — TotemTreasury.sol  (C20)
// ════════════════════════════════════════════════════════════════════════════
//
// Withdraws con rate limit por (token, periodo):
//   if (now >= periodStart + period) reset
//   require(withdrawn + amount <= maxPerPeriod)
//
// withdrawPeriod, maxPerPeriod son admin-set on-chain (no constants fijos).
// El mirror solo expone el helper de check.
//
/**
 * Mirror del check en _updateRateLimit():
 *   - Si periodo expiró → withdrawn=0, periodStart=now
 *   - Verificar withdrawn + amount <= max
 *
 * rateLimit = { maxPerPeriod, withdrawn, periodStart } (BigInt-coercible)
 * Devuelve { ok, reason?, newWithdrawn, newPeriodStart }
 */
export function previewTreasuryWithdraw({ rateLimit, withdrawPeriodSec, amount, nowSec }) {
  const max = BigInt(rateLimit.maxPerPeriod);
  let withdrawn = BigInt(rateLimit.withdrawn);
  let periodStart = BigInt(rateLimit.periodStart);
  const period = BigInt(withdrawPeriodSec);
  const now = BigInt(nowSec);
  const a = BigInt(amount);

  if (now >= periodStart + period) {
    withdrawn = 0n;
    periodStart = now;
  }
  if (withdrawn + a > max) {
    return { ok: false, reason: "RateLimitExceeded", newWithdrawn: withdrawn, newPeriodStart: periodStart };
  }
  return { ok: true, newWithdrawn: withdrawn + a, newPeriodStart: periodStart };
}
