import { useEffect, useState } from "react";

interface Props {
  curvePercent: number;
  change24h: number;
  volume24h: number;
  symbol: string;
}

interface Message {
  text: string;
  colorClass: string;
  bgClass: string;
  borderClass: string;
  icon: string;
}

function buildMessages(curvePercent: number, change24h: number, volume24h: number, symbol: string): Message[] {
  const msgs: Message[] = [];

  if (curvePercent < 20) {
    msgs.push({ text: `Only ${curvePercent.toFixed(0)}% of the curve filled — early mover advantage`, colorClass: "text-green-400", bgClass: "bg-green-500/8", borderClass: "border-green-500/20", icon: "🚀" });
  } else if (curvePercent < 50) {
    msgs.push({ text: `${curvePercent.toFixed(0)}% through the curve — momentum building`, colorClass: "text-cyan-400", bgClass: "bg-cyan-500/8", borderClass: "border-cyan-500/20", icon: "📈" });
  } else if (curvePercent < 80) {
    msgs.push({ text: `${curvePercent.toFixed(0)}% filled — high conviction buyers accumulating`, colorClass: "text-yellow-400", bgClass: "bg-yellow-500/8", borderClass: "border-yellow-500/20", icon: "🔥" });
  } else {
    msgs.push({ text: `${curvePercent.toFixed(0)}% complete — last chance before graduation`, colorClass: "text-red-400", bgClass: "bg-red-500/8", borderClass: "border-red-500/20", icon: "⚠️" });
  }

  if (change24h > 50) {
    msgs.push({ text: `+${change24h.toFixed(1)}% in 24h — one of today's top performers`, colorClass: "text-green-400", bgClass: "bg-green-500/8", borderClass: "border-green-500/20", icon: "💹" });
  } else if (change24h > 10) {
    msgs.push({ text: `Up ${change24h.toFixed(1)}% in the last 24 hours`, colorClass: "text-cyan-400", bgClass: "bg-cyan-500/8", borderClass: "border-cyan-500/20", icon: "📊" });
  }

  if (volume24h > 50000) {
    msgs.push({ text: `$${(volume24h / 1000).toFixed(0)}K volume in 24h — strong liquidity`, colorClass: "text-violet-400", bgClass: "bg-violet-500/8", borderClass: "border-violet-500/20", icon: "💧" });
  }

  return msgs;
}

export default function FOMOBanner({ curvePercent, change24h, volume24h, symbol }: Props) {
  const messages = buildMessages(curvePercent, change24h, volume24h, symbol);
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (messages.length <= 1) return;
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIdx((i) => (i + 1) % messages.length);
        setVisible(true);
      }, 300);
    }, 3500);
    return () => clearInterval(interval);
  }, [messages.length]);

  if (messages.length === 0) return null;
  const msg = messages[idx % messages.length];

  return (
    <div className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl ${msg.bgClass} border ${msg.borderClass} transition-all duration-300 ${visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-1"}`}>
      <span className="text-base shrink-0">{msg.icon}</span>
      <span className={`text-[11px] ${msg.colorClass} font-semibold leading-snug`}>{msg.text}</span>
    </div>
  );
}
