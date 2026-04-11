import React from "react";

export default function TokensPanel({ tokens, trading }: { tokens: any[]; trading: any }) {
  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20, color: "#e0e0e0" }}>Tokens</h2>

      {trading && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
          {[
            { label: "Trades totales", value: trading.totalTrades?.toLocaleString(), color: "#6366f1" },
            { label: "Treasury global", value: `${trading.totalTreasury?.toFixed(4)} WLD`, color: "#f7a606" },
            { label: "WLD en curvas", value: `${trading.totalWldInCurve?.toFixed(4)} WLD`, color: "#06d6f7" },
            { label: "Trades (1h)", value: trading.trades1h, color: "#10f090" },
          ].map((s, i) => (
            <div key={i} style={{ background: "#12121a", border: "1px solid #1e1e2e", borderRadius: 14, padding: 20 }}>
              <div style={{ fontSize: 10, color: "#666", marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: s.color, fontVariantNumeric: "tabular-nums" }}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ background: "#12121a", border: "1px solid #1e1e2e", borderRadius: 14, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #1e1e2e" }}>
              {["Token", "Precio", "Volumen 24h", "Holders", "Supply", "Treasury", "Estado"].map((h, i) => (
                <th key={i} style={{ padding: "12px 16px", textAlign: "left", fontSize: 10, fontWeight: 600, color: "#666", textTransform: "uppercase" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tokens.map(t => (
              <tr key={t.id} style={{ borderBottom: "1px solid #1a1a2a" }}>
                <td style={{ padding: "12px 16px" }}>
                  <div style={{ fontWeight: 600, color: "#e0e0e0" }}>{t.name}</div>
                  <div style={{ fontSize: 10, color: "#888" }}>{t.symbol}</div>
                </td>
                <td style={{ padding: "12px 16px", color: "#ccc", fontFamily: "monospace" }}>{Number(t.price_wld).toFixed(8)}</td>
                <td style={{ padding: "12px 16px", color: "#f7a606", fontFamily: "monospace" }}>{Number(t.volume_24h).toFixed(2)}</td>
                <td style={{ padding: "12px 16px", color: "#888" }}>{t.holders}</td>
                <td style={{ padding: "12px 16px", color: "#888", fontFamily: "monospace" }}>{Number(t.circulating_supply).toLocaleString()}</td>
                <td style={{ padding: "12px 16px", color: "#10f090", fontFamily: "monospace" }}>{Number(t.treasury_balance).toFixed(4)}</td>
                <td style={{ padding: "12px 16px" }}>
                  <span style={{ padding: "3px 8px", borderRadius: 6, fontSize: 10, fontWeight: 600, background: t.graduated ? "#6366f120" : "#10f09020", color: t.graduated ? "#6366f1" : "#10f090" }}>
                    {t.graduated ? "Graduado" : "Activo"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {tokens.length === 0 && <div style={{ padding: 40, textAlign: "center", color: "#666" }}>Sin tokens</div>}
      </div>
    </div>
  );
}
