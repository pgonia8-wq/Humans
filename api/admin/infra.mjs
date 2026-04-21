import { createClient } from "@supabase/supabase-js";
import { verifyAdmin } from "./_auth.mjs";
import { getSystemState, forceState, enableAutoState, updateConfig, evaluateState, STATES, getGPI, getUxHints } from "../_infra.mjs";
import { getQueueStats, startWorker, stopWorker, drainQueue, getEstimatedQueueSize } from "../_queue.mjs";
import { queryLogs, forceFlush, getBufferStats } from "../_tracer.mjs";
import { getRateLimitStats } from "../lib/rateLimiter.adapter.mjs";
import { getMetrics } from "../_metrics.mjs";
import { getBreakerStatus, resetBreaker, SUBSYSTEMS } from "../_circuitBreaker.mjs";

const supabase = createClient(
  process.env.SUPABASE_URL ?? "",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
);

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-admin-key");
  if (req.method === "OPTIONS") return res.status(200).end();

  if (!verifyAdmin(req)) return res.status(401).json({ error: "Unauthorized" });

  if (req.method === "GET") {
    const m = getMetrics();
    const infraState = getSystemState();
    let queueStats = {};
    try { queueStats = await getQueueStats(); } catch {}
    const traceStats = getBufferStats();
    const rateLimitStats = getRateLimitStats();
    const circuitBreakers = getBreakerStatus();

    return res.status(200).json({
      system: infraState,
      gpi: infraState.gpi,
      gpiHistory: infraState.gpiHistory,
      metrics: {
        requests: m.requests,
        errors: m.errors,
        errorRate: m.errorRate,
        errorRateNum: m.errorRateNum,
        p50: m.p50,
        p95: m.p95,
        p99: m.p99,
        rps: m.rps,
        tps: m.tps,
        failedTrades1m: m.failedTrades1m,
      },
      queue: queueStats,
      tracing: traceStats,
      rateLimit: rateLimitStats,
      circuitBreakers,
      uxHints: getUxHints(),
      stateTransitions: infraState.history,
    });
  }

  if (req.method === "POST") {
    const { action, ...params } = req.body || {};

    switch (action) {
      case "force_state": {
        const validStates = Object.values(STATES);
        if (!validStates.includes(params.state)) {
          return res.status(400).json({ error: "Invalid state. Valid: " + validStates.join(", ") });
        }
        forceState(params.state, params.reason || "admin_override");
        supabase.from("admin_logs").insert({
          category: "infra", event: "force_state", severity: "warning",
          endpoint: "/api/admin/infra",
          details: { state: params.state, reason: params.reason },
        }).catch(() => {});
        return res.status(200).json({ success: true, state: getSystemState() });
      }

      case "enable_auto": {
        enableAutoState();
        supabase.from("admin_logs").insert({
          category: "infra", event: "enable_auto_state", severity: "info",
          endpoint: "/api/admin/infra",
        }).catch(() => {});
        return res.status(200).json({ success: true, state: getSystemState() });
      }

      case "update_config": {
        updateConfig(params.config || {});
        return res.status(200).json({ success: true, config: getSystemState().config });
      }

      case "start_worker": {
        startWorker(params.intervalMs);
        return res.status(200).json({ success: true, message: "Queue worker started" });
      }

      case "stop_worker": {
        stopWorker();
        return res.status(200).json({ success: true, message: "Queue worker stopped" });
      }

      case "drain_queue": {
        const drained = await drainQueue();
        return res.status(200).json({ success: true, drained });
      }

      case "flush_traces": {
        await forceFlush();
        return res.status(200).json({ success: true, message: "Trace buffer flushed" });
      }

      case "query_logs": {
        const result = await queryLogs(params);
        return res.status(200).json(result);
      }

      case "evaluate": {
        const newState = evaluateState(params.dbUsagePercent || 0, params.dbLatencyMs || 0, params.queueSize || 0);
        return res.status(200).json({ state: newState, system: getSystemState(), gpi: getGPI() });
      }

      case "reset_breaker": {
        if (!params.subsystem || !Object.values(SUBSYSTEMS).includes(params.subsystem)) {
          return res.status(400).json({ error: "Invalid subsystem. Valid: " + Object.values(SUBSYSTEMS).join(", ") });
        }
        resetBreaker(params.subsystem);
        supabase.from("admin_logs").insert({
          category: "infra", event: "reset_breaker", severity: "info",
          endpoint: "/api/admin/infra",
          details: { subsystem: params.subsystem },
        }).catch(() => {});
        return res.status(200).json({ success: true, breaker: getBreakerStatus(params.subsystem) });
      }

      case "breaker_status": {
        return res.status(200).json({ breakers: getBreakerStatus(params.subsystem) });
      }

      default:
        return res.status(400).json({ error: "Unknown action: " + action, validActions: [
          "force_state", "enable_auto", "update_config",
          "start_worker", "stop_worker", "drain_queue",
          "flush_traces", "query_logs", "evaluate",
          "reset_breaker", "breaker_status",
        ]});
    }
  }

  return res.status(405).json({ error: "GET or POST only" });
}
