import type { Token } from "@/services/mockData";
import { formatNum } from "@/services/mockData";

interface Props {
  token: Token;
  onClick: () => void;
  variant?: "list" | "compact" | "hot";
}

export default function TokenCard({ token, onClick, variant = "list" }: Props) {
  const isPositive = token.change24h >= 0;
  const momentumColor =
    token.curvePercent > 70 ? "#f05050" : token.curvePercent > 40 ? "#f7a606" : "#10f090";

  if (variant === "hot") {
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
        <div
          style={{
            fontSize: 13,
            fontFamily: "monospace",
            fontWeight: 800,
            color: isPositive ? "#10f090" : "#f05050",
          }}
        >
          {isPositive ? "+" : ""}{token.change24h.toFixed(0)}%
        </div>
      </button>
    );
  }

  if (variant === "compact") {
    return (
      <button
        onClick={onClick}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 12px",
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 12,
          width: "100%",
          cursor: "pointer",
          textAlign: "left",
          WebkitTapHighlightColor: "transparent",
          marginBottom: 6,
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: "rgba(139,92,246,0.15)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 18,
            flexShrink: 0,
          }}
        >
          {token.emoji}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontWeight: 700, fontSize: 13, color: "#e8e9f0" }}>{token.symbol}</span>
            <span style={{ fontSize: 13, fontFamily: "monospace", fontWeight: 700, color: "#e8e9f0" }}>
              ${token.priceUsdc.toFixed(4)}
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2 }}>
            <span style={{ fontSize: 11, color: "#666" }}>{token.name}</span>
            <span style={{ fontSize: 11, fontFamily: "monospace", fontWeight: 700, color: isPositive ? "#10f090" : "#f05050" }}>
              {isPositive ? "+" : ""}{token.change24h.toFixed(1)}%
            </span>
          </div>
        </div>
      </button>
    );
  }

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
        marginBottom: 8,
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: "50%",
          background: "linear-gradient(135deg,rgba(139,92,246,0.2),rgba(6,214,247,0.1))",
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
                background: `${momentumColor}18`,
                color: momentumColor,
                fontWeight: 600,
                letterSpacing: "0.05em",
              }}
            >
              {token.curvePercent}%
            </span>
          </div>
          <span style={{ fontSize: 12, fontFamily: "monospace", fontWeight: 700, color: isPositive ? "#10f090" : "#f05050" }}>
            {isPositive ? "+" : ""}{token.change24h.toFixed(1)}%
          </span>
        </div>
        <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
          <span style={{ fontSize: 10, color: "#666" }}>MC ${formatNum(token.marketCap)}</span>
          <span style={{ fontSize: 10, color: "#666" }}>{formatNum(token.holders, 0)} holders</span>
          <span style={{ fontSize: 10, color: "#666" }}>Vol ${formatNum(token.volume24h)}</span>
        </div>
      </div>
    </button>
  );
}
