/**
 * rateLimiter.adapter.mjs — Capa única de importación para los 3 niveles de
 * rate limiting que coexisten en el sistema.
 *
 * MOTIVACIÓN
 *   El rate limiting NO es una sola responsabilidad. Después de auditar el
 *   código en uso, identificamos 3 capas ortogonales con propósitos distintos
 *   y NINGUNA es sustituible por otra:
 *
 *     ┌──────────────────────────────────────────────────────────────────┐
 *     │ CAPA 1 — INFRA / HTTP            anti-DoS por IP                 │
 *     │   API: infraLimit(req, opts)                                     │
 *     │   Backend: in-memory Map por IP, ventana fija                    │
 *     │   Persistencia: NO (se pierde en restart, intencional)           │
 *     │   Consumers: nonce, verify, walletVerify, get-profile,           │
 *     │              createProfile, verifyOrbStatus, notifications,      │
 *     │              upgrade, withdraw                                   │
 *     ├──────────────────────────────────────────────────────────────────┤
 *     │ CAPA 1b — INFRA PERSISTENTE      cuotas largas (>1h)             │
 *     │   API: persistentLimit(key, opts)                                │
 *     │   Backend: Supabase tabla rate_limit_hits                        │
 *     │   Consumers: createPost ("max 15 posts/hora")                    │
 *     ├──────────────────────────────────────────────────────────────────┤
 *     │ CAPA 2 — APP / CONTENIDO         anti-spam y anti wash-trading   │
 *     │   API: appLimit(userId, opType, payload?)                        │
 *     │        loopDetect(userId, tradeType)                             │
 *     │        setTrust(userId, tier) / getStats()                       │
 *     │   Features: trust tiers + burst + dedup payload + trading loops  │
 *     │   Backend: in-memory Maps (userWindows, burstTracker, …)         │
 *     │   Consumers: createPost (dedup), tokenSell (anti loops),         │
 *     │              admin/infra (stats), health                         │
 *     │   Visible en: src/admin/components/InfraPanel.tsx                │
 *     ├──────────────────────────────────────────────────────────────────┤
 *     │ CAPA 3 — PROTOCOLO ON-CHAIN      mirror BigInt de TotemRateLimiter│
 *     │   API: protocolCheck({user, action, level, locked, bucket, now}) │
 *     │        protocolPreview({...})                                    │
 *     │   Backend: PURE (consumer trae el bucket)                        │
 *     │   Consumers: endpoints que tocan registry/totem on-chain         │
 *     │              (trade center, totem dashboard, protocol control)   │
 *     │   Fuente de verdad: TotemRateLimiter.sol                         │
 *     └──────────────────────────────────────────────────────────────────┘
 *
 * REGLA DE USO
 *   - Capas 1 y 2 son OFF-CHAIN, gestionan ataques y abuso a nivel app/infra.
 *     Implementan features (burst, dedup, trust, IP-based) que el contrato
 *     deliberadamente NO tiene porque no son responsabilidad on-chain.
 *   - Capa 3 es ON-CHAIN MIRROR. Se usa SOLO en endpoints que invocan o
 *     reflejan operaciones del protocolo. Su comportamiento debe ser
 *     EXACTAMENTE el del contrato (token bucket BigInt, level scaling,
 *     fraudLocked, errores nombrados).
 *   - NUNCA usar capa 3 como sustituto de 1/2 ni viceversa. Son ortogonales.
 *
 * ORDEN RECOMENDADO POR REQUEST ECONÓMICO
 *   infraLimit (HTTP)
 *     → appLimit (user)
 *     → protocolCheck (on-chain mirror, si aplica)
 *     → AntiManipulation
 *     → Curve / Stability
 *     → Response
 *
 * NOTA IMPORTANTE
 *   Este adapter NO modifica el comportamiento runtime de las capas legacy.
 *   Solo centraliza el punto de importación, documenta las 3 capas y añade
 *   la capa 3 (mirror) como API estable. Los módulos legacy `_rateLimit.mjs`
 *   y `_smartRate.mjs` siguen siendo la implementación viva — NO se eliminan.
 */

import {
  rateLimit       as _legacyInfraLimit,
  rateLimitPersistent as _legacyPersistentLimit,
} from "../_rateLimit.mjs";

import {
  smartRateLimit  as _legacyAppLimit,
  detectTradingLoop as _legacyLoopDetect,
  setUserTrust    as _legacySetTrust,
  getRateLimitStats as _legacyGetStats,
} from "../_smartRate.mjs";

import {
  resolveConfig,
  check        as _mirrorCheck,
  checkPreview as _mirrorPreview,
  RateLimitError,
  DEFAULT_CONFIGS,
  ACTION_QUERY,
  ACTION_UPDATE,
} from "./rateLimiter.mjs";

// ════════════════════════════════════════════════════════════════════════════
// CAPA 1 — INFRA / HTTP (IP-based, in-memory)
// ════════════════════════════════════════════════════════════════════════════

export const infraLimit       = _legacyInfraLimit;
export const persistentLimit  = _legacyPersistentLimit;

// Aliases retro-compatibles (NO romper imports existentes que usen estos nombres)
export const rateLimit            = _legacyInfraLimit;
export const rateLimitPersistent  = _legacyPersistentLimit;

// ════════════════════════════════════════════════════════════════════════════
// CAPA 2 — APP / CONTENIDO (per-user, burst, dedup, trust)
// ════════════════════════════════════════════════════════════════════════════

export const appLimit         = _legacyAppLimit;
export const loopDetect       = _legacyLoopDetect;
export const setTrust         = _legacySetTrust;
export const getStats         = _legacyGetStats;

// Aliases retro-compatibles
export const smartRateLimit       = _legacyAppLimit;
export const detectTradingLoop    = _legacyLoopDetect;
export const setUserTrust         = _legacySetTrust;
export const getRateLimitStats    = _legacyGetStats;

// ════════════════════════════════════════════════════════════════════════════
// CAPA 3 — PROTOCOLO ON-CHAIN (BigInt mirror de TotemRateLimiter.sol)
// ════════════════════════════════════════════════════════════════════════════

export {
  resolveConfig,
  RateLimitError,
  DEFAULT_CONFIGS,
  ACTION_QUERY,
  ACTION_UPDATE,
};

/**
 * protocolCheck — mirror completo del flujo del contrato:
 *   resolveConfig(action, level, locked) → check(bucket, capacity, refill, now)
 *
 * El consumer es responsable de cargar el bucket persistido por (user, action)
 * y de guardar el `newBucket` devuelto. Este módulo NO toca storage.
 *
 * @param {object} p
 * @param {string} p.action          - 'QUERY' | 'UPDATE' | custom
 * @param {bigint} p.level           - level del Registry (clamp [1,5] internal)
 * @param {boolean} p.locked         - fraudLocked del Registry
 * @param {{tokens: bigint, lastRefill: bigint}} p.bucket
 * @param {bigint} p.now             - timestamp unix segundos (BigInt)
 * @param {object} [p.configs]       - DEFAULT_CONFIGS si se omite
 * @returns {{newBucket: {tokens: bigint, lastRefill: bigint},
 *            capacity: bigint, refill: bigint}}
 * @throws  RateLimitError(InvalidConfig | FraudBlocked | RateLimited | ClockSkew)
 */
export function protocolCheck({ action, level, locked, bucket, now, configs }) {
  const { capacity, refill } = resolveConfig({ action, level, locked, configs });
  const { newBucket } = _mirrorCheck({ bucket, capacity, refill, now });
  return { newBucket, capacity, refill };
}

/**
 * protocolPreview — variante que NO consume token. Útil para UI.
 *
 * @returns {{
 *   allowed: boolean,
 *   tokensAvailable: bigint,
 *   refilledBucket: {tokens: bigint, lastRefill: bigint},
 *   secondsUntilNextToken: bigint,
 *   capacity: bigint, refill: bigint
 * }}
 */
export function protocolPreview({ action, level, locked, bucket, now, configs }) {
  const { capacity, refill } = resolveConfig({ action, level, locked, configs });
  const preview = _mirrorPreview({ bucket, capacity, refill, now });
  return { ...preview, capacity, refill };
}
