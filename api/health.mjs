import { createClient } from "@supabase/supabase-js";
import { getMetrics, checkAlerts } from "./_metrics.mjs";

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

    const m = getMetrics();
    const alerts = checkAlerts(m);

    const dbOk = !error;
    let status = "ok";
    if (!dbOk) status = "critical";
    else if (dbLatency > 500 || m.p95 > 500) status = "degraded";
    const errRate = m.requests > 0 ? (m.errors / m.requests) * 100 : 0;
    if (errRate > 5) status = "critical";

    return res.status(200).json({
      status,
      uptime: m.uptime,
      requests: m.requests,
      errors: m.errors,
      errorRate: m.errorRate,
      avgLatency: m.avgLatency,
      p50: m.p50,
      p95: m.p95,
      trades: m.trades,
      totalVolumeWLD: m.totalVolumeWLD,
      occConflicts: m.occConflicts,
      partialPayouts: m.partialPayouts,
      db: { connected: dbOk, latency_ms: dbLatency, users: dbCheck || 0 },
      alerts: alerts.length > 0 ? alerts : [],
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return res.status(500).json({ status: "critical", error: err.message });
  }
}
