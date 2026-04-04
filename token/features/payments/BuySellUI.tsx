import { useState, useEffect } from "react";
import { useApp } from "@/context/AppContext";
import type { Token } from "@/services/mockData";

type Tab = "buy" | "sell";

const URGENCY_MESSAGES = [
  "🚀 Early buyers see the highest returns",
  "💡 Price increases as more people buy",
  "🔥 Hold for governance rights + yield",
  "⚡ Bonding curve price locks in your advantage",
  "🌍 Join verified humans buying right now",
];

interface Props {
  token: Token;
  onSuccess: () => void;
}

export default function BuySellUI({ token, onSuccess }: Props) {
  const { balanceWld, balanceUsdc, updateBalance, emitToBridge, user } = useApp();
  const [tab, setTab] = useState<Tab>("buy");
  const [amount, setAmount] = useState("10");
  const [currency, setCurrency] = useState<"WLD" | "USDC">("USDC");
  const [loading, setLoading] = useState(false);
  const [urgencyIdx, setUrgencyIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setUrgencyIdx((i) => (i + 1) % URGENCY_MESSAGES.length), 3000);
    return () => clearInterval(t);
  }, []);

  const numAmount = parseFloat(amount) || 0;
  const balance = currency === "WLD" ? balanceWld : balanceUsdc;
  const price = currency === "WLD" ? token.priceWld : token.priceUsdc;
  const tokensOut = price > 0 ? numAmount / price : 0;
  const total = numAmount;
  const insufficientFunds = tab === "buy" && numAmount > balance;

  const multiplier = Math.max(1, (100 - token.curvePercent) / 20 + 1).toFixed(1);
  const projectedGain = tokensOut * price * (1 + token.change24h / 100);

  const handleSubmit = async () => {
    if (!numAmount || numAmount <= 0) return;
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1200));

    if (tab === "buy") {
      const newWld = currency === "WLD" ? balanceWld - numAmount : balanceWld;
      const newUsdc = currency === "USDC" ? balanceUsdc - numAmount : balanceUsdc;
      updateBalance(newWld, newUsdc);
      emitToBridge("onTokenPurchased", {
        tokenId: token.id,
        tokenSymbol: token.symbol,
        amount: tokensOut,
        totalPaid: total,
        currency,
        userId: user?.id,
      });
      emitToBridge("onBalanceUpdate", { balanceWld: newWld, balanceUsdc: newUsdc });
    } else {
      const revenue = numAmount * price;
      updateBalance(
        currency === "WLD" ? balanceWld + revenue : balanceWld,
        currency === "USDC" ? balanceUsdc + revenue : balanceUsdc,
      );
    }

    setLoading(false);
    onSuccess();
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        {(["buy", "sell"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              flex: 1,
              padding: "10px",
              borderRadius: 10,
              border: "none",
              cursor: "pointer",
              fontWeight: 700,
              fontSize: 13,
              background: tab === t
                ? t === "buy"
                  ? "linear-gradient(135deg,#8b5cf6,#6d3fcf)"
                  : "rgba(240,80,80,0.2)"
                : "rgba(255,255,255,0.06)",
              color: tab === t ? (t === "buy" ? "#fff" : "#f05050") : "#888",
              transition: "all 0.2s",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            {t === "buy" ? "🟢 BUY" : "🔴 SELL"}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        {(["USDC", "WLD"] as const).map((c) => (
          <button
            key={c}
            onClick={() => setCurrency(c)}
            style={{
              padding: "5px 12px",
              borderRadius: 8,
              border: `1px solid ${currency === c ? "#8b5cf6" : "rgba(255,255,255,0.1)"}`,
              background: currency === c ? "rgba(139,92,246,0.15)" : "transparent",
              color: currency === c ? "#8b5cf6" : "#888",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            {c}
          </button>
        ))}
        <span style={{ marginLeft: "auto", fontSize: 11, color: "#555", alignSelf: "center" }}>
          Bal: <span style={{ color: "#888", fontFamily: "monospace" }}>{balance.toFixed(2)} {currency}</span>
        </span>
      </div>

      <div style={{ position: "relative", marginBottom: 10 }}>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          style={{
            width: "100%",
            padding: "14px 70px 14px 14px",
            background: "rgba(255,255,255,0.06)",
            border: `1px solid ${insufficientFunds ? "#f05050" : "rgba(255,255,255,0.12)"}`,
            borderRadius: 12,
            color: "#e8e9f0",
            fontSize: 20,
            fontFamily: "monospace",
            fontWeight: 700,
            outline: "none",
          }}
        />
        <span
          style={{
            position: "absolute",
            right: 14,
            top: "50%",
            transform: "translateY(-50%)",
            fontSize: 13,
            fontWeight: 700,
            color: "#888",
          }}
        >
          {currency}
        </span>
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        {[10, 25, 50, 100].map((v) => (
          <button
            key={v}
            onClick={() => setAmount(String(v))}
            style={{
              flex: 1,
              padding: "6px 0",
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 8,
              color: "#888",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            {v}
          </button>
        ))}
      </div>

      {tab === "buy" && tokensOut > 0 && (
        <div
          style={{
            padding: "10px 14px",
            background: "rgba(139,92,246,0.08)",
            border: "1px solid rgba(139,92,246,0.2)",
            borderRadius: 10,
            marginBottom: 12,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ fontSize: 12, color: "#888" }}>You receive</span>
            <span style={{ fontSize: 13, fontFamily: "monospace", fontWeight: 700, color: "#e8e9f0" }}>
              {tokensOut.toLocaleString(undefined, { maximumFractionDigits: 2 })} {token.symbol}
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ fontSize: 12, color: "#888" }}>Early buyer boost</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#10f090" }}>{multiplier}x multiplier</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: 12, color: "#888" }}>Projected value (24h trend)</span>
            <span style={{ fontSize: 12, fontFamily: "monospace", fontWeight: 700, color: "#06d6f7" }}>
              ${projectedGain.toFixed(2)}
            </span>
          </div>
        </div>
      )}

      <div
        style={{
          textAlign: "center",
          padding: "8px",
          marginBottom: 12,
          fontSize: 12,
          color: "#8b5cf6",
          fontWeight: 600,
          opacity: 0.9,
          minHeight: 20,
          transition: "opacity 0.3s",
        }}
      >
        {URGENCY_MESSAGES[urgencyIdx]}
      </div>

      <button
        onClick={handleSubmit}
        disabled={loading || insufficientFunds || numAmount <= 0}
        className={!loading && !insufficientFunds && numAmount > 0 && tab === "buy" ? "btn-pulse" : ""}
        style={{
          width: "100%",
          padding: "16px",
          borderRadius: 14,
          border: "none",
          cursor: loading || insufficientFunds ? "not-allowed" : "pointer",
          fontSize: 15,
          fontWeight: 800,
          letterSpacing: "0.02em",
          background:
            insufficientFunds
              ? "#f05050"
              : tab === "buy"
              ? "linear-gradient(135deg,#8b5cf6,#06d6f7)"
              : "linear-gradient(135deg,#f05050,#f7a606)",
          color: "#fff",
          opacity: loading ? 0.7 : 1,
          transition: "opacity 0.2s",
          WebkitTapHighlightColor: "transparent",
        }}
      >
        {loading
          ? "Processing..."
          : insufficientFunds
          ? "Insufficient Balance"
          : tab === "buy"
          ? `Buy ${token.symbol} for ${numAmount} ${currency}`
          : `Sell ${amount} ${token.symbol}`}
      </button>

      {insufficientFunds && (
        <p style={{ textAlign: "center", fontSize: 11, color: "#f05050", marginTop: 8 }}>
          You need {(numAmount - balance).toFixed(2)} more {currency}
        </p>
      )}
    </div>
  );
}
