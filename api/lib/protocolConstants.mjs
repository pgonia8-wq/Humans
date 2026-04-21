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
//
export const PROTOCOL_VERSION = "0.1.0";

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
