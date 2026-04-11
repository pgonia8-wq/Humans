import { adminAuth, cors, writeLog } from "./_auth.mjs";
import {
  setTradingPaused, isTradingPaused,
  freezeToken, unfreezeToken, isTokenFrozen,
  setReadOnlyMode, isReadOnlyMode,
  setDegradedMode, isDegradedMode,
  getMetrics, getAlertHistory,
} from "../../api/_metrics.mjs";

export default async function handler(req, res) {
  cors(res, req);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (!adminAuth(req, res)) return;

  if (req.method === "GET") {
    const m = getMetrics();
    return res.status(200).json({
      tradingPaused: m.tradingPaused,
      frozenTokens: m.frozenTokens,
      readOnlyMode: m.readOnlyMode,
      degradedMode: m.degradedMode,
      alertHistory: getAlertHistory().slice(-50),
    });
  }

  if (req.method === "POST") {
    const { action, tokenId, reason } = req.body || {};
    if (!action) return res.status(400).json({ error: "Missing action" });

    const logBase = { category: "admin_action", severity: "critical", endpoint: "/api/admin/incidents" };

    switch (action) {
      case "pause_trading":
        setTradingPaused(true);
        await writeLog({ ...logBase, event: "trading_paused", details: { reason } });
        return res.status(200).json({ success: true, result: "trading_paused" });

      case "resume_trading":
        setTradingPaused(false);
        await writeLog({ ...logBase, event: "trading_resumed", severity: "warning", details: { reason } });
        return res.status(200).json({ success: true, result: "trading_resumed" });

      case "freeze_token":
        if (!tokenId) return res.status(400).json({ error: "Missing tokenId" });
        freezeToken(tokenId);
        await writeLog({ ...logBase, event: "token_frozen", details: { tokenId, reason } });
        return res.status(200).json({ success: true, result: "token_frozen", tokenId });

      case "unfreeze_token":
        if (!tokenId) return res.status(400).json({ error: "Missing tokenId" });
        unfreezeToken(tokenId);
        await writeLog({ ...logBase, event: "token_unfrozen", severity: "warning", details: { tokenId, reason } });
        return res.status(200).json({ success: true, result: "token_unfrozen", tokenId });

      case "enable_readonly":
        setReadOnlyMode(true);
        await writeLog({ ...logBase, event: "readonly_enabled", details: { reason } });
        return res.status(200).json({ success: true, result: "readonly_enabled" });

      case "disable_readonly":
        setReadOnlyMode(false);
        await writeLog({ ...logBase, event: "readonly_disabled", severity: "warning", details: { reason } });
        return res.status(200).json({ success: true, result: "readonly_disabled" });

      case "enable_degraded":
        setDegradedMode(true);
        await writeLog({ ...logBase, event: "degraded_mode_enabled", details: { reason } });
        return res.status(200).json({ success: true, result: "degraded_enabled" });

      case "disable_degraded":
        setDegradedMode(false);
        await writeLog({ ...logBase, event: "degraded_mode_disabled", severity: "warning", details: { reason } });
        return res.status(200).json({ success: true, result: "degraded_disabled" });

      default:
        return res.status(400).json({ error: "Unknown action" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
