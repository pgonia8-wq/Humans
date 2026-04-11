import React, { useState, useEffect } from "react";

function FlowCard({ title, value, color, sub }: { title: string; value: string; color: string; sub?: string }) {
  return (
    <div style={{ background: "#12121a", border: "1px solid #1e1e2e", borderRadius: 12, padding: 16, textAlign: "center", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: color }} />
      <div style={{ fontSize: 10, color: "#666", marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color, fontVariantNumeric: "tabular-nums" }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: "#555", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div style={{ width: "100%", height: 6, background: "#1a1a2a", borderRadius: 3, overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 3, transition: "width 0.3s" }} />
    </div>
  );
}

export default function MoneyFlowPanel({ apiCall }: { apiCall: any }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"live" | "h24" | "d7">("h24");

  const load = async () => {
    try {
      const d = await apiCall("moneyflow");
      setData(d);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { const iv = setInterval(load, 8000); return () => clearInterval(iv); }, []);

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "#666" }}>Cargando flujo monetario...</div>;
  if (!data) return <div style={{ padding: 40, textAlign: "center", color: "#666" }}>Error cargando datos</div>;

  const flow = data[period] || data.h24;
  const periods = [
    { id: "live", label: "Última hora" },
    { id: "h24", label: "24 horas" },
    { id: "d7", label: "7 días" },
  ];

  const maxHourly = Math.max(...(data.hourly || []).map((h: any) => Math.max(h.inflow, h.outflow, 0.001)));

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16, color: "#e0e0e0" }}>Money Flow</h2>

      <div style={{ display: "flex", gap: 4, marginBottom: 20 }}>
        {periods.map(p => (
          <button key={p.id} onClick={() => setPeriod(p.id as any)}
            style={{ padding: "8px 16px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", background: period === p.id ? "#1e1e2e" : "transparent", border: period === p.id ? "1px solid #2a2a3e" : "1px solid transparent", color: period === p.id ? "#e0e0e0" : "#666" }}>
            {p.label}
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 24 }}>
        <FlowCard title="WLD Inflow" value={`${flow.inflow.toFixed(4)}`} color="#10f090" sub={`${flow.buyCount} compras`} />
        <FlowCard title="WLD Outflow" value={`${flow.outflow.toFixed(4)}`} color="#f05050" sub={`${flow.sellCount} ventas`} />
        <FlowCard title="Net Revenue" value={`${flow.net >= 0 ? "+" : ""}${flow.net.toFixed(4)}`} color={flow.net >= 0 ? "#10f090" : "#f05050"} />
        <FlowCard title="Buy Fees" value={`${flow.buyFees.toFixed(4)}`} color="#6366f1" />
        <FlowCard title="Sell Fees" value={`${flow.sellFees.toFixed(4)}`} color="#8b5cf6" />
        <FlowCard title="Total Fees" value={`${flow.totalFees.toFixed(4)}`} color="#f7a606" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
        <FlowCard title="Treasury Global" value={`${data.totals.treasury.toFixed(4)} WLD`} color="#f7a606" />
        <FlowCard title="WLD en Curvas" value={`${data.totals.wldInCurve.toFixed(4)} WLD`} color="#06d6f7" />
      </div>

      <div style={{ background: "#12121a", border: "1px solid #1e1e2e", borderRadius: 14, padding: 20, marginBottom: 24 }}>
        <h3 style={{ fontSize: 12, fontWeight: 600, color: "#888", marginBottom: 16 }}>Flujo por Hora (24h)</h3>
        <div style={{ display: "flex", alignItems: "end", gap: 2, height: 120 }}>
          {(data.hourly || []).map((h: any, i: number) => {
            const inflowH = Math.max((h.inflow / maxHourly) * 100, 1);
            const outflowH = Math.max((h.outflow / maxHourly) * 100, 1);
            return (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }} title={`${h.hour}\nIn: ${h.inflow} WLD\nOut: ${h.outflow} WLD\nNet: ${h.net} WLD\nTrades: ${h.trades}`}>
                <div style={{ display: "flex", gap: 1, alignItems: "end", height: 100 }}>
                  <div style={{ width: 4, height: `${inflowH}%`, background: "#10f090", borderRadius: 2 }} />
                  <div style={{ width: 4, height: `${outflowH}%`, background: "#f05050", borderRadius: 2 }} />
                </div>
                {i % 4 === 0 && <span style={{ fontSize: 8, color: "#555", marginTop: 2 }}>{h.hour}</span>}
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 16, marginTop: 8, justifyContent: "center" }}>
          <span style={{ fontSize: 10, color: "#10f090" }}>● Inflow</span>
          <span style={{ fontSize: 10, color: "#f05050" }}>● Outflow</span>
        </div>
      </div>

      <div style={{ background: "#12121a", border: "1px solid #1e1e2e", borderRadius: 14, overflow: "hidden" }}>
        <h3 style={{ fontSize: 12, fontWeight: 600, color: "#888", padding: "16px 20px 8px" }}>Treasury por Token</h3>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #1e1e2e" }}>
                {["Token", "Treasury", "En Curva", "Precio", "Supply", "Holders", "Vol 24h", "Estado"].map((h, i) => (
                  <th key={i} style={{ padding: "10px 14px", textAlign: "left", fontSize: 10, fontWeight: 600, color: "#666", textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(data.tokens || []).map((t: any) => (
                <tr key={t.id} style={{ borderBottom: "1px solid #1a1a2a" }}>
                  <td style={{ padding: "10px 14px", fontWeight: 600, color: "#ccc" }}>{t.symbol}</td>
                  <td style={{ padding: "10px 14px" }}>
                    <span style={{ color: t.treasury < 1 ? "#f05050" : "#f7a606", fontWeight: 600 }}>{t.treasury.toFixed(4)}</span>
                    {t.treasury < 1 && <span style={{ fontSize: 9, color: "#f05050", marginLeft: 4 }}>⚠️</span>}
                  </td>
                  <td style={{ padding: "10px 14px", color: "#06d6f7" }}>{t.wldInCurve.toFixed(4)}</td>
                  <td style={{ padding: "10px 14px", color: "#888", fontFamily: "monospace" }}>{t.price.toFixed(8)}</td>
                  <td style={{ padding: "10px 14px", color: "#888" }}>{t.supply.toLocaleString()}</td>
                  <td style={{ padding: "10px 14px", color: "#888" }}>{t.holders}</td>
                  <td style={{ padding: "10px 14px", color: "#f7a606" }}>{t.volume24h.toFixed(4)}</td>
                  <td style={{ padding: "10px 14px" }}>
                    {t.graduated && <span style={{ padding: "2px 6px", borderRadius: 4, fontSize: 9, fontWeight: 700, background: "#10f09020", color: "#10f090" }}>GRAD</span>}
                    {t.nearGraduation && !t.graduated && <span style={{ padding: "2px 6px", borderRadius: 4, fontSize: 9, fontWeight: 700, background: "#f7a60620", color: "#f7a606" }}>NEAR</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
