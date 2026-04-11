const metrics = {
  requests: 0,
  errors: 0,
  latencies: [],
  totalVolumeWLD: 0,
  trades: 0,
  occConflicts: 0,
  partialPayouts: 0,
  startTime: Date.now(),
};

const MAX_LATENCIES = 500;

export function trackRequest(latencyMs, isError = false) {
  metrics.requests++;
  if (isError) metrics.errors++;
  metrics.latencies.push(latencyMs);
  if (metrics.latencies.length > MAX_LATENCIES) {
    metrics.latencies = metrics.latencies.slice(-MAX_LATENCIES);
  }
}

export function trackTrade(volumeWld) {
  metrics.trades++;
  metrics.totalVolumeWLD += volumeWld;
}

export function trackOccConflict() {
  metrics.occConflicts++;
}

export function trackPartialPayout() {
  metrics.partialPayouts++;
}

export function getMetrics() {
  const sorted = [...metrics.latencies].sort((a, b) => a - b);
  const len = sorted.length;
  return {
    requests: metrics.requests,
    errors: metrics.errors,
    errorRate: metrics.requests > 0 ? ((metrics.errors / metrics.requests) * 100).toFixed(2) + "%" : "0%",
    avgLatency: len > 0 ? Math.round(sorted.reduce((a, b) => a + b, 0) / len) : 0,
    p50: len > 0 ? sorted[Math.floor(len * 0.5)] : 0,
    p95: len > 0 ? sorted[Math.floor(len * 0.95)] : 0,
    totalVolumeWLD: metrics.totalVolumeWLD,
    trades: metrics.trades,
    occConflicts: metrics.occConflicts,
    partialPayouts: metrics.partialPayouts,
    uptime: Math.floor((Date.now() - metrics.startTime) / 1000),
  };
}

export function triggerAlert(type, data) {
  const alert = { type, ...data, timestamp: new Date().toISOString() };
  console.warn(JSON.stringify({ event: "ALERT", ...alert }));
  return alert;
}

export function checkAlerts(m) {
  const alerts = [];
  const errRate = m.requests > 0 ? (m.errors / m.requests) * 100 : 0;
  if (errRate > 5) alerts.push(triggerAlert("HIGH_ERROR_RATE", { errorRate: errRate.toFixed(2) + "%" }));
  if (m.p95 > 500) alerts.push(triggerAlert("HIGH_LATENCY", { p95: m.p95 + "ms" }));
  return alerts;
}

export default metrics;
