/**
 * antiManipulation.mjs — Mirror BigInt EXACTO de TotemAntiManipulationLayer.sol
 *
 * RESPONSABILIDAD ÚNICA:
 *   Replicar las dos primitivas pure del contrato:
 *     - updateEma(prev, newValue, alpha)  → nuevo emaPrice
 *     - canUpdate(lastUpdate, now)        → cooldown 15 min cumplido
 *
 * EL CONTRATO NO TIENE (y por tanto este módulo TAMPOCO):
 *   ✗ wash trading detection
 *   ✗ sandwich attack heuristics
 *   ✗ trade velocity per minute
 *   ✗ probabilistic flags
 *   ✗ ML-like scoring
 *   ✗ MEV detection
 *
 * Inventar cualquiera de esas crearía desync UX vs on-chain. ONCHAIN WINS ALWAYS.
 *
 * COMPATIBILIDAD CON RATELIMITER:
 *   AntiManip.MIN_INTERVAL_SEC = 900s entre updates al EMA (cooldown duro).
 *   RateLimiter.UPDATE bucket = 2 tokens, refill 1/sec (anti-spam fino).
 *   Ambos son anti-spam de updates pero operan en CAPAS distintas:
 *     - RateLimiter: throttle de llamadas API (segundos)
 *     - AntiManip: throttle de actualización del EMA on-chain (15 min)
 *   No duplican decisión: si una bloquea, la otra puede no haber gatillado aún.
 *   Documentar al consumer cuál check corre primero (orden importa para UX).
 */

import { AntiManip as A } from "./protocolConstants.mjs";

// ════════════════════════════════════════════════════════════════════════════
// PRIMITIVAS PURE — espejo exacto del contrato
// ════════════════════════════════════════════════════════════════════════════

/**
 * Calcula el nuevo emaPrice tras una observación.
 *
 * Mirror literal:
 *   if (prev == 0) ema = newValue
 *   else ema = (prev * (100 - alpha) + newValue * alpha) / 100
 *
 * División integer truncada (igual que Solidity uint256).
 *
 * @param {object} p
 * @param {bigint} p.prev      - emaPrice anterior (0 = uninitialized)
 * @param {bigint} p.newValue  - observación nueva
 * @param {bigint} [p.alpha]   - smoothing factor (default A.ALPHA = 20)
 * @returns {bigint} nuevo emaPrice
 */
export function updateEma({ prev, newValue, alpha = A.ALPHA }) {
  if (typeof prev !== "bigint" || typeof newValue !== "bigint" || typeof alpha !== "bigint") {
    throw new TypeError("updateEma: prev/newValue/alpha must be bigint");
  }
  if (alpha > A.ALPHA_DENOMINATOR) {
    throw new RangeError(`updateEma: alpha=${alpha} > denominator=${A.ALPHA_DENOMINATOR}`);
  }
  if (prev === 0n) return newValue;
  return (prev * (A.ALPHA_DENOMINATOR - alpha) + newValue * alpha) / A.ALPHA_DENOMINATOR;
}

/**
 * Tiempo restante hasta poder llamar updateOracle() de nuevo.
 *
 * Contrato: `block.timestamp > lastOracleUpdate[user] + 15 minutes` (estricto >).
 *
 * @param {object} p
 * @param {bigint} p.lastUpdate - timestamp del último updateOracle (0 si nunca)
 * @param {bigint} p.now        - block.timestamp (unix seconds)
 * @returns {bigint} segundos restantes (0 si ya se puede)
 */
export function secondsUntilNextUpdate({ lastUpdate, now }) {
  if (typeof lastUpdate !== "bigint" || typeof now !== "bigint") {
    throw new TypeError("secondsUntilNextUpdate: bigint required");
  }
  const unlockAt = lastUpdate + A.MIN_INTERVAL_SEC;
  if (now > unlockAt) return 0n;
  // contrato usa ESTRICTO >, no >=
  return unlockAt - now + 1n;
}

export function canUpdate({ lastUpdate, now }) {
  return secondsUntilNextUpdate({ lastUpdate, now }) === 0n;
}

/**
 * getSafeValue mirror — el contrato simplemente lee emaPrice[user].
 * Aquí es identidad por completitud de la API mirror.
 */
export function getSafeValue(emaPrice) {
  if (typeof emaPrice !== "bigint") {
    throw new TypeError("getSafeValue: emaPrice must be bigint");
  }
  return emaPrice;
}

// ════════════════════════════════════════════════════════════════════════════
// PREVIEW HELPER — derivado pure (no inventa lógica, solo agrupa)
// ════════════════════════════════════════════════════════════════════════════

/**
 * Vista compuesta para UI: dado el estado actual y una observación candidata,
 * devuelve qué pasaría si se llamara updateOracle ahora.
 *
 * NO ejecuta nada. NO firma. NO hace asunciones.
 *
 * @returns {{nextEma: bigint, canUpdateNow: boolean, secondsUntilUnlock: bigint, blockedBy: string|null}}
 */
export function updatePreview({ prev, newValue, lastUpdate, now, alpha = A.ALPHA }) {
  const wait = secondsUntilNextUpdate({ lastUpdate, now });
  const can = wait === 0n;
  // Aunque esté bloqueado calculamos el ema teórico (útil para UI "lo que pasaría")
  const nextEma = updateEma({ prev, newValue, alpha });
  return {
    nextEma,
    canUpdateNow: can,
    secondsUntilUnlock: wait,
    blockedBy: can ? null : "ANTI_MANIP_COOLDOWN",
  };
}
