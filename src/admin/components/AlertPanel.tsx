import React from "react";

export default function AlertPanel({ alerts, stats, health }: { alerts: any[]; stats: any; health: any }) {
  const allAlerts = [...alerts];
  const h = health || {};

  if (stats) {
    const o = stats.overview;
    const t = stats.trading;

    if (o.bannedUsers > 0) allAlerts.push({ type: "info", msg: `${o.bannedUsers} usuario${o.bannedUsers > 1 ? "s" : ""} baneado${o.bannedUsers > 1 ? "s" : ""}` });
    if (t.totalTreasury < 0.5 && t.totalWldInCurve > 5) allAlerts.push({ type: "critical", msg: `Treasury bajo: ${t.totalTreasury.toFixed(4)} WLD` });
    if (o.pendingReports > 5) allAlerts.push({ type: "warning", msg: `${o.pendingReports} reportes acumulados sin revisar` });
    if (t.trades1h > 100) allAlerts.push({ type: "info", msg: `Alta actividad de trading: ${t.trades1h} trades en la última hora` });
  }

  if (h.p95 > 500) allAlerts.push({ type: "warning", msg: `Latencia P95 alta: ${h.p95}ms` });
  if (h.errorRate && parseFloat(h.errorRate) > 5) allAlerts.push({ type: "critical", msg: `Error rate alto: ${h.errorRate}` });
  if (h.occConflicts > 10) allAlerts.push({ type: "warning", msg: `${h.occConflicts} conflictos OCC detectados` });
  if (h.partialPayouts > 0) allAlerts.push({ type: "warning", msg: `${h.partialPayouts} partial payouts detectados` });
  if (h.db && !h.db.connected) allAlerts.push({ type: "critical", msg: "Base de datos desconectada" });
  if (h.db && h.db.latency_ms > 500) allAlerts.push({ type: "warning", msg: `Latencia DB alta: ${h.db.latency_ms}ms` });

  const colorMap: Record<string, { bg: string; border: string; text: string; icon: string }> = {
    critical: { bg: "#f0505010", border: "#f0505040", text: "#f05050", icon: "🔴" },
    warning: { bg: "#f7a60610", border: "#f7a60640", text: "#f7a606", icon: "🟡" },
    info: { bg: "#06d6f710", border: "#06d6f740", text: "#06d6f7", icon: "🔵" },
  };

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20, color: "#e0e0e0" }}>Alertas del Sistema</h2>

      {allAlerts.length === 0 ? (
        <div style={{ background: "#12121a", border: "1px solid #1e1e2e", borderRadius: 14, padding: 60, textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>✅</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: "#10f090" }}>Todo en orden</div>
          <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>No hay alertas activas</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {allAlerts.map((a, i) => {
            const c = colorMap[a.type] || colorMap.info;
            return (
              <div key={i} style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 12, padding: "14px 20px", display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 16 }}>{c.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: c.text }}>{a.msg}</div>
                </div>
                <span style={{ fontSize: 10, color: "#555" }}>{new Date().toLocaleTimeString()}</span>
              </div>
            );
          })}
        </div>
      )}

      {h.requests !== undefined && (
        <div style={{ marginTop: 24, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          {[
            { label: "Requests", value: h.requests, color: "#6366f1" },
            { label: "Errors", value: h.errors, color: "#f05050" },
            { label: "Trades", value: h.trades, color: "#10f090" },
            { label: "OCC Conflicts", value: h.occConflicts, color: "#f7a606" },
          ].map((s, i) => (
            <div key={i} style={{ background: "#12121a", border: "1px solid #1e1e2e", borderRadius: 12, padding: 16, textAlign: "center" }}>
              <div style={{ fontSize: 10, color: "#666", marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: s.color, fontVariantNumeric: "tabular-nums" }}>{s.value ?? 0}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 32 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: "#888", marginBottom: 12 }}>Reglas de alertas</h3>
        <div style={{ background: "#12121a", border: "1px solid #1e1e2e", borderRadius: 14, padding: 20, fontSize: 12, color: "#888", lineHeight: 2 }}>
          <div>🔴 <strong style={{ color: "#f05050" }}>Crítico</strong> — Error rate &gt;5%, DB desconectada, treasury vacío</div>
          <div>🟡 <strong style={{ color: "#f7a606" }}>Advertencia</strong> — Latencia P95 &gt;500ms, reportes pendientes, OCC conflicts, partial payouts</div>
          <div>🔵 <strong style={{ color: "#06d6f7" }}>Info</strong> — Alta actividad, usuarios baneados, eventos normales</div>
        </div>
      </div>
    </div>
  );
}
