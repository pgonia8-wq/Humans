import { useState, useEffect } from "react";
import { formatNum, type Token } from "@/services/mockData";
import { api } from "@/services/api";
import { useApp } from "@/context/AppContext";

function TokenCard({ token, onClick }: { token: Token; onClick: () => void }) {
  const isPositive = token.change24h >= 0;
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "14px 16px",
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 14,
        width: "100%",
        cursor: "pointer",
        textAlign: "left",
        WebkitTapHighlightColor: "transparent",
        transition: "background 0.15s",
        marginBottom: 8,
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: "50%",
          background: "linear-gradient(135deg,#8b5cf620,#06d6f720)",
          border: "1px solid rgba(139,92,246,0.3)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 22,
          flexShrink: 0,
        }}
      >
        {token.emoji}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontWeight: 700, fontSize: 14, color: "#e8e9f0" }}>{token.name}</span>
          <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 13, color: "#e8e9f0" }}>
            ${token.priceUsdc.toFixed(3)}
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <span style={{ fontSize: 11, color: "#888", fontFamily: "monospace" }}>{token.symbol}</span>
            <span
              style={{
                fontSize: 10,
                padding: "1px 6px",
                borderRadius: 4,
                background: `${token.curvePercent > 70 ? "#f05050" : token.curvePercent > 40 ? "#f7a606" : "#10f090"}18`,
                color: token.curvePercent > 70 ? "#f05050" : token.curvePercent > 40 ? "#f7a606" : "#10f090",
                fontWeight: 600,
                letterSpacing: "0.05em",
              }}
            >
              {token.curvePercent}%
            </span>
          </div>
          <span
            style={{
              fontSize: 12,
              fontFamily: "monospace",
              fontWeight: 700,
              color: isPositive ? "#10f090" : "#f05050",
            }}
          >
            {isPositive ? "+" : ""}{token.change24h.toFixed(1)}%
          </span>
        </div>
        <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
          <span style={{ fontSize: 10, color: "#666" }}>
            MC ${formatNum(token.marketCap)}
          </span>
          <span style={{ fontSize: 10, color: "#666" }}>
            {formatNum(token.holders)} holders
          </span>
          <span style={{ fontSize: 10, color: "#666" }}>
            Vol ${formatNum(token.volume24h)}
          </span>
        </div>
      </div>
    </button>
  );
}

function HotCard({ token, onClick }: { token: Token; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        minWidth: 140,
        padding: "14px",
        background: "linear-gradient(135deg,rgba(139,92,246,0.12),rgba(6,214,247,0.06))",
        border: "1px solid rgba(139,92,246,0.25)",
        borderRadius: 14,
        cursor: "pointer",
        textAlign: "left",
        WebkitTapHighlightColor: "transparent",
        flexShrink: 0,
      }}
    >
      <div style={{ fontSize: 28, marginBottom: 8 }}>{token.emoji}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#e8e9f0" }}>{token.symbol}</div>
      <div style={{ fontSize: 11, color: "#888", marginBottom: 6 }}>{token.name}</div>
      <div style={{ fontSize: 13, fontFamily: "monospace", fontWeight: 800, color: token.change24h >= 0 ? "#10f090" : "#f05050" }}>
        +{token.change24h.toFixed(0)}%
      </div>
    </button>
  );
}

export default function DiscoveryPage() {
  const { navigate, openCreatorDashboard } = useApp();
  const [search, setSearch] = useState("");
  const [allTokens, setAllTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.getTokens();
        setAllTokens(res.tokens);
      } catch (err) {
        console.error("[DiscoveryPage] Error loading tokens:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = allTokens.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.symbol.toLowerCase().includes(search.toLowerCase())
  );

  const exploding = allTokens.filter((t) => t.change24h > 50).sort((a, b) => b.change24h - a.change24h);
  const newTokens = allTokens.filter((t) => t.curvePercent < 20).sort((a, b) => a.curvePercent - b.curvePercent);

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "16px 16px 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: "#e8e9f0", letterSpacing: "-0.02em" }}>
              Token Market
            </h1>
            <p style={{ fontSize: 12, color: "#888", marginTop: 2 }}>World App Mini · All verified humans</p>
          </div>
          <button
            onClick={openCreatorDashboard}
            style={{
              padding: "8px 14px",
              background: "linear-gradient(135deg,#8b5cf6,#6d3fcf)",
              border: "none",
              borderRadius: 10,
              color: "#fff",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            + Create
          </button>
        </div>

        <div style={{ position: "relative", marginBottom: 14 }}>
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 16 }}>🔍</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tokens..."
            style={{
              width: "100%",
              padding: "10px 12px 10px 38px",
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 12,
              color: "#e8e9f0",
              fontSize: 14,
              outline: "none",
            }}
          />
        </div>
      </div>

      <div className="scrollable" style={{ flex: 1, paddingBottom: 80 }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: 40, color: "#888" }}>Loading tokens...</div>
        ) : (
          <>
            {!search && exploding.length > 0 && (
              <section style={{ marginBottom: 20 }}>
                <div style={{ padding: "0 16px 10px" }}>
                  <h2 style={{ fontSize: 13, fontWeight: 800, color: "#f7a606", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                    🔥 Exploding Now
                  </h2>
                </div>
                <div style={{ display: "flex", gap: 10, paddingLeft: 16, overflowX: "auto", paddingRight: 16 }}>
                  {exploding.map((t) => (
                    <HotCard key={t.id} token={t} onClick={() => navigate("token", { tokenId: t.id })} />
                  ))}
                </div>
              </section>
            )}

            {!search && newTokens.length > 0 && (
              <section style={{ marginBottom: 20 }}>
                <div style={{ padding: "0 16px 10px" }}>
                  <h2 style={{ fontSize: 13, fontWeight: 800, color: "#10f090", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                    🚀 Newest — Get in Early
                  </h2>
                </div>
                <div style={{ display: "flex", gap: 10, paddingLeft: 16, overflowX: "auto", paddingRight: 16 }}>
                  {newTokens.map((t) => (
                    <HotCard key={t.id} token={t} onClick={() => navigate("token", { tokenId: t.id })} />
                  ))}
                </div>
              </section>
            )}

            <section>
              <div style={{ padding: "0 16px 10px" }}>
                <h2 style={{ fontSize: 13, fontWeight: 700, color: "#888", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                  {search ? `Results (${filtered.length})` : "All Tokens"}
                </h2>
              </div>
              <div style={{ padding: "0 16px" }}>
                {filtered.length === 0 ? (
                  <div style={{ textAlign: "center", padding: 40, color: "#555" }}>No tokens found</div>
                ) : (
                  filtered.map((t) => (
                    <TokenCard key={t.id} token={t} onClick={() => navigate("token", { tokenId: t.id })} />
                  ))
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
