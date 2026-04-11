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

function ModeTag({ active, label }: { active: boolean; label: string }) {
  if (!active) return null;
  return (
    <span style={{ display: "inline-block", padding: "3px 8px", borderRadius: 6, fontSize: 10, fontWeight: 700, background: "#f0505020", color: "#f05050", marginRight: 6, marginBottom: 4 }}>
      {label}
    </span>
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 8 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "#e0e0e0", margin: 0 }}>Panel General</h2>
        <div>
          <ModeTag active={h.tradingPaused} label="🛑 TRADING PAUSADO" />
          <ModeTag active={h.readOnlyMode} label="⚠️ SOLO LECTURA" />
          <ModeTag active={h.degradedMode} label="🧯 MODO DEGRADADO" />
          {(h.frozenTokens || []).length > 0 && <ModeTag active label={`🧊 ${h.frozenTokens.length} TOKEN(S) CONGELADO(S)`} />}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 24 }}>
        <Card title="System Health" color={h.status === "ok" ? "#10f090" : h.status === "degraded" ? "#f7a606" : "#f05050"}>
          <StatusDot status={h.status || "ok"} />
          <Stat label="Uptime" value={h.uptime ? `${Math.floor(h.uptime / 3600)}h ${Math.floor((h.uptime % 3600) / 60)}m` : "—"} color="#06d6f7" />
          <Stat label="Requests/seg" value={h.rps ?? "—"} color="#6366f1" />
          <Stat label="Trades/seg" value={h.tps ?? "—"} color="#10f090" />
        </Card>

        <Card title="Usuarios" color="#6366f1">
          <Stat label="Total registrados" value={o.totalUsers?.toLocaleString()} color="#6366f1" />
          <Stat label="Nuevos (24h)" value={`+${o.newUsers24h}`} color="#10f090" />
          <Stat label="Baneados" value={o.bannedUsers} color={o.bannedUsers > 0 ? "#f05050" : "#666"} />
        </Card>

        <Card title="Contenido" color="#06d6f7">
          <Stat label="Posts totales" value={o.totalPosts?.toLocaleString()} color="#06d6f7" />
          <Stat label="Posts (24h)" value={`+${o.newPosts24h}`} color="#10f090" />
          <Stat label="Posts/seg" value={h.posts ? (h.posts / Math.max(h.uptime, 1)).toFixed(3) : "0"} color="#888" />
          <Stat label="Likes total" value={h.likes ?? "—"} color="#f7a606" />
        </Card>

        <Card title="Reportes" color={o.pendingReports > 0 ? "#f05050" : "#f7a606"}>
          <Stat label="Total" value={o.totalReports} />
          <Stat label="Pendientes" value={o.pendingReports} color={o.pendingReports > 0 ? "#f05050" : "#10f090"} />
        </Card>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 24 }}>
        <Card title="Latencia" color="#06d6f7">
          <Stat label="P50" value={h.p50 ? `${h.p50}ms` : "—"} color={h.p50 > 200 ? "#f7a606" : "#10f090"} />
          <Stat label="P95" value={h.p95 ? `${h.p95}ms` : "—"} color={h.p95 > 250 ? "#f05050" : h.p95 > 150 ? "#f7a606" : "#10f090"} />
          <Stat label="P99" value={h.p99 ? `${h.p99}ms` : "—"} color={h.p99 > 500 ? "#f05050" : "#888"} />
          <Stat label="Promedio" value={h.avgLatency ? `${h.avgLatency}ms` : "—"} color="#888" />
        </Card>

        <Card title="Error Rate" color={h.errorRateNum > 5 ? "#f05050" : "#10f090"}>
          <Stat label="Error rate" value={h.errorRate || "0%"} color={h.errorRateNum > 5 ? "#f05050" : h.errorRateNum > 2 ? "#f7a606" : "#10f090"} />
          <Stat label="Requests totales" value={h.requests?.toLocaleString() || "0"} />
          <Stat label="Errores totales" value={h.errors || 0} color={h.errors > 0 ? "#f05050" : "#666"} />
          <Stat label="Fallos trades/min" value={h.failedTrades1m ?? "—"} color={h.failedTrades1m > 50 ? "#f05050" : "#888"} />
        </Card>

        <Card title="Trading Conflicts" color="#f7a606">
          <Stat label="OCC Conflicts" value={h.occConflicts ?? 0} color={h.occConflicts > 10 ? "#f05050" : "#f7a606"} />
          <Stat label="Partial Payouts" value={h.partialPayouts ?? 0} color={h.partialPayouts > 0 ? "#f7a606" : "#666"} />
          <Stat label="Idempotency Conflicts" value={h.idempotencyConflicts ?? 0} color="#888" />
        </Card>

        <Card title="Money Flow (reciente)" color="#10f090">
          <Stat label="WLD comprado" value={`${t.totalBuyWld.toFixed(4)} WLD`} color="#10f090" />
          <Stat label="WLD vendido" value={`${t.totalSellWld.toFixed(4)} WLD`} color="#f05050" />
          <Stat label="Flujo neto" value={`${Number(netFlow) >= 0 ? "+" : ""}${netFlow} WLD`} color={Number(netFlow) >= 0 ? "#10f090" : "#f05050"} />
          <Stat label="Fees acumulados" value={`${(h.totalFees || 0).toFixed(4)} WLD`} color="#f7a606" />
        </Card>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 24 }}>
        <Card title="Trading" color="#10f090">
          <Stat label="Trades totales" value={t.totalTrades?.toLocaleString()} />
          <Stat label="Última hora" value={t.trades1h} color="#f7a606" />
          <Stat label="Buys" value={h.buys ?? "—"} color="#10f090" />
          <Stat label="Sells" value={h.sells ?? "—"} color="#f05050" />
        </Card>

        <Card title="Rejected Transactions" color="#f05050">
          {h.rejectedTx && Object.entries(h.rejectedTx).map(([k, v]: [string, any]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4, color: v > 0 ? "#f7a606" : "#555" }}>
              <span>{k.replace(/_/g, " ")}</span>
              <span style={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{v}</span>
            </div>
          ))}
          {!h.rejectedTx && <div style={{ color: "#555", fontSize: 12 }}>Sin datos</div>}
        </Card>

        <Card title="Database" color={h.db?.connected ? "#10f090" : "#f05050"}>
          <StatusDot status={h.db?.connected ? "ok" : "critical"} />
          <Stat label="Latencia DB" value={h.db ? `${h.db.latency_ms}ms` : "—"} color={h.db?.latency_ms > 300 ? "#f7a606" : "#10f090"} />
          <Stat label="Usuarios en DB" value={h.db?.users?.toLocaleString() || "0"} />
        </Card>

        <Card title="Tokens" color="#6366f1">
          <Stat label="Activos" value={(stats.tokens || []).length} />
          <Stat label="Graduados" value={(stats.tokens || []).filter((tk: any) => tk.graduated).length} />
          <Stat label="Volumen total" value={h.totalVolumeWLD ? `${h.totalVolumeWLD.toFixed(4)} WLD` : "—"} color="#f7a606" />
        </Card>
      </div>
    </div>
  );
}
