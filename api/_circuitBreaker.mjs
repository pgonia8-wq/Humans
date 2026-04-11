const breakers = {};

const SUBSYSTEMS = {
  TRADING: "TRADING",
  SOCIAL: "SOCIAL",
  DB: "DB",
  EXTERNAL_API: "EXTERNAL_API",
};

const BREAKER_STATES = { CLOSED: "CLOSED", OPEN: "OPEN", HALF_OPEN: "HALF_OPEN" };

const DEFAULT_CONFIG = {
  TRADING: { failureThreshold: 5, windowMs: 60000, cooldownMs: 30000, halfOpenMax: 3, halfOpenFailRatio: 0.35 },
  SOCIAL: { failureThreshold: 10, windowMs: 60000, cooldownMs: 20000, halfOpenMax: 5, halfOpenFailRatio: 0.35 },
  DB: { failureThreshold: 3, windowMs: 30000, cooldownMs: 15000, halfOpenMax: 2, halfOpenFailRatio: 0.35, latencyThresholdMs: 500, connectionThreshold: 85 },
  EXTERNAL_API: { failureThreshold: 5, windowMs: 60000, cooldownMs: 45000, halfOpenMax: 3, halfOpenFailRatio: 0.35 },
};

function getBreaker(subsystem) {
  if (!breakers[subsystem]) {
    breakers[subsystem] = {
      state: BREAKER_STATES.CLOSED,
      failures: [],
      successes: 0,
      halfOpenAttempts: 0,
      halfOpenFailures: 0,
      lastFailure: null,
      lastStateChange: Date.now(),
      totalTrips: 0,
      config: DEFAULT_CONFIG[subsystem] || DEFAULT_CONFIG.SOCIAL,
      actions: [],
    };
  }
  return breakers[subsystem];
}

export function recordSuccess(subsystem) {
  const b = getBreaker(subsystem);
  if (b.state === BREAKER_STATES.HALF_OPEN) {
    b.successes++;
    b.halfOpenAttempts++;
    if (b.successes >= b.config.halfOpenMax) {
      const failRatio = b.halfOpenAttempts > 0 ? b.halfOpenFailures / b.halfOpenAttempts : 0;
      if (failRatio <= b.config.halfOpenFailRatio) {
        b.state = BREAKER_STATES.CLOSED;
        b.failures = [];
        b.successes = 0;
        b.halfOpenAttempts = 0;
        b.halfOpenFailures = 0;
        b.lastStateChange = Date.now();
        logAction(b, "CLOSED", `half-open succeeded (failRatio=${(failRatio * 100).toFixed(0)}%)`);
      }
    }
  }
}

export function recordFailure(subsystem, error = "") {
  const b = getBreaker(subsystem);
  const now = Date.now();

  b.failures = b.failures.filter(f => now - f < b.config.windowMs);
  b.failures.push(now);
  b.lastFailure = now;

  if (b.state === BREAKER_STATES.HALF_OPEN) {
    b.halfOpenAttempts++;
    b.halfOpenFailures++;
    const failRatio = b.halfOpenAttempts > 0 ? b.halfOpenFailures / b.halfOpenAttempts : 1;
    if (failRatio > b.config.halfOpenFailRatio && b.halfOpenAttempts >= 3) {
      b.state = BREAKER_STATES.OPEN;
      b.lastStateChange = now;
      b.successes = 0;
      b.halfOpenAttempts = 0;
      b.halfOpenFailures = 0;
      logAction(b, "OPEN", `half-open failed: ratio=${(failRatio * 100).toFixed(0)}% — ${error}`);
    }
    return;
  }

  if (b.state === BREAKER_STATES.CLOSED && b.failures.length >= b.config.failureThreshold) {
    b.state = BREAKER_STATES.OPEN;
    b.lastStateChange = now;
    b.totalTrips++;
    logAction(b, "OPEN", `threshold reached: ${b.failures.length} failures in ${b.config.windowMs}ms — ${error}`);
  }
}

export function canExecute(subsystem) {
  const b = getBreaker(subsystem);
  const now = Date.now();

  if (b.state === BREAKER_STATES.CLOSED) return { allowed: true, state: b.state };

  if (b.state === BREAKER_STATES.OPEN) {
    if (now - b.lastStateChange >= b.config.cooldownMs) {
      b.state = BREAKER_STATES.HALF_OPEN;
      b.lastStateChange = now;
      b.successes = 0;
      b.halfOpenAttempts = 0;
      b.halfOpenFailures = 0;
      logAction(b, "HALF_OPEN", "cooldown elapsed, testing");
      return { allowed: true, state: b.state };
    }
    return { allowed: false, state: b.state, retryAfterMs: b.config.cooldownMs - (now - b.lastStateChange) };
  }

  return { allowed: true, state: b.state };
}

export function checkDbBreaker(latencyMs, connectionPercent) {
  const b = getBreaker(SUBSYSTEMS.DB);
  if (latencyMs > b.config.latencyThresholdMs) {
    recordFailure(SUBSYSTEMS.DB, `latency=${latencyMs}ms`);
    return { cacheFirst: true, blockSocialWrites: connectionPercent > b.config.connectionThreshold };
  }
  if (connectionPercent > b.config.connectionThreshold) {
    recordFailure(SUBSYSTEMS.DB, `connections=${connectionPercent}%`);
    return { cacheFirst: false, blockSocialWrites: true };
  }
  recordSuccess(SUBSYSTEMS.DB);
  return { cacheFirst: false, blockSocialWrites: false };
}

function logAction(b, newState, reason) {
  const entry = { state: newState, reason, ts: new Date().toISOString() };
  b.actions.push(entry);
  if (b.actions.length > 100) b.actions = b.actions.slice(-100);
  console.warn(JSON.stringify({ event: "CIRCUIT_BREAKER", subsystem: findSubsystemName(b), ...entry }));
}

function findSubsystemName(b) {
  for (const [name, breaker] of Object.entries(breakers)) {
    if (breaker === b) return name;
  }
  return "UNKNOWN";
}

export function getBreakerStatus(subsystem) {
  if (subsystem) {
    const b = getBreaker(subsystem);
    return {
      subsystem,
      state: b.state,
      failures: b.failures.length,
      failureThreshold: b.config.failureThreshold,
      totalTrips: b.totalTrips,
      lastFailure: b.lastFailure ? new Date(b.lastFailure).toISOString() : null,
      lastStateChange: new Date(b.lastStateChange).toISOString(),
      actions: b.actions.slice(-10),
    };
  }

  const all = {};
  for (const name of Object.values(SUBSYSTEMS)) {
    const b = getBreaker(name);
    all[name] = {
      state: b.state,
      failures: b.failures.length,
      totalTrips: b.totalTrips,
      lastFailure: b.lastFailure ? new Date(b.lastFailure).toISOString() : null,
    };
  }
  return all;
}

export function resetBreaker(subsystem) {
  const b = getBreaker(subsystem);
  b.state = BREAKER_STATES.CLOSED;
  b.failures = [];
  b.successes = 0;
  b.halfOpenAttempts = 0;
  b.halfOpenFailures = 0;
  b.lastStateChange = Date.now();
  logAction(b, "CLOSED", "manual reset");
}

export { SUBSYSTEMS, BREAKER_STATES };
