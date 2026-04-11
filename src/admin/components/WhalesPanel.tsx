import React, { useState, useEffect } from "react";

const SEV = {
  critical: { bg: "#f0505012", border: "#f0505030", text: "#ff3030", icon: "🔴" },
  warning: { bg: "#f7a60610", border: "#f7a60625", text: "#f7a606", icon: "🟡" },
  info: { bg: "#06d6f708", border: "#06d6f718", text: "#06d6f7", icon: "🔵" },
};

export default function WhalesPanel({ apiCall, onViewUser }: { apiCall: any; onViewUser: (id: string) => void }) {
  const [data, setData] = useState<any>(null);
  const [tab, setTab] = useState<"whales" | "dumps" | "anomalies" | "holders">("whales");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const d = await apiCall("whales");
      setData(d);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);
  useEffect(() => {
    const iv = setInterval(load, 8000);
    return () => clearInterval(iv);
  }, []);

  const tabs = [
    { id: "whales", label: "Whales", icon: "🐋", count: data?.whaleAlerts?.length || 0 },
    { id: "dumps", label: "Dumps", icon: "📉", count: data?.dumpAlerts?.length || 0 },
    { id: "anomalies", label: "Anomalías", icon: "⚠️", count: data?.anomalies?.length || 0 },
    { id: "holders", label: "Top Holders", icon: "👑", count: data?.topHolders?.length || 0 },
  ];

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "#666" }}>Analizando mercado...</div>;

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16, color: "#e0e0e0" }}>Whales & Detección de Dumps</h2>

      <div style={{ display: "flex", gap: 4, marginBottom: 16, flexWrap: "wrap" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)}
            style={{ padding: "8px 14px", borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: "pointer", background: tab === t.id ? "#1e1e2e" : "transparent", border: tab === t.id ? "1px solid #2a2a3e" : "1px solid transparent", color: tab === t.id ? "#e0e0e0" : "#666", display: "flex", alignItems: "center", gap: 6 }}>
            {t.icon} {t.label}
            {t.count > 0 && <span style={{ background: t.id === "dumps" ? "#f05050" : "#6366f1", color: "#fff", borderRadius: 6, padding: "1px 5px", fontSize: 9, fontWeight: 700 }}>{t.count}</span>}
          </button>
        ))}
      </div>

      <div style={{ background: "#12121a", border: "1px solid #1e1e2e", borderRadius: 14, overflow: "hidden", maxHeight: "calc(100vh - 200px)", overflowY: "auto" }}>

        {tab === "whales" && (
          <>
            {(data?.whaleAlerts || []).length === 0 && <div style={{ padding: 40, textAlign: "center", color: "#666" }}>Sin actividad whale en la última hora</div>}
            {(data?.whaleAlerts || []).map((w: any, i: number) => {
              const s = SEV[w.severity as keyof typeof SEV] || SEV.info;
              return (
                <div key={i} style={{ padding: "14px 16px", borderBottom: "1px solid #1a1a2a", background: s.bg }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, flexWrap: "wrap", gap: 4 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 18 }}>🐋</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: w.type === "whale_buy" ? "#10f090" : "#f05050" }}>
                        {w.type === "whale_buy" ? "WHALE BUY" : "WHALE SELL"}
                      </span>
                      <span style={{ padding: "2px 6px", borderRadius: 4, fontSize: 9, fontWeight: 700, background: s.bg, border: `1px solid ${s.border}`, color: s.text }}>
                        {w.severity}
                      </span>
                    </div>
                    <span style={{ fontSize: 9, color: "#555" }}>{new Date(w.ts).toLocaleString()}</span>
                  </div>
                  <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 12, color: "#ccc" }}>
                    <span>
                      <span style={{ color: "#888" }}>User:</span>{" "}
                      <span style={{ color: "#6366f1", cursor: "pointer" }} onClick={() => onViewUser(w.userId)}>{w.user}</span>
                    </span>
                    <span><span style={{ color: "#888" }}>Token:</span> <span style={{ fontWeight: 600 }}>{w.token}</span></span>
                    <span><span style={{ color: "#888" }}>Monto:</span> <span style={{ fontWeight: 700, color: "#f7a606" }}>{w.totalWld.toFixed(4)} WLD</span></span>
                    <span><span style={{ color: "#888" }}>Tokens:</span> {w.amount.toLocaleString()}</span>
                  </div>
                </div>
              );
            })}
          </>
        )}

        {tab === "dumps" && (
          <>
            {(data?.dumpAlerts || []).length === 0 && <div style={{ padding: 40, textAlign: "center", color: "#666" }}>Sin dumps detectados</div>}
            {(data?.dumpAlerts || []).map((d: any, i: number) => {
              const s = SEV[d.severity as keyof typeof SEV] || SEV.info;
              return (
                <div key={i} style={{ padding: "14px 16px", borderBottom: "1px solid #1a1a2a", background: s.bg }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, flexWrap: "wrap", gap: 4 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 18 }}>📉</span>
                      <span style={{ fontSize: 14, fontWeight: 700, color: s.text }}>DUMP en {d.token}</span>
                      <span style={{ padding: "2px 6px", borderRadius: 4, fontSize: 9, fontWeight: 700, background: s.bg, border: `1px solid ${s.border}`, color: s.text }}>{d.severity}</span>
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 8, marginBottom: 8 }}>
                    <div style={{ fontSize: 11 }}><span style={{ color: "#888" }}>Volumen vendido:</span> <span style={{ color: "#f05050", fontWeight: 700 }}>{d.sellVolume.toFixed(4)} WLD</span></div>
                    <div style={{ fontSize: 11 }}><span style={{ color: "#888" }}>Ventas:</span> <span style={{ color: "#ccc", fontWeight: 600 }}>{d.sellCount}</span></div>
                    <div style={{ fontSize: 11 }}><span style={{ color: "#888" }}>% de curva:</span> <span style={{ color: parseFloat(d.sellRatio) > 20 ? "#ff3030" : "#f7a606", fontWeight: 700 }}>{d.sellRatio}%</span></div>
                    <div style={{ fontSize: 11 }}><span style={{ color: "#888" }}>WLD en curva:</span> <span style={{ color: "#ccc" }}>{d.curveWld.toFixed(4)}</span></div>
                  </div>
                  {d.topSellers && d.topSellers.length > 0 && (
                    <div style={{ fontSize: 10, color: "#888" }}>
                      <span style={{ fontWeight: 600 }}>Top sellers:</span>{" "}
                      {d.topSellers.map((ts: any, j: number) => (
                        <span key={j} style={{ marginRight: 8 }}>
                          <span style={{ color: "#6366f1" }}>{ts.user}</span> ({ts.total.toFixed(4)} WLD)
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}

        {tab === "anomalies" && (
          <>
            {(data?.anomalies || []).length === 0 && <div style={{ padding: 40, textAlign: "center", color: "#666" }}>Sin anomalías detectadas</div>}
            {(data?.anomalies || []).map((a: any, i: number) => {
              const s = SEV[a.severity as keyof typeof SEV] || SEV.info;
              return (
                <div key={i} style={{ padding: "12px 16px", borderBottom: "1px solid #1a1a2a", background: s.bg }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span>{s.icon}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: s.text }}>
                      {a.type === "high_frequency_trader" ? "Trader alta frecuencia" : a.type === "whale_concentration" ? "Concentración whale" : a.type}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: "#ccc", display: "flex", gap: 16, flexWrap: "wrap" }}>
                    {a.userId && (
                      <span>
                        <span style={{ color: "#888" }}>User:</span>{" "}
                        <span style={{ color: "#6366f1", cursor: "pointer" }} onClick={() => onViewUser(a.userId)}>{a.userId.slice(0, 16)}</span>
                      </span>
                    )}
                    {a.tradeCount && <span><span style={{ color: "#888" }}>Trades:</span> <span style={{ fontWeight: 700, color: "#f7a606" }}>{a.tradeCount}</span> en {a.period}</span>}
                    {a.token && <span><span style={{ color: "#888" }}>Token:</span> {a.token}</span>}
                    {a.holdPercent && <span><span style={{ color: "#888" }}>Holding:</span> <span style={{ fontWeight: 700, color: parseFloat(a.holdPercent) > 30 ? "#f05050" : "#f7a606" }}>{a.holdPercent}%</span> del supply</span>}
                  </div>
                </div>
              );
            })}
          </>
        )}

        {tab === "holders" && (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #1e1e2e" }}>
                {["#", "Usuario", "Token", "Cantidad", "Valor", "PnL"].map((h, i) => (
                  <th key={i} style={{ padding: "10px 14px", textAlign: "left", fontSize: 10, fontWeight: 600, color: "#666", textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(data?.topHolders || []).map((h: any, i: number) => (
                <tr key={i} style={{ borderBottom: "1px solid #1a1a2a" }}>
                  <td style={{ padding: "10px 14px", color: "#555" }}>{i + 1}</td>
                  <td style={{ padding: "10px 14px" }}>
                    <span style={{ color: "#6366f1", cursor: "pointer" }} onClick={() => onViewUser(h.userId)}>{h.userId.slice(0, 16)}...</span>
                  </td>
                  <td style={{ padding: "10px 14px", fontWeight: 600, color: "#ccc" }}>{h.token}</td>
                  <td style={{ padding: "10px 14px", fontFamily: "monospace", color: "#888" }}>{h.amount.toLocaleString()}</td>
                  <td style={{ padding: "10px 14px", fontFamily: "monospace", color: "#f7a606" }}>{h.value.toFixed(4)} WLD</td>
                  <td style={{ padding: "10px 14px", fontFamily: "monospace", color: h.pnl >= 0 ? "#10f090" : "#f05050" }}>{h.pnl >= 0 ? "+" : ""}{h.pnl.toFixed(4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
