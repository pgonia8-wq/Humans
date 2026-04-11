import React from "react";

function Card({ title, children, color = "#6366f1" }: { title: string; children: React.ReactNode; color?: string }) {
  return (
    <div style={{ background: "#12121a", border: "1px solid #1e1e2e", borderRadius: 14, padding: 20, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: color }} />
      <h3 style={{ fontSize: 11, fontWeight: 600, color: "#888", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 16 }}>{title}</h3>
      {children}
    </div>
  );
}

function Stat({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 10, color: "#666", marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: color || "#e0e0e0", fontVariantNumeric: "tabular-nums" }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: "#555" }}>{sub}</div>}
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  const c = status === "ok" ? "#10f090" : status === "degraded" ? "#f7a606" : "#f05050";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
      <div style={{ width: 10, height: 10, borderRadius: "50%", background: c, boxShadow: `0 0 10px ${c}60` }} />
      <span style={{ fontSize: 14, fontWeight: 600, color: c }}>
        {status === "ok" ? "Sistema Operativo" : status === "degraded" ? "Degradado" : "CRÍTICO"}
      </span>
    </div>
  );
}

export default function OverviewPanel({ stats, health, onViewUser }: { stats: any; health: any; onViewUser: (id: string) => void }) {
  if (!stats) return <div style={{ color: "#666", textAlign: "center", paddingTop: 80 }}>Cargando datos...</div>;

  const o = stats.overview;
  const t = stats.trading;
  const h = health || {};
  const netFlow = (t.totalBuyWld - t.totalSellWld).toFixed(4);

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20, color: "#e0e0e0" }}>Panel General</h2>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        <Card title="Usuarios" color="#6366f1">
          <Stat label="Total registrados" value={o.totalUsers.toLocaleString()} color="#6366f1" />
          <Stat label="Nuevos (24h)" value={`+${o.newUsers24h}`} color="#10f090" />
          <Stat label="Baneados" value={o.bannedUsers} color={o.bannedUsers > 0 ? "#f05050" : "#666"} />
        </Card>

        <Card title="Contenido" color="#06d6f7">
          <Stat label="Posts totales" value={o.totalPosts.toLocaleString()} color="#06d6f7" />
          <Stat label="Nuevos (24h)" value={`+${o.newPosts24h}`} color="#10f090" />
        </Card>

        <Card title="Reportes" color={o.pendingReports > 0 ? "#f05050" : "#f7a606"}>
          <Stat label="Total reportes" value={o.totalReports} />
          <Stat label="Pendientes" value={o.pendingReports} color={o.pendingReports > 0 ? "#f05050" : "#10f090"} />
        </Card>

        <Card title="Trading" color="#10f090">
          <Stat label="Trades totales" value={t.totalTrades.toLocaleString()} />
          <Stat label="Ultima hora" value={t.trades1h} color="#f7a606" />
        </Card>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
        <Card title="Money Flow" color="#10f090">
          <Stat label="WLD comprado (reciente)" value={`${t.totalBuyWld.toFixed(4)} WLD`} color="#10f090" />
          <Stat label="WLD vendido (reciente)" value={`${t.totalSellWld.toFixed(4)} WLD`} color="#f05050" />
          <Stat label="Flujo neto" value={`${Number(netFlow) >= 0 ? "+" : ""}${netFlow} WLD`} color={Number(netFlow) >= 0 ? "#10f090" : "#f05050"} />
        </Card>

        <Card title="Treasury Global" color="#f7a606">
          <Stat label="Treasury total (fees)" value={`${t.totalTreasury.toFixed(4)} WLD`} color="#f7a606" />
          <Stat label="WLD en curvas" value={`${t.totalWldInCurve.toFixed(4)} WLD`} color="#06d6f7" />
        </Card>

        <Card title="Trading Metrics" color="#6366f1">
          <Stat label="Success rate" value={h.errorRate ? `${(100 - parseFloat(h.errorRate)).toFixed(1)}%` : "—"} color="#10f090" />
          <Stat label="Error rate" value={h.errorRate || "—"} color={parseFloat(h.errorRate || "0") > 5 ? "#f05050" : "#10f090"} />
          <Stat label="OCC conflicts" value={h.occConflicts ?? "—"} color="#f7a606" />
          <Stat label="Partial payouts" value={h.partialPayouts ?? "—"} color="#f7a606" />
        </Card>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
        <Card title="System Health" color={h.status === "ok" ? "#10f090" : h.status === "degraded" ? "#f7a606" : "#f05050"}>
          <StatusDot status={h.status || "ok"} />
          <Stat label="Requests procesados" value={h.requests?.toLocaleString() || "0"} />
          <Stat label="Uptime" value={h.uptime ? `${Math.floor(h.uptime / 60)}m ${h.uptime % 60}s` : "—"} color="#06d6f7" />
        </Card>

        <Card title="Latencia" color="#06d6f7">
          <Stat label="Promedio" value={h.avgLatency ? `${h.avgLatency}ms` : "—"} color={h.avgLatency > 300 ? "#f7a606" : "#10f090"} />
          <Stat label="P50" value={h.p50 ? `${h.p50}ms` : "—"} color="#888" />
          <Stat label="P95" value={h.p95 ? `${h.p95}ms` : "—"} color={h.p95 > 500 ? "#f05050" : "#888"} />
        </Card>

        <Card title="Tokens" color="#6366f1">
          <Stat label="Tokens activos" value={(stats.tokens || []).length} />
          <Stat label="Tokens graduados" value={(stats.tokens || []).filter((tk: any) => tk.graduated).length} />
          <Stat label="Volumen total WLD" value={h.totalVolumeWLD ? `${h.totalVolumeWLD.toFixed(4)} WLD` : "—"} color="#f7a606" />
        </Card>
      </div>

      {h.db && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          <Card title="Database" color={h.db.connected ? "#10f090" : "#f05050"}>
            <StatusDot status={h.db.connected ? "ok" : "critical"} />
            <Stat label="Latencia DB" value={`${h.db.latency_ms}ms`} color={h.db.latency_ms > 300 ? "#f7a606" : "#10f090"} />
            <Stat label="Total usuarios en DB" value={h.db.users?.toLocaleString() || "0"} />
          </Card>
        </div>
      )}
    </div>
  );
}
