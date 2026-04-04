import { useEffect, useState } from "react";

interface Props {
  curvePercent: number;
  change24h: number;
  volume24h: number;
  symbol: string;
}

interface Message {
  text: string;
  color: string;
  icon: string;
}

function buildMessages(curvePercent: number, change24h: number, volume24h: number, symbol: string): Message[] {
  const msgs: Message[] = [];

  if (curvePercent < 20) {
    msgs.push({ text: `Only ${curvePercent}% of the curve filled — early mover advantage`, color: "#10f090", icon: "🚀" });
  } else if (curvePercent < 50) {
    msgs.push({ text: `${curvePercent}% through the curve — momentum building`, color: "#06d6f7", icon: "📈" });
  } else if (curvePercent < 80) {
    msgs.push({ text: `${curvePercent}% filled — high conviction buyers accumulating`, color: "#f7a606", icon: "🔥" });
  } else {
    msgs.push({ text: `${curvePercent}% complete — last chance to enter early`, color: "#f05050", icon: "⚠️" });
  }

  if (change24h > 50) {
    msgs.push({ text: `+${change24h.toFixed(1)}% in 24h — one of today's top performers`, color: "#10f090", icon: "💹" });
  } else if (change24h > 10) {
    msgs.push({ text: `Up ${change24h.toFixed(1)}% in the last 24 hours`, color: "#06d6f7", icon: "📊" });
  }

  if (volume24h > 50000) {
    msgs.push({ text: `$${(volume24h / 1000).toFixed(0)}K volume in 24h — strong liquidity`, color: "#8b5cf6", icon: "💧" });
  }

  msgs.push({ text: `Join the ${symbol} community — governance rights included`, color: "#8b5cf6", icon: "🏛️" });

  return msgs;
}

export default function FOMOBanner({ curvePercent, change24h, volume24h, symbol }: Props) {
  const messages = buildMessages(curvePercent, change24h, volume24h, symbol);
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIdx((i) => (i + 1) % messages.length);
        setVisible(true);
      }, 300);
    }, 3500);
    return () => clearInterval(interval);
  }, [messages.length]);

  const msg = messages[idx];

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "10px 14px",
        borderRadius: 10,
        background: `${msg.color}12`,
        border: `1px solid ${msg.color}30`,
        marginBottom: 14,
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(-4px)",
        transition: "opacity 0.3s, transform 0.3s",
      }}
    >
      <span style={{ fontSize: 16 }}>{msg.icon}</span>
      <span style={{ fontSize: 12, color: msg.color, fontWeight: 600, lineHeight: 1.4 }}>
        {msg.text}
      </span>
    </div>
  );
}
