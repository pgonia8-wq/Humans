import React, { useState } from "react";

const RULES = [
  { id: "err_rate", label: "Error rate > 5% en 1 min", severity: "critical", icon: "🔴", check: (h: any) => h.errorRateNum > 5, value: (h: any) => `${h.errorRateNum?.toFixed(2)}%` },
  { id: "p95", label: "Latencia P95 > 250ms", severity: "warning", icon: "🟡", check: (h: any) => h.p95 > 250, value: (h: any) => `${h.p95}ms` },
  { id: "p99", label: "Latencia P99 > 500ms", severity: "critical", icon: "🔴", check: (h: any) => h.p99 > 500, value: (h: any) => `${h.p99}ms` },
  { id: "db", label: "DB desconectada", severity: "critical", icon: "🔴", check: (h: any) => h.db && !h.db.connected, value: () => "DOWN" },
  { id: "db_lat", label: "DB latencia > 500ms", severity: "warning", icon: "🟡", check: (h: any) => h.db?.latency_ms > 500, value: (h: any) => `${h.db?.latency_ms}ms` },
  { id: "failed_trades", label: "Trade failures > 50/min", severity: "critical", icon: "🔴", check: (h: any) => h.failedTrades1m > 50, value: (h: any) => `${h.failedTrades1m}/min` },
  { id: "idemp", label: "Idempotency conflicts spike", severity: "warning", icon: "🟡", check: (h: any) => h.idempotencyConflicts > 20, value: (h: any) => `${h.idempotencyConflicts}` },
  { id: "partial", label: "Partial payouts > 20/min", severity: "warning", icon: "🟡", check: (h: any) => h.partialPayouts > 20, value: (h: any) => `${h.partialPayouts}` },
  { id: "occ", label: "OCC conflicts > 10", severity: "warning", icon: "🟡", check: (h: any) => h.occConflicts > 10, value: (h: any) => `${h.occConflicts}` },
  { id: "paused", label: "Trading pausado", severity: "critical", icon: "🛑", check: (h: any) => h.tradingPaused, value: () => "ACTIVE" },
  { id: "readonly", label: "Modo solo lectura", severity: "warning", icon: "⚠️", check: (h: any) => h.readOnlyMode, value: () => "ACTIVE" },
  { id: "degraded", label: "Modo degradado", severity: "warning", icon: "🧯", check: (h: any) => h.degradedMode, value: () => "ACTIVE" },
];

const colorMap: Record<string, { bg: string; border: string; text: string }> = {
  critical: { bg: "#f0505010", border: "#f0505040", text: "#f05050" },
  warning: { bg: "#f7a60610", border: "#f7a60640", text: "#f7a606" },
  info: { bg: "#06d6f710", border: "#06d6f740", text: "#06d6f7" },
};

export default function AlertPanel({ alerts, stats, health }: { alerts: any[]; stats: any; health: any }) {
  const [soundEnabled, setSoundEnabled] = useState(false);
  const h = health || {};

  const triggered = RULES.filter(r => r.check(h)).map(r => ({
    ...r,
    currentValue: r.value(h),
  }));

  const staticAlerts = [...alerts];
  if (stats) {
    const o = stats.overview;
    const t = stats.trading;
    if (t.totalTreasury < 1 && t.totalWldInCurve > 5)
      staticAlerts.push({ type: "critical", msg: `Treasury bajo: ${t.totalTreasury.toFixed(4)} WLD` });
    if (o.pendingReports > 5)
      staticAlerts.push({ type: "warning", msg: `${o.pendingReports} reportes pendientes sin revisar` });
  }

  const allTriggered = triggered.length + staticAlerts.filter(a => a.type === "critical").length;
  const barColor = allTriggered > 0 ? (triggered.some(r => r.severity === "critical") ? "#f05050" : "#f7a606") : "#10f090";

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 8 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "#e0e0e0", margin: 0 }}>Alertas del Sistema</h2>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: barColor, boxShadow: `0 0 12px ${barColor}60` }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: barColor }}>
              {allTriggered === 0 ? "ALL CLEAR" : `${allTriggered} ALERT${allTriggered > 1 ? "S" : ""}`}
            </span>
          </div>
          <button onClick={() => setSoundEnabled(!soundEnabled)}
            style={{ padding: "4px 10px", background: "#1e1e2e", border: "1px solid #2a2a3e", borderRadius: 6, color: "#888", fontSize: 10, cursor: "pointer" }}>
            {soundEnabled ? "🔔 Sound ON" : "🔕 Sound OFF"}
          </button>
        </div>
      </div>

      {triggered.length === 0 && staticAlerts.length === 0 ? (
        <div style={{ background: "#12121a", border: "1px solid #1e1e2e", borderRadius: 14, padding: 60, textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>✅</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: "#10f090" }}>Todo en orden</div>
          <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>No hay alertas activas — sistema operando normalmente</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
          {triggered.map((r, i) => {
            const c = colorMap[r.severity] || colorMap.warning;
            return (
              <div key={i} style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 12, padding: "14px 20px", display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 16 }}>{r.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: c.text }}>{r.label}</div>
                </div>
                <span style={{ fontSize: 14, fontWeight: 700, color: c.text, fontFamily: "monospace" }}>{r.currentValue}</span>
                <span style={{ padding: "2px 8px", borderRadius: 6, fontSize: 9, fontWeight: 700, background: c.bg, border: `1px solid ${c.border}`, color: c.text, textTransform: "uppercase" }}>{r.severity}</span>
              </div>
            );
          })}
          {staticAlerts.map((a, i) => {
            const c = colorMap[a.type] || colorMap.info;
            return (
              <div key={`s${i}`} style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 12, padding: "14px 20px", display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 16 }}>{a.type === "critical" ? "🔴" : a.type === "warning" ? "🟡" : "🔵"}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: c.text }}>{a.msg}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 12 }}>
        {[
          { label: "Requests", value: h.requests, color: "#6366f1" },
          { label: "Errors", value: h.errors, color: "#f05050" },
          { label: "Trades", value: h.trades, color: "#10f090" },
          { label: "RPS", value: h.rps, color: "#06d6f7" },
          { label: "OCC", value: h.occConflicts, color: "#f7a606" },
          { label: "Fails/min", value: h.failedTrades1m, color: "#f05050" },
        ].map((s, i) => (
          <div key={i} style={{ background: "#12121a", border: "1px solid #1e1e2e", borderRadius: 12, padding: 16, textAlign: "center" }}>
            <div style={{ fontSize: 10, color: "#666", marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: s.color, fontVariantNumeric: "tabular-nums" }}>{s.value ?? 0}</div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 24, background: "#12121a", border: "1px solid #1e1e2e", borderRadius: 14, padding: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: "#888", marginBottom: 12 }}>Reglas de Alertas</h3>
        <div style={{ fontSize: 12, color: "#888", lineHeight: 2.2 }}>
          {RULES.map(r => {
            const active = r.check(h);
            return (
              <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 8, opacity: active ? 1 : 0.5 }}>
                <span>{r.icon}</span>
                <span style={{ color: active ? colorMap[r.severity].text : "#666", fontWeight: active ? 600 : 400 }}>{r.label}</span>
                {active && <span style={{ marginLeft: "auto", fontFamily: "monospace", color: colorMap[r.severity].text, fontWeight: 700, fontSize: 11 }}>{r.value(h)}</span>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
