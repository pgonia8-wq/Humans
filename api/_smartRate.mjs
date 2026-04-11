const userWindows = new Map();
const payloadHashes = new Map();
const burstTracker = new Map();
const tradingLoops = new Map();
const trustScores = new Map();

const BASE_LIMITS = {
  like: { perSec: 10, perMin: 120 },
  post: { perSec: 2, perMin: 30 },
  trade: { perSec: 3, perMin: 60 },
  delete: { perSec: 1, perMin: 15 },
  default: { perSec: 5, perMin: 100 },
};

const TRUST_TIERS = {
  new: { multiplier: 0.5, burstLimit: 5 },
  normal: { multiplier: 1.0, burstLimit: 8 },
  verified: { multiplier: 1.5, burstLimit: 12 },
  premium: { multiplier: 2.0, burstLimit: 15 },
};

const CLEANUP_INTERVAL = 120000;
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [k, v] of userWindows) {
    if (now - v.windowStart > 120000) userWindows.delete(k);
  }
  for (const [k, v] of payloadHashes) {
    if (now - v.lastSeen > 60000) payloadHashes.delete(k);
  }
  for (const [k, v] of burstTracker) {
    if (now - v.lastAction > 10000) burstTracker.delete(k);
  }
  for (const [k, v] of tradingLoops) {
    if (now - v.lastTrade > 60000) tradingLoops.delete(k);
  }
}

export function setUserTrust(userId, tier) {
  if (TRUST_TIERS[tier]) {
    trustScores.set(userId, tier);
  }
}

function getUserTrust(userId) {
  const tier = trustScores.get(userId) || "normal";
  return TRUST_TIERS[tier] || TRUST_TIERS.normal;
}

function hashPayload(payload) {
  if (!payload) return "";
  const str = typeof payload === "string" ? payload : JSON.stringify(payload);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return hash.toString(36);
}

export function smartRateLimit(userId, opType, payload = null) {
  cleanup();
  const now = Date.now();
  const limits = BASE_LIMITS[opType] || BASE_LIMITS.default;
  const trust = getUserTrust(userId);
  const effectivePerSec = Math.ceil(limits.perSec * trust.multiplier);
  const effectivePerMin = Math.ceil(limits.perMin * trust.multiplier);

  const key = `${userId}:${opType}`;
  let window = userWindows.get(key);
  if (!window || now - window.windowStart > 60000) {
    window = { windowStart: now, secStart: now, secCount: 0, minCount: 0 };
    userWindows.set(key, window);
  }

  if (now - window.secStart > 1000) {
    window.secStart = now;
    window.secCount = 0;
  }
  window.secCount++;
  window.minCount++;

  if (window.secCount > effectivePerSec) {
    return { limited: true, reason: "rate_per_second", retryAfterMs: 1000 };
  }
  if (window.minCount > effectivePerMin) {
    return { limited: true, reason: "rate_per_minute", retryAfterMs: Math.max(0, 60000 - (now - window.windowStart)) };
  }

  const burstKey = userId;
  let burst = burstTracker.get(burstKey);
  if (!burst) {
    burst = { actions: [], lastAction: now };
    burstTracker.set(burstKey, burst);
  }
  burst.actions = burst.actions.filter(t => now - t < 1000);
  burst.actions.push(now);
  burst.lastAction = now;
  if (burst.actions.length > trust.burstLimit) {
    return { limited: true, reason: "burst_spam", retryAfterMs: 2000 };
  }

  if (payload) {
    const hash = hashPayload(payload);
    const phKey = `${userId}:${hash}`;
    const existing = payloadHashes.get(phKey);
    if (existing) {
      existing.count++;
      existing.lastSeen = now;
      if (existing.count > 3 && now - existing.firstSeen < 30000) {
        return { limited: true, reason: "duplicate_payload", retryAfterMs: 5000 };
      }
    } else {
      payloadHashes.set(phKey, { count: 1, firstSeen: now, lastSeen: now });
    }
  }

  return { limited: false };
}

export function detectTradingLoop(userId, tradeType) {
  const now = Date.now();
  let tracker = tradingLoops.get(userId);
  if (!tracker) {
    tracker = { trades: [], lastTrade: now };
    tradingLoops.set(userId, tracker);
  }

  tracker.trades = tracker.trades.filter(t => now - t.ts < 60000);
  tracker.trades.push({ type: tradeType, ts: now });
  tracker.lastTrade = now;

  const recent = tracker.trades;
  if (recent.length < 4) return { looping: false };

  let switches = 0;
  for (let i = 1; i < recent.length; i++) {
    if (recent[i].type !== recent[i - 1].type) switches++;
  }

  if (switches >= 3 && recent.length >= 4) {
    return { looping: true, reason: "rapid_buy_sell_loop", switchCount: switches, tradeCount: recent.length };
  }

  return { looping: false };
}

export function getRateLimitStats() {
  return {
    activeUsers: userWindows.size,
    trackedPayloads: payloadHashes.size,
    burstTracking: burstTracker.size,
    tradingLoops: tradingLoops.size,
    trustScores: trustScores.size,
  };
}
