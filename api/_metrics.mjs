const metrics = {
  requests: 0,
  errors: 0,
  latencies: [],
  totalVolumeWLD: 0,
  trades: 0,
  buys: 0,
  sells: 0,
  buyVolumeWLD: 0,
  sellVolumeWLD: 0,
  buyFees: 0,
  sellFees: 0,
  occConflicts: 0,
  partialPayouts: 0,
  likes: 0,
  posts: 0,
  deletes: 0,
  rejectedTx: { insufficient_balance: 0, max_buy_exceeded: 0, max_sell_exceeded: 0, creator_locked: 0, banned: 0, other: 0 },
  idempotencyConflicts: 0,
  failedTrades1m: [],
  startTime: Date.now(),
  tradingPaused: false,
  frozenTokens: new Set(),
  readOnlyMode: false,
  degradedMode: false,
  alertHistory: [],
};

const MAX_LATENCIES = 1000;
const WINDOW_1M = 60000;

export function trackRequest(latencyMs, isError = false) {
  metrics.requests++;
  if (isError) metrics.errors++;
  metrics.latencies.push(latencyMs);
  if (metrics.latencies.length > MAX_LATENCIES) {
    metrics.latencies = metrics.latencies.slice(-MAX_LATENCIES);
  }
}

export function trackTrade(volumeWld, type = "buy", fee = 0) {
  metrics.trades++;
  metrics.totalVolumeWLD += volumeWld;
  if (type === "buy") { metrics.buys++; metrics.buyVolumeWLD += volumeWld; metrics.buyFees += fee; }
  else { metrics.sells++; metrics.sellVolumeWLD += volumeWld; metrics.sellFees += fee; }
}

export function trackOccConflict() { metrics.occConflicts++; }
export function trackPartialPayout() { metrics.partialPayouts++; }
export function trackIdempotencyConflict() { metrics.idempotencyConflicts++; }
export function trackLike() { metrics.likes++; }
export function trackPost() { metrics.posts++; }
export function trackDelete() { metrics.deletes++; }

export function trackFailedTrade(reason = "other") {
  metrics.failedTrades1m.push(Date.now());
  if (metrics.rejectedTx[reason] !== undefined) metrics.rejectedTx[reason]++;
  else metrics.rejectedTx.other++;
}

function percentile(arr, p) {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.floor(sorted.length * p);
  return sorted[Math.min(idx, sorted.length - 1)];
}

export function getMetrics() {
  const now = Date.now();
  metrics.failedTrades1m = metrics.failedTrades1m.filter(t => now - t < WINDOW_1M);
  const uptimeSec = Math.floor((now - metrics.startTime) / 1000);
  const rps = uptimeSec > 0 ? (metrics.requests / uptimeSec).toFixed(2) : 0;
  const tps = uptimeSec > 0 ? (metrics.trades / uptimeSec).toFixed(3) : 0;

  return {
    requests: metrics.requests,
    errors: metrics.errors,
    errorRate: metrics.requests > 0 ? ((metrics.errors / metrics.requests) * 100).toFixed(2) + "%" : "0%",
    errorRateNum: metrics.requests > 0 ? (metrics.errors / metrics.requests) * 100 : 0,
    avgLatency: metrics.latencies.length > 0 ? Math.round(metrics.latencies.reduce((a, b) => a + b, 0) / metrics.latencies.length) : 0,
    p50: percentile(metrics.latencies, 0.5),
    p95: percentile(metrics.latencies, 0.95),
    p99: percentile(metrics.latencies, 0.99),
    rps: Number(rps),
    tps: Number(tps),
    totalVolumeWLD: metrics.totalVolumeWLD,
    trades: metrics.trades,
    buys: metrics.buys,
    sells: metrics.sells,
    buyVolumeWLD: metrics.buyVolumeWLD,
    sellVolumeWLD: metrics.sellVolumeWLD,
    buyFees: metrics.buyFees,
    sellFees: metrics.sellFees,
    totalFees: metrics.buyFees + metrics.sellFees,
    occConflicts: metrics.occConflicts,
    partialPayouts: metrics.partialPayouts,
    idempotencyConflicts: metrics.idempotencyConflicts,
    likes: metrics.likes,
    posts: metrics.posts,
    deletes: metrics.deletes,
    failedTrades1m: metrics.failedTrades1m.length,
    rejectedTx: { ...metrics.rejectedTx },
    uptime: uptimeSec,
    tradingPaused: metrics.tradingPaused,
    frozenTokens: [...metrics.frozenTokens],
    readOnlyMode: metrics.readOnlyMode,
    degradedMode: metrics.degradedMode,
  };
}

export function triggerAlert(type, data) {
  const alert = { type, ...data, timestamp: new Date().toISOString() };
  console.warn(JSON.stringify({ event: "ALERT", ...alert }));
  metrics.alertHistory.push(alert);
  if (metrics.alertHistory.length > 200) metrics.alertHistory = metrics.alertHistory.slice(-200);
  return alert;
}

export function checkAlerts(m) {
  const alerts = [];
  const errRate = m.errorRateNum || 0;
  if (errRate > 5) alerts.push(triggerAlert("HIGH_ERROR_RATE", { severity: "critical", errorRate: errRate.toFixed(2) + "%" }));
  if (m.p95 > 250) alerts.push(triggerAlert("HIGH_LATENCY_P95", { severity: m.p95 > 500 ? "critical" : "warning", p95: m.p95 + "ms" }));
  if (m.failedTrades1m > 50) alerts.push(triggerAlert("TRADE_FAILURE_SPIKE", { severity: "critical", count: m.failedTrades1m }));
  if (m.idempotencyConflicts > 20) alerts.push(triggerAlert("IDEMPOTENCY_SPIKE", { severity: "warning", count: m.idempotencyConflicts }));
  if (m.partialPayouts > 20) alerts.push(triggerAlert("PARTIAL_PAYOUT_SPIKE", { severity: "warning", count: m.partialPayouts }));
  return alerts;
}

export function getAlertHistory() { return [...metrics.alertHistory]; }

export function setTradingPaused(v) { metrics.tradingPaused = v; }
export function isTradingPaused() { return metrics.tradingPaused; }
export function freezeToken(tokenId) { metrics.frozenTokens.add(tokenId); }
export function unfreezeToken(tokenId) { metrics.frozenTokens.delete(tokenId); }
export function isTokenFrozen(tokenId) { return metrics.frozenTokens.has(tokenId); }
export function setReadOnlyMode(v) { metrics.readOnlyMode = v; }
export function isReadOnlyMode() { return metrics.readOnlyMode; }
export function setDegradedMode(v) { metrics.degradedMode = v; }
export function isDegradedMode() { return metrics.degradedMode; }

export default metrics;
