import { useState } from "react";
import { MOCK_TOKENS, formatNum } from "@/services/mockData";
import { useApp } from "@/context/AppContext";
import TokenMomentumBar from "@/features/conversion/TokenMomentumBar";
import BuyPressureIndicator from "@/features/conversion/BuyPressureIndicator";
import LiveActivityFeed from "@/features/conversion/LiveActivityFeed";
import FOMOBanner from "@/features/conversion/FOMOBanner";
import BuySellUI from "@/features/payments/BuySellUI";

function SuccessScreen({ symbol, onClose }: { symbol: string; onClose: () => void }) {
  return (
    <div
      className="slide-up"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(13,14,20,0.97)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 200,
        padding: 32,
      }}
    >
      <div style={{ fontSize: 72, marginBottom: 24, animation: "spin-slow 2s linear 1" }}>✅</div>
      <h2 style={{ fontSize: 26, fontWeight: 800, color: "#10f090", marginBottom: 10 }}>Purchase Complete!</h2>
      <p style={{ fontSize: 15, color: "#888", textAlign: "center", marginBottom: 32 }}>
        Your {symbol} tokens are now in your wallet. Welcome to the community!
      </p>
      <button
        onClick={onClose}
        style={{
          padding: "14px 48px",
          background: "linear-gradient(135deg,#8b5cf6,#06d6f7)",
          border: "none",
          borderRadius: 14,
          color: "#fff",
          fontSize: 15,
          fontWeight: 800,
          cursor: "pointer",
        }}
      >
        View Portfolio
      </button>
    </div>
  );
}

export default function TokenPage() {
  const { navigate, selectedTokenId } = useApp();
  const [success, setSuccess] = useState(false);

  const token = MOCK_TOKENS.find((t) => t.id === selectedTokenId);
  if (!token) {
    return (
      <div style={{ padding: 32, textAlign: "center", color: "#888" }}>
        Token not found.
        <br />
        <button onClick={() => navigate("discovery")} style={{ color: "#8b5cf6", marginTop: 12, background: "none", border: "none", cursor: "pointer" }}>
          Go back
        </button>
      </div>
    );
  }

  const isPositive = token.change24h >= 0;

  if (success) {
    return (
      <SuccessScreen
        symbol={token.symbol}
        onClose={() => {
          setSuccess(false);
          navigate("profile");
        }}
      />
    );
  }

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "14px 16px",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          flexShrink: 0,
        }}
      >
        <button
          onClick={() => navigate("discovery")}
          style={{
            background: "rgba(255,255,255,0.08)",
            border: "none",
            borderRadius: 8,
            color: "#e8e9f0",
            padding: "6px 10px",
            cursor: "pointer",
            fontSize: 18,
            WebkitTapHighlightColor: "transparent",
          }}
        >
          ←
        </button>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: "linear-gradient(135deg,#8b5cf620,#06d6f720)",
            border: "1px solid rgba(139,92,246,0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 18,
          }}
        >
          {token.emoji}
        </div>
        <div>
          <h1 style={{ fontSize: 16, fontWeight: 800, color: "#e8e9f0" }}>{token.name}</h1>
          <p style={{ fontSize: 11, color: "#666" }}>by {token.creatorName}</p>
        </div>
        <div style={{ marginLeft: "auto", textAlign: "right" }}>
          <div style={{ fontSize: 16, fontFamily: "monospace", fontWeight: 800, color: "#e8e9f0" }}>
            ${token.priceUsdc.toFixed(4)}
          </div>
          <div style={{ fontSize: 12, fontFamily: "monospace", fontWeight: 700, color: isPositive ? "#10f090" : "#f05050" }}>
            {isPositive ? "+" : ""}{token.change24h.toFixed(1)}%
          </div>
        </div>
      </div>

      <div className="scrollable" style={{ flex: 1, padding: "16px", paddingBottom: 90 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {[
            { label: "Market Cap", value: `$${formatNum(token.marketCap)}` },
            { label: "Holders", value: formatNum(token.holders, 0) },
            { label: "Vol 24h", value: `$${formatNum(token.volume24h)}` },
          ].map((s) => (
            <div
              key={s.label}
              style={{
                flex: 1,
                padding: "10px 8px",
                background: "rgba(255,255,255,0.04)",
                borderRadius: 10,
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 13, fontFamily: "monospace", fontWeight: 700, color: "#e8e9f0" }}>
                {s.value}
              </div>
              <div style={{ fontSize: 10, color: "#666", marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        <FOMOBanner
          curvePercent={token.curvePercent}
          change24h={token.change24h}
          volume24h={token.volume24h}
          symbol={token.symbol}
        />

        <div
          style={{
            padding: "14px",
            background: "rgba(255,255,255,0.04)",
            borderRadius: 14,
            marginBottom: 14,
          }}
        >
          <TokenMomentumBar curvePercent={token.curvePercent} />
          <BuyPressureIndicator buyPressure={token.buyPressure} />
        </div>

        <LiveActivityFeed symbol={token.symbol} />

        <div style={{ marginBottom: 14 }}>
          <p style={{ fontSize: 13, color: "#999", lineHeight: 1.6 }}>{token.description}</p>
        </div>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
          {token.tags.map((tag) => (
            <span
              key={tag}
              style={{
                padding: "4px 10px",
                background: "rgba(139,92,246,0.12)",
                border: "1px solid rgba(139,92,246,0.25)",
                borderRadius: 6,
                fontSize: 11,
                color: "#8b5cf6",
                fontWeight: 600,
              }}
            >
              {tag}
            </span>
          ))}
        </div>

        <div
          style={{
            padding: "16px",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 14,
          }}
        >
          <BuySellUI token={token} onSuccess={() => setSuccess(true)} />
        </div>

        <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {[
            { label: "Total Supply", value: formatNum(token.totalSupply, 0) },
            { label: "Circulating", value: formatNum(token.circulatingSupply, 0) },
            { label: "Locked", value: formatNum(token.lockedSupply, 0) },
            { label: "Burned", value: formatNum(token.burnedSupply, 0) },
          ].map((s) => (
            <div
              key={s.label}
              style={{
                padding: "10px 12px",
                background: "rgba(255,255,255,0.03)",
                borderRadius: 10,
              }}
            >
              <div style={{ fontSize: 12, fontFamily: "monospace", fontWeight: 700, color: "#ccc" }}>
                {s.value}
              </div>
              <div style={{ fontSize: 10, color: "#666", marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
