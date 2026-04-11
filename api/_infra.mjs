import { getMetrics } from "./_metrics.mjs";

const STATES = {
  NORMAL: "NORMAL",
  STRESS: "STRESS",
  CRITICAL: "CRITICAL",
  LOCKDOWN: "LOCKDOWN",
  STABILIZATION: "STABILIZATION",
  HARD_SAFE: "HARD_SAFE",
};

const STATE_RANK = {
  [STATES.NORMAL]: 0,
  [STATES.STRESS]: 1,
  [STATES.CRITICAL]: 2,
  [STATES.STABILIZATION]: 3,
  [STATES.LOCKDOWN]: 4,
  [STATES.HARD_SAFE]: 5,
};

const state = {
  current: STATES.NORMAL,
  since: Date.now(),
  auto: true,
  criticalSince: null,
  lockdownSince: null,
  history: [],
  gpi: 0,
  gpiHistory: [],
  config: {
    stressLatencyP95: 500,
    stressSysErrRate: 6,
    stressDbUsage: 85,
    criticalDbUsage: 90,
    criticalSysErrRate: 18,
    criticalQueueSize: 500000,
    lockdownSysErrRate: 35,
    stabilizationAfterCriticalSec: 90,
    hardSafeAfterLockdownSec: 400,
    gpiWeights: { queueSize: 0.20, dbLatency: 0.25, errorRate: 0.25, rps: 0.15, connectionSat: 0.15 },
  },
  cache: { enabled: false, feedTTL: 0, profileTTL: 0, tokenTTL: 0 },
  batch: { enabled: false, likesBuffer: [], postsBuffer: [] },
  feedRefreshMs: 3000,
  realtimeEnabled: true,
  socialWritesAllowed: true,
  tradingAllowed: true,
  queueSocialWrites: false,
  dbWriteReduction: 0,
  aggressiveBatching: false,
};

const rolling = {
  sysErr: 0,
  weightedErr: 0,
  p95: 0,
  dbUse: 0,
};
const EMA_ALPHA = 0.3;

function emaUpdate(field, value) {
  rolling[field] = rolling[field] * (1 - EMA_ALPHA) + value * EMA_ALPHA;
}

const ERROR_WEIGHTS = {
  db_failure: 1.0,
  timeout: 0.8,
  internal: 0.9,
  unhandled: 1.0,
  rate_limited: 0.1,
  idempotency: 0,
  insufficient_funds: 0,
  validation: 0,
  cb_rejected: 0.1,
  network_drop: 0,
  client_disconnect: 0,
  retry: 0,
};

const SYSTEM_ERRORS = new Set(["db_failure", "timeout", "internal", "unhandled"]);
const EXPECTED_ERRORS = new Set(["rate_limited", "idempotency", "insufficient_funds", "validation", "cb_rejected"]);

const errorCounters = {
  system: 0,
  expected: 0,
  noise: 0,
  total: 0,
  byKind: {},
};

export function recordErrorByKind(kind) {
  errorCounters.total++;
  if (!errorCounters.byKind[kind]) errorCounters.byKind[kind] = 0;
  errorCounters.byKind[kind]++;
  if (SYSTEM_ERRORS.has(kind)) errorCounters.system++;
  else if (EXPECTED_ERRORS.has(kind)) errorCounters.expected++;
  else errorCounters.noise++;
}

export function getErrorClassification() {
  const m = getMetrics();
  const total = m.requests || 1;
  return {
    systemErrorRate: (errorCounters.system / total) * 100,
    expectedErrorRate: (errorCounters.expected / total) * 100,
    noiseErrorRate: (errorCounters.noise / total) * 100,
    totalErrorRate: m.errorRateNum || 0,
    weightedErrorRate: Object.entries(errorCounters.byKind).reduce(
      (sum, [kind, count]) => sum + count * (ERROR_WEIGHTS[kind] || 0), 0
    ) / total * 100,
    counters: { ...errorCounters },
  };
}

let hystTarget = null;
let hystSince = 0;
const HYST_ESCALATION_MS = 15000;
const HYST_RECOVERY_MS = 90000;

const PRIORITY = { TRADING: 1, FINANCIAL: 2, TOKEN_STATE: 3, QUEUE_PROCESSING: 4, SOCIAL: 5, UI_REALTIME: 6 };

function logTransition(from, to, reason) {
  const entry = { from, to, reason, ts: new Date().toISOString(), gpi: state.gpi };
  state.history.push(entry);
  if (state.history.length > 500) state.history = state.history.slice(-500);
  console.warn(JSON.stringify({ event: "INFRA_STATE_CHANGE", ...entry }));
}

function applyNormal() {
  state.cache.enabled = false;
  state.cache.feedTTL = 0;
  state.cache.profileTTL = 0;
  state.cache.tokenTTL = 0;
  state.batch.enabled = false;
  state.feedRefreshMs = 3000;
  state.realtimeEnabled = true;
  state.socialWritesAllowed = true;
  state.tradingAllowed = true;
  state.queueSocialWrites = false;
  state.dbWriteReduction = 0;
  state.aggressiveBatching = false;
}

function applyStress() {
  state.cache.enabled = true;
  state.cache.feedTTL = 12000;
  state.cache.profileTTL = 30000;
  state.cache.tokenTTL = 5000;
  state.batch.enabled = true;
  state.feedRefreshMs = 10000;
  state.realtimeEnabled = true;
  state.socialWritesAllowed = true;
  state.tradingAllowed = true;
  state.queueSocialWrites = false;
  state.dbWriteReduction = 0;
  state.aggressiveBatching = false;
}

function applyCritical() {
  state.cache.enabled = true;
  state.cache.feedTTL = 30000;
  state.cache.profileTTL = 60000;
  state.cache.tokenTTL = 10000;
  state.batch.enabled = true;
  state.feedRefreshMs = 30000;
  state.realtimeEnabled = false;
  state.socialWritesAllowed = true;
  state.tradingAllowed = true;
  state.queueSocialWrites = true;
  state.dbWriteReduction = 0;
  state.aggressiveBatching = false;
}

function applyLockdown() {
  state.cache.enabled = true;
  state.cache.feedTTL = 60000;
  state.cache.profileTTL = 120000;
  state.cache.tokenTTL = 30000;
  state.batch.enabled = false;
  state.feedRefreshMs = 60000;
  state.realtimeEnabled = false;
  state.socialWritesAllowed = false;
  state.tradingAllowed = true;
  state.queueSocialWrites = false;
  state.dbWriteReduction = 50;
  state.aggressiveBatching = false;
}

function applyStabilization() {
  state.cache.enabled = true;
  state.cache.feedTTL = 45000;
  state.cache.profileTTL = 90000;
  state.cache.tokenTTL = 15000;
  state.batch.enabled = true;
  state.feedRefreshMs = 45000;
  state.realtimeEnabled = false;
  state.socialWritesAllowed = false;
  state.tradingAllowed = true;
  state.queueSocialWrites = true;
  state.dbWriteReduction = 70;
  state.aggressiveBatching = true;
}

function applyHardSafe() {
  state.cache.enabled = true;
  state.cache.feedTTL = 120000;
  state.cache.profileTTL = 300000;
  state.cache.tokenTTL = 60000;
  state.batch.enabled = false;
  state.feedRefreshMs = 120000;
  state.realtimeEnabled = false;
  state.socialWritesAllowed = false;
  state.tradingAllowed = true;
  state.queueSocialWrites = true;
  state.dbWriteReduction = 90;
  state.aggressiveBatching = true;
}

const applyMap = {
  [STATES.NORMAL]: applyNormal,
  [STATES.STRESS]: applyStress,
  [STATES.CRITICAL]: applyCritical,
  [STATES.LOCKDOWN]: applyLockdown,
  [STATES.STABILIZATION]: applyStabilization,
  [STATES.HARD_SAFE]: applyHardSafe,
};

function setState(newState, reason = "manual") {
  if (newState === state.current) return;
  const old = state.current;
  const isDeescalation = STATE_RANK[newState] < STATE_RANK[old];
  state.current = newState;
  state.since = Date.now();
  if (newState === STATES.CRITICAL) {
    state.criticalSince = isDeescalation ? Date.now() : (state.criticalSince || Date.now());
  } else if (newState !== STATES.STABILIZATION) {
    state.criticalSince = null;
  }
  if (newState === STATES.LOCKDOWN) {
    state.lockdownSince = isDeescalation ? Date.now() : (state.lockdownSince || Date.now());
  } else if (newState !== STATES.HARD_SAFE) {
    state.lockdownSince = null;
  }
  applyMap[newState]();
  logTransition(old, newState, reason);
}

export function computeGPI(dbLatencyMs = 0, dbUsagePercent = 0, queueSize = 0) {
  const m = getMetrics();
  const w = state.config.gpiWeights;

  const queueScore = Math.min(100, (queueSize / 500000) * 100);
  const dbLatScore = Math.min(100, (dbLatencyMs / 1000) * 100);
  const ec = getErrorClassification();
  const errScore = Math.min(100, ec.systemErrorRate * 10);
  const rpsScore = Math.min(100, (m.rps || 0) / 100 * 100);
  const connScore = Math.min(100, (dbUsagePercent / 100) * 100);

  const gpi = Math.round(
    queueScore * w.queueSize +
    dbLatScore * w.dbLatency +
    errScore * w.errorRate +
    rpsScore * w.rps +
    connScore * w.connectionSat
  );

  state.gpi = Math.min(100, Math.max(0, gpi));
  state.gpiHistory.push({ gpi: state.gpi, ts: Date.now() });
  if (state.gpiHistory.length > 300) state.gpiHistory = state.gpiHistory.slice(-300);

  return state.gpi;
}

export function evaluateState(dbUsagePercent = 0, dbLatencyMs = 0, queueSize = 0) {
  if (!state.auto) return state.current;
  const m = getMetrics();
  const p95 = m.p95 || 0;
  const now = Date.now();

  const gpi = computeGPI(dbLatencyMs, dbUsagePercent, queueSize);

  emaUpdate("sysErr", getErrorClassification().systemErrorRate);
  emaUpdate("weightedErr", getErrorClassification().weightedErrorRate);
  emaUpdate("p95", p95);
  emaUpdate("dbUse", dbUsagePercent);

  const sysErr = rolling.sysErr;
  const latP95 = rolling.p95;
  const dbUse = rolling.dbUse;
  const cfg = state.config;

  const shouldStress = latP95 > cfg.stressLatencyP95 || sysErr > cfg.stressSysErrRate || dbUse > cfg.stressDbUsage;
  const shouldCrit = dbUse > cfg.criticalDbUsage || sysErr > cfg.criticalSysErrRate || queueSize > cfg.criticalQueueSize;
  const shouldLock = sysErr > cfg.lockdownSysErrRate;

  let candidate = state.current;

  if (state.current === STATES.NORMAL && shouldStress) candidate = STATES.STRESS;
  if ((state.current === STATES.NORMAL || state.current === STATES.STRESS) && shouldCrit) candidate = STATES.CRITICAL;
  if (state.current === STATES.CRITICAL) {
    state.criticalSince = state.criticalSince || now;
    if (now - state.criticalSince > cfg.stabilizationAfterCriticalSec * 1000) candidate = STATES.STABILIZATION;
  }
  if ((state.current === STATES.CRITICAL || state.current === STATES.STABILIZATION) && shouldLock) candidate = STATES.LOCKDOWN;
  if (state.current === STATES.LOCKDOWN) {
    state.lockdownSince = state.lockdownSince || now;
    if (now - state.lockdownSince > cfg.hardSafeAfterLockdownSec * 1000) candidate = STATES.HARD_SAFE;
  }

  if (candidate === state.current) {
    if (state.current === STATES.HARD_SAFE && !shouldLock) candidate = STATES.LOCKDOWN;
    else if (state.current === STATES.LOCKDOWN && !shouldCrit) candidate = STATES.CRITICAL;
    else if ((state.current === STATES.CRITICAL || state.current === STATES.STABILIZATION) && !shouldStress) candidate = STATES.STRESS;
    else if (state.current === STATES.STRESS && !shouldStress) candidate = STATES.NORMAL;
  }

  if (candidate !== state.current) {
    const isEscalation = STATE_RANK[candidate] > STATE_RANK[state.current];
    const holdMs = isEscalation ? HYST_ESCALATION_MS : HYST_RECOVERY_MS;

    if (hystTarget === candidate) {
      if (now - hystSince >= holdMs) {
        setState(candidate, `auto: sysErr=${sysErr.toFixed(1)}% p95=${latP95.toFixed(0)}ms dbUse=${dbUse.toFixed(0)}% q=${queueSize} gpi=${gpi}`);
        hystTarget = null;
      }
    } else {
      hystTarget = candidate;
      hystSince = now;
    }
  } else {
    hystTarget = null;
  }

  return state.current;
}

export function forceState(newState, reason = "admin_override") {
  state.auto = false;
  setState(newState, reason);
}

export function enableAutoState() {
  state.auto = true;
}

export function getSystemState() {
  const ec = getErrorClassification();
  return {
    state: state.current,
    since: new Date(state.since).toISOString(),
    uptimeInState: Math.round((Date.now() - state.since) / 1000),
    auto: state.auto,
    gpi: state.gpi,
    gpiHistory: state.gpiHistory.slice(-60),
    cache: { ...state.cache },
    feedRefreshMs: state.feedRefreshMs,
    realtimeEnabled: state.realtimeEnabled,
    socialWritesAllowed: state.socialWritesAllowed,
    tradingAllowed: state.tradingAllowed,
    queueSocialWrites: state.queueSocialWrites,
    batchEnabled: state.batch.enabled,
    dbWriteReduction: state.dbWriteReduction,
    aggressiveBatching: state.aggressiveBatching,
    config: { ...state.config },
    history: state.history.slice(-50),
    errorClassification: ec,
    rollingMetrics: { ...rolling },
  };
}

export function updateConfig(updates) {
  Object.assign(state.config, updates);
}

export function canTrade() {
  return state.tradingAllowed;
}

export function canSocialWrite() {
  return state.socialWritesAllowed;
}

export function shouldQueueSocial() {
  return state.queueSocialWrites;
}

export function isRealtimeEnabled() {
  return state.realtimeEnabled;
}

export function getCacheTTL(type) {
  if (!state.cache.enabled) return 0;
  return state.cache[type + "TTL"] || 0;
}

export function getFeedRefreshMs() {
  return state.feedRefreshMs;
}

export function isBatchEnabled() {
  return state.batch.enabled;
}

export function getDbWriteReduction() {
  return state.dbWriteReduction;
}

export function isAggressiveBatching() {
  return state.aggressiveBatching;
}

export function getGPI() {
  return state.gpi;
}

const responseCache = new Map();
const CACHE_CLEANUP_INTERVAL = 30000;
let lastCacheCleanup = Date.now();

export function getCached(key, ttlMs) {
  if (!state.cache.enabled || ttlMs <= 0) return null;
  const entry = responseCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > ttlMs) {
    responseCache.delete(key);
    return null;
  }
  return entry.data;
}

export function setCache(key, data) {
  if (!state.cache.enabled) return;
  responseCache.set(key, { data, ts: Date.now() });
  if (Date.now() - lastCacheCleanup > CACHE_CLEANUP_INTERVAL) {
    lastCacheCleanup = Date.now();
    for (const [k, v] of responseCache) {
      if (Date.now() - v.ts > 120000) responseCache.delete(k);
    }
  }
}

export function operationPriority(type) {
  switch (type) {
    case "BUY": case "SELL": return PRIORITY.TRADING;
    case "BALANCE": case "PAYOUT": return PRIORITY.FINANCIAL;
    case "TOKEN_STATE": return PRIORITY.TOKEN_STATE;
    case "QUEUE": return PRIORITY.QUEUE_PROCESSING;
    case "POST": case "LIKE": case "DELETE": case "REPORT": return PRIORITY.SOCIAL;
    case "FEED": case "REALTIME": return PRIORITY.UI_REALTIME;
    default: return PRIORITY.SOCIAL;
  }
}

export function shouldThrottle(opType) {
  const priority = operationPriority(opType);
  if (state.current === STATES.HARD_SAFE && priority > PRIORITY.TRADING) return true;
  if (state.current === STATES.STABILIZATION && priority >= PRIORITY.UI_REALTIME) return true;
  if (state.current === STATES.LOCKDOWN && priority >= PRIORITY.SOCIAL) return true;
  if (state.current === STATES.CRITICAL && priority >= PRIORITY.UI_REALTIME) return true;
  return false;
}

export function getLogSampleRate() {
  switch (state.current) {
    case STATES.NORMAL: return 1.0;
    case STATES.STRESS: return 0.5;
    case STATES.CRITICAL: return 0.2;
    case STATES.STABILIZATION: return 0.15;
    case STATES.LOCKDOWN: return 0.1;
    case STATES.HARD_SAFE: return 0.1;
    default: return 1.0;
  }
}

export function getUxHints() {
  const hints = {
    systemState: state.current,
    gpi: state.gpi,
    tradingAvailable: state.tradingAllowed,
    socialAvailable: state.socialWritesAllowed,
    realtimeActive: state.realtimeEnabled,
    feedRefreshMs: state.feedRefreshMs,
    messages: [],
  };

  switch (state.current) {
    case STATES.STRESS:
      hints.messages.push({ type: "info", text: "System is under heavy load. Some actions may be delayed." });
      break;
    case STATES.CRITICAL:
      hints.messages.push({ type: "warning", text: "System is under heavy load. Your action is queued for processing." });
      hints.messages.push({ type: "info", text: "Trading executing normally." });
      break;
    case STATES.STABILIZATION:
      hints.messages.push({ type: "warning", text: "System is stabilizing. Social features temporarily queued." });
      hints.messages.push({ type: "info", text: "Trading executing normally." });
      break;
    case STATES.LOCKDOWN:
      hints.messages.push({ type: "danger", text: "System under maintenance. Feed is read-only." });
      hints.messages.push({ type: "info", text: "Trading remains available." });
      break;
    case STATES.HARD_SAFE:
      hints.messages.push({ type: "danger", text: "Emergency mode active. Only trading operations available." });
      hints.messages.push({ type: "warning", text: "Social features will resume when system recovers." });
      break;
  }

  return hints;
}

export { STATES, PRIORITY };
