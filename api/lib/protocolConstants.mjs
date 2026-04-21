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
