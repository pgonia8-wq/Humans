import { useApp } from "@/context/AppContext";
import { MOCK_HOLDINGS, formatNum } from "@/services/mockData";

export default function UserProfile() {
  const { user, balanceWld, balanceUsdc, navigate, openCreatorDashboard } = useApp();

  const totalValue = balanceUsdc + balanceWld * 3 + MOCK_HOLDINGS.reduce((s, h) => s + h.value, 0);
  const totalPnl = MOCK_HOLDINGS.reduce((s, h) => s + h.pnl, 0);
  const totalPnlPositive = totalPnl >= 0;

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "16px 16px 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#e8e9f0", letterSpacing: "-0.02em" }}>
            Portfolio
          </h1>
          <button
            onClick={openCreatorDashboard}
            style={{
              padding: "7px 14px",
              background: "rgba(139,92,246,0.15)",
              border: "1px solid rgba(139,92,246,0.3)",
              borderRadius: 10,
              color: "#8b5cf6",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            🏗️ Creator
          </button>
        </div>

        <div
          style={{
            padding: "20px",
            background: "linear-gradient(135deg,rgba(139,92,246,0.12),rgba(6,214,247,0.06))",
            border: "1px solid rgba(139,92,246,0.2)",
            borderRadius: 16,
            marginBottom: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                background: "linear-gradient(135deg,#8b5cf6,#06d6f7)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 22,
                fontWeight: 800,
                color: "#fff",
                flexShrink: 0,
              }}
            >
              {user?.username?.[0]?.toUpperCase() ?? "W"}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: "#e8e9f0" }}>{user?.username}</div>
              <div
                style={{
                  fontSize: 11,
                  color: "#8b5cf6",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  marginTop: 2,
                }}
              >
                <span>🌍</span>
                {user?.verificationLevel === "orb" ? "Orb Verified" : "Device Verified"}
              </div>
            </div>
          </div>

          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 12, color: "#888", marginBottom: 4 }}>Total Portfolio Value</div>
            <div style={{ fontSize: 30, fontFamily: "monospace", fontWeight: 800, color: "#e8e9f0" }}>
              ${totalValue.toFixed(2)}
            </div>
            <div style={{ fontSize: 13, fontFamily: "monospace", fontWeight: 700, color: totalPnlPositive ? "#10f090" : "#f05050", marginTop: 4 }}>
              {totalPnlPositive ? "+" : ""}{totalPnl.toFixed(2)} USD all time
            </div>
          </div>

          <div style={{ display: "flex", gap: 16, marginTop: 12 }}>
            <div>
              <div style={{ fontSize: 14, fontFamily: "monospace", fontWeight: 700, color: "#e8e9f0" }}>
                {balanceWld.toFixed(2)} WLD
              </div>
              <div style={{ fontSize: 10, color: "#666" }}>Balance</div>
            </div>
            <div>
              <div style={{ fontSize: 14, fontFamily: "monospace", fontWeight: 700, color: "#e8e9f0" }}>
                ${balanceUsdc.toFixed(2)} USDC
              </div>
              <div style={{ fontSize: 10, color: "#666" }}>Balance</div>
            </div>
          </div>
        </div>
      </div>

      <div className="scrollable" style={{ flex: 1, padding: "0 16px", paddingBottom: 84 }}>
        <h2 style={{ fontSize: 13, fontWeight: 700, color: "#888", letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 10 }}>
          Holdings
        </h2>

        {MOCK_HOLDINGS.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🪙</div>
            <p style={{ color: "#555", marginBottom: 16 }}>No holdings yet</p>
            <button
              onClick={() => navigate("discovery")}
              style={{
                padding: "12px 24px",
                background: "linear-gradient(135deg,#8b5cf6,#06d6f7)",
                border: "none",
                borderRadius: 12,
                color: "#fff",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Explore Tokens
            </button>
          </div>
        ) : (
          MOCK_HOLDINGS.map((h) => {
            const isPositive = h.pnlPercent >= 0;
            return (
              <button
                key={h.tokenId}
                onClick={() => navigate("token", { tokenId: h.tokenId })}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "14px 16px",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: 14,
                  width: "100%",
                  cursor: "pointer",
                  marginBottom: 8,
                  textAlign: "left",
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg,rgba(139,92,246,0.2),rgba(6,214,247,0.1))",
                    border: "1px solid rgba(139,92,246,0.3)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 20,
                  }}
                >
                  {h.tokenEmoji}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontWeight: 700, fontSize: 14, color: "#e8e9f0" }}>{h.tokenSymbol}</span>
                    <span style={{ fontSize: 14, fontFamily: "monospace", fontWeight: 700, color: "#e8e9f0" }}>
                      ${h.value.toFixed(2)}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                    <span style={{ fontSize: 11, color: "#666" }}>
                      {h.amount.toLocaleString()} tokens
                    </span>
                    <span style={{ fontSize: 12, fontFamily: "monospace", fontWeight: 700, color: isPositive ? "#10f090" : "#f05050" }}>
                      {isPositive ? "+" : ""}{h.pnlPercent.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
