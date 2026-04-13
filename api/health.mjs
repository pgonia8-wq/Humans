import { createClient } from "@supabase/supabase-js";
import { getMetrics, checkAlerts } from "./_metrics.mjs";
import { getSystemState, evaluateState } from "./_infra.mjs";
import { getQueueStats } from "./_queue.mjs";
import { getBufferStats } from "./_tracer.mjs";
import { getRateLimitStats } from "./_smartRate.mjs";

const supabase = createClient(
  process.env.SUPABASE_URL ?? "",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
);

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const t0 = Date.now();
    const { count: dbCheck, error } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true });
    const dbLatency = Date.now() - t0;

    const dbOk = !error;
    const dbUsageEstimate = dbOk ? Math.min(Math.round((dbLatency / 500) * 100), 100) : 100;
    evaluateState(dbUsageEstimate);

    const m = getMetrics();
    const alerts = checkAlerts(m);
    const infraState = getSystemState();

    let status = "ok";
    if (!dbOk) status = "critical";
    else if (dbLatency > 500 || m.p95 > 500) status = "degraded";
    if (m.errorRateNum > 5) status = "critical";
    if (m.tradingPaused || m.readOnlyMode) status = "degraded";
    if (infraState.state === "CRITICAL") status = "critical";
    if (infraState.state === "LOCKDOWN") status = "critical";

    const adminSecret = process.env.ADMIN_SECRET;
    const authHeader = req.headers?.authorization;
    const isAdmin = adminSecret && authHeader === `Bearer ${adminSecret}`;

    const publicResponse = {
      status,
      db: { connected: dbOk, latency_ms: dbLatency },
      timestamp: new Date().toISOString(),
    };

    if (!isAdmin) {
      return res.status(200).json(publicResponse);
    }

    let queueStats = {};
    let traceStats = {};
    let rateLimitStats = {};
    try { queueStats = await getQueueStats(); } catch {}
    try { traceStats = getBufferStats(); } catch {}
    try { rateLimitStats = getRateLimitStats(); } catch {}

    return res.status(200).json({
      ...publicResponse,
      systemState: infraState.state,
      systemStateSince: infraState.since,
      systemStateAuto: infraState.auto,
      uptime: m.uptime,
      requests: m.requests,
      errors: m.errors,
      errorRate: m.errorRate,
      errorRateNum: m.errorRateNum,
      avgLatency: m.avgLatency,
      p50: m.p50,
      p95: m.p95,
      p99: m.p99,
      rps: m.rps,
      tps: m.tps,
      trades: m.trades,
      buys: m.buys,
      sells: m.sells,
      totalVolumeWLD: m.totalVolumeWLD,
      buyVolumeWLD: m.buyVolumeWLD,
      sellVolumeWLD: m.sellVolumeWLD,
      buyFees: m.buyFees,
      sellFees: m.sellFees,
      totalFees: m.totalFees,
      occConflicts: m.occConflicts,
      partialPayouts: m.partialPayouts,
      idempotencyConflicts: m.idempotencyConflicts,
      likes: m.likes,
      posts: m.posts,
      deletes: m.deletes,
      failedTrades1m: m.failedTrades1m,
      rejectedTx: m.rejectedTx,
      tradingPaused: m.tradingPaused,
      frozenTokens: m.frozenTokens,
      readOnlyMode: m.readOnlyMode,
      degradedMode: m.degradedMode,
      db: { connected: dbOk, latency_ms: dbLatency, users: dbCheck || 0, usageEstimate: dbUsageEstimate },
      infra: {
        state: infraState.state,
        since: infraState.since,
        auto: infraState.auto,
        cache: infraState.cache,
        feedRefreshMs: infraState.feedRefreshMs,
        realtimeEnabled: infraState.realtimeEnabled,
        socialWritesAllowed: infraState.socialWritesAllowed,
        tradingAllowed: infraState.tradingAllowed,
        queueSocialWrites: infraState.queueSocialWrites,
        batchEnabled: infraState.batchEnabled,
      },
      queue: queueStats,
      tracing: traceStats,
      rateLimit: rateLimitStats,
      alerts: alerts.length > 0 ? alerts : [],
    });
  } catch (err) {
    return res.status(500).json({ status: "critical", error: err.message });
  }
}
