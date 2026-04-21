/**
 * rateLimiter.mjs — Mirror BigInt EXACTO de TotemRateLimiter.sol
 *
 * RESPONSABILIDAD ÚNICA:
 *   Replicar el algoritmo de token bucket por (user, action) del contrato.
 *   PURE: no tiene store. El consumer pasa el Bucket actual y recibe el nuevo.
 *
 * EL CONTRATO IMPLEMENTA (y por tanto este módulo replica):
 *   - Token bucket clásico con refill continuo
 *   - Escalado por user.level (clamp [1, 5])
 *   - Cache por bloque (off-chain: no aplica, no hay block.number)
 *   - Bloqueo si registry.fraudLocked
 *   - Errors: RateLimited, FraudBlocked, InvalidConfig
 *
 * EL CONTRATO NO IMPLEMENTA (y por tanto este módulo TAMPOCO):
 *   ✗ ventanas deslizantes (sliding windows)
 *   ✗ leaky bucket
 *   ✗ adaptive backoff
 *   ✗ rate por IP/origen
 *   ✗ priority queues
 *
 * ORDEN DE APLICACIÓN EN BACKEND (CRÍTICO):
 *   RateLimiter → AntiManipulation → Core logic (curve/stability)
 *
 *   Si se invierte, hay decisiones inconsistentes (aceptado por core pero
 *   bloqueado después por rate limit) y desync UX vs ejecución on-chain.
 *
 * FUENTE DE TIEMPO (CRÍTICO):
 *   El consumer DEBE elegir UNA sola fuente y mantenerla:
 *     (a) Date.now() para APIs stateless puras
 *     (b) timestamp persistido por (user, action) en store con concurrencia
 *   Mezclar ambas introduce drift invisible. Documentar elección a nivel de
 *   endpoint, no inline en cada call.
 *
 * AUTORIZACIÓN:
 *   El contrato exige que `msg.sender` esté en `authorizedCallers`. Off-chain
 *   esto se traduce a: el endpoint que invoca check() debe ser autorizado por
 *   el sistema (auth de Vercel/middleware). Este módulo NO valida auth.
 */

import { RateLimiter as RL } from "./protocolConstants.mjs";

// ════════════════════════════════════════════════════════════════════════════
// ERRORS — mirror de los nombres on-chain
// ════════════════════════════════════════════════════════════════════════════

export class RateLimitError extends Error {
  constructor(code, message) {
    super(message ?? code);
    this.name = "RateLimitError";
    this.code = code;
  }
}

// ════════════════════════════════════════════════════════════════════════════
// CONSTANTS LOCALES (alias del bloque RateLimiter)
// ════════════════════════════════════════════════════════════════════════════

export const FLAG_SCALE       = RL.FLAG_SCALE;
export const ACTION_QUERY     = RL.ACTION_QUERY;
export const ACTION_UPDATE    = RL.ACTION_UPDATE;
export const DEFAULT_CONFIGS  = RL.DEFAULT_CONFIGS;
export const LEVEL_MIN        = RL.LEVEL_MIN;
export const LEVEL_MAX        = RL.LEVEL_MAX;

// ════════════════════════════════════════════════════════════════════════════
// PRIMITIVAS PURE — espejo exacto del contrato
// ════════════════════════════════════════════════════════════════════════════

/**
 * Clamp del level a [1, 5] como hace _getUserState() del contrato.
 *
 * @param {bigint} level
 * @returns {bigint} level ∈ [1, 5]
 */
export function clampLevel(level) {
  if (typeof level !== "bigint") {
    throw new TypeError("clampLevel: level must be bigint");
  }
  if (level < RL.LEVEL_MIN) return RL.LEVEL_MIN;
  if (level > RL.LEVEL_MAX) return RL.LEVEL_MAX;
  return level;
}

/**
 * resolveConfig mirror — combina config + state del usuario en (capacity, refill).
 *
 * Mirror literal del contrato (líneas 130-151):
 *   1. Lee Config{baseCapacity, baseRefill, flags}
 *   2. Si baseCapacity==0 o baseRefill==0 → revert InvalidConfig
 *   3. Lee (level, locked) del cache → si locked → revert FraudBlocked
 *   4. Si flags & FLAG_SCALE: capacity = baseCap * level; refill = baseRefill * level
 *      Sino: capacity = baseCap; refill = baseRefill
 *
 * Decisión arquitectónica: scaling SIMÉTRICO (cap y refill ambos * level), tal
 * como lo hace el contrato. NO inventar asimetría "por balance".
 *
 * @param {object} p
 * @param {string} p.action            - 'QUERY' | 'UPDATE' | custom
 * @param {bigint} p.level             - level del Registry (se clampea a [1,5])
 * @param {boolean} p.locked           - fraudLocked del Registry
 * @param {object} [p.configs]         - configs custom (default DEFAULT_CONFIGS)
 * @returns {{capacity: bigint, refill: bigint}}
 */
export function resolveConfig({ action, level, locked, configs = DEFAULT_CONFIGS }) {
  // El contrato lanza InvalidConfig ANTES que FraudBlocked (orden importa)
  const cfg = configs[action];
  if (!cfg || cfg.baseCapacity === 0n || cfg.baseRefill === 0n) {
    throw new RateLimitError("InvalidConfig", `action="${action}" sin config válida`);
  }
  if (typeof level !== "bigint") {
    throw new TypeError("resolveConfig: level must be bigint");
  }
  if (typeof locked !== "boolean") {
    throw new TypeError("resolveConfig: locked must be boolean");
  }
  if (locked) {
    throw new RateLimitError("FraudBlocked", "user fraudLocked en Registry");
  }
  const lvl = clampLevel(level);
  if ((cfg.flags & FLAG_SCALE) !== 0n) {
    return { capacity: cfg.baseCapacity * lvl, refill: cfg.baseRefill * lvl };
  }
  return { capacity: cfg.baseCapacity, refill: cfg.baseRefill };
}

/**
 * check mirror — consume 1 token del bucket.
 *
 * Mirror literal del contrato (líneas 157-196), excepto:
 *   - NO hace registry.status() (input ya resuelto vía resolveConfig)
 *   - NO chequea authorizedCallers (responsabilidad del endpoint)
 *   - NO usa block.number cache (off-chain no tiene sentido)
 *
 * Algoritmo:
 *   1. Si lastRefill == 0 → init: lastRefill = now, tokens = capacity
 *   2. elapsed = now - lastRefill   (Solidity uint64 → underflow si now<lastRefill)
 *   3. Si elapsed > 0:
 *      refillAmt = elapsed * refillRate
 *      Si refillAmt > 0:
 *        tokens = min(tokens + refillAmt, capacity)
 *        consumedTime = refillAmt / refillRate   (= elapsed por matemática)
 *        if consumedTime > elapsed: consumedTime = elapsed
 *        lastRefill += consumedTime
 *   4. Si tokens == 0 → throw RateLimited
 *   5. tokens -= 1
 *
 * @param {object} p
 * @param {{tokens: bigint, lastRefill: bigint}} p.bucket - estado actual
 * @param {bigint} p.capacity                              - de resolveConfig
 * @param {bigint} p.refill                                - de resolveConfig
 * @param {bigint} p.now                                   - timestamp unix (segundos)
 * @returns {{newBucket: {tokens: bigint, lastRefill: bigint}}}
 * @throws RateLimitError('RateLimited') si bucket exhausted
 */
export function check({ bucket, capacity, refill, now }) {
  if (!bucket || typeof bucket.tokens !== "bigint" || typeof bucket.lastRefill !== "bigint") {
    throw new TypeError("check: bucket.{tokens,lastRefill} must be bigint");
  }
  if (typeof capacity !== "bigint" || typeof refill !== "bigint" || typeof now !== "bigint") {
    throw new TypeError("check: capacity/refill/now must be bigint");
  }
  if (capacity <= 0n || refill <= 0n) {
    throw new RateLimitError("InvalidConfig", "capacity/refill must be > 0");
  }

  let { tokens, lastRefill } = bucket;

  // Init: contrato hace lazy init en la primera llamada
  if (lastRefill === 0n) {
    lastRefill = now;
    tokens = capacity;
  }

  // uint64 underflow mirror — el contrato revierte si now < lastRefill
  if (now < lastRefill) {
    throw new RateLimitError("ClockSkew", `now=${now} < lastRefill=${lastRefill} (uint64 underflow on-chain)`);
  }

  const elapsed = now - lastRefill;

  if (elapsed > 0n) {
    const refillAmt = elapsed * refill;
    if (refillAmt > 0n) {
      let newTokens = tokens + refillAmt;
      if (newTokens > capacity) newTokens = capacity;
      tokens = newTokens;

      let consumedTime = refillAmt / refill;
      if (consumedTime > elapsed) consumedTime = elapsed;
      lastRefill = lastRefill + consumedTime;
    }
  }

  if (tokens === 0n) {
    throw new RateLimitError("RateLimited", "bucket exhausted");
  }

  tokens = tokens - 1n;
  return { newBucket: { tokens, lastRefill } };
}

// ════════════════════════════════════════════════════════════════════════════
// HELPER PURE — preview sin mutación, no consume token
// ════════════════════════════════════════════════════════════════════════════

/**
 * Calcula el estado del bucket post-refill SIN consumir token. Útil para UI:
 *   "¿cuántos tokens te quedan?" / "¿en cuántos segundos tendrás 1 token?"
 *
 * NO lanza RateLimitError — devuelve `allowed: false` si está exhausto.
 *
 * @returns {{
 *   allowed: boolean,
 *   tokensAvailable: bigint,
 *   refilledBucket: {tokens: bigint, lastRefill: bigint},
 *   secondsUntilNextToken: bigint
 * }}
 */
export function checkPreview({ bucket, capacity, refill, now }) {
  if (!bucket || typeof bucket.tokens !== "bigint" || typeof bucket.lastRefill !== "bigint") {
    throw new TypeError("checkPreview: bucket.{tokens,lastRefill} must be bigint");
  }
  if (typeof capacity !== "bigint" || typeof refill !== "bigint" || typeof now !== "bigint") {
    throw new TypeError("checkPreview: capacity/refill/now must be bigint");
  }
  if (capacity <= 0n || refill <= 0n) {
    throw new RateLimitError("InvalidConfig", "capacity/refill must be > 0");
  }

  let { tokens, lastRefill } = bucket;

  if (lastRefill === 0n) {
    lastRefill = now;
    tokens = capacity;
  }

  if (now < lastRefill) {
    throw new RateLimitError("ClockSkew", `now=${now} < lastRefill=${lastRefill}`);
  }

  const elapsed = now - lastRefill;
  if (elapsed > 0n) {
    const refillAmt = elapsed * refill;
    if (refillAmt > 0n) {
      let newTokens = tokens + refillAmt;
      if (newTokens > capacity) newTokens = capacity;
      tokens = newTokens;
      let consumedTime = refillAmt / refill;
      if (consumedTime > elapsed) consumedTime = elapsed;
      lastRefill = lastRefill + consumedTime;
    }
  }

  // Segundos hasta el próximo token (si tokens==0).
  // El refill produce 1 token cada ceil(1/refill) segundos. Como refill ≥ 1n
  // y entero, 1 token tarda ⌈1/refill⌉ = 1 segundo. Para refill rates más
  // bajos (no soportados por el contrato actual: refill > 0 entero), sería
  // ceil(1 / refill).
  const secondsUntilNextToken = tokens > 0n ? 0n : (refill >= 1n ? 1n : (1n + refill - 1n) / refill);

  return {
    allowed: tokens > 0n,
    tokensAvailable: tokens,
    refilledBucket: { tokens, lastRefill },
    secondsUntilNextToken,
  };
}
