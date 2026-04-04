import { useEffect, useState, useRef } from "react";
import { timeAgo } from "@/services/mockData";

interface FeedEntry {
  id: string;
  type: "buy" | "sell" | "airdrop";
  username: string;
  amount: number;
  symbol: string;
  timestamp: string;
  isNew?: boolean;
}

const USERNAMES = ["alex.eth", "maya.eth", "carlos.eth", "yuki.eth", "priya.eth", "tom.eth", "sara.eth", "dev.eth"];

function randomEntry(symbol: string): FeedEntry {
  const types: FeedEntry["type"][] = ["buy", "buy", "buy", "sell", "airdrop"];
  const type = types[Math.floor(Math.random() * types.length)];
  const amount = type === "airdrop" ? 10 : Math.floor(Math.random() * 900 + 50);
  return {
    id: Math.random().toString(36).slice(2),
    type,
    username: USERNAMES[Math.floor(Math.random() * USERNAMES.length)],
    amount,
    symbol,
    timestamp: new Date().toISOString(),
    isNew: true,
  };
}

interface Props {
  symbol: string;
  limit?: number;
}

export default function LiveActivityFeed({ symbol, limit = 5 }: Props) {
  const [entries, setEntries] = useState<FeedEntry[]>(() => {
    return Array.from({ length: 3 }, () => ({
      ...randomEntry(symbol),
      timestamp: new Date(Date.now() - Math.random() * 300000).toISOString(),
      isNew: false,
    }));
  });
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      const entry = randomEntry(symbol);
      setEntries((prev) => {
        const next = [entry, ...prev].slice(0, limit);
        setTimeout(() => {
          setEntries((p) => p.map((e) => (e.id === entry.id ? { ...e, isNew: false } : e)));
        }, 500);
        return next;
      });
    }, 3500 + Math.random() * 2000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [symbol, limit]);

  const color = (type: FeedEntry["type"]) => {
    if (type === "buy") return "#10f090";
    if (type === "sell") return "#f05050";
    return "#8b5cf6";
  };

  const label = (type: FeedEntry["type"]) => {
    if (type === "buy") return "bought";
    if (type === "sell") return "sold";
    return "claimed";
  };

  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 11, color: "#888", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>
          Live Activity
        </span>
        <span style={{ fontSize: 10, color: "#10f090", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10f090", display: "inline-block", animation: "btn-pulse 1.5s infinite" }} />
          LIVE
        </span>
      </div>
      <div
        style={{
          background: "rgba(255,255,255,0.04)",
          borderRadius: 10,
          overflow: "hidden",
        }}
      >
        {entries.map((e, i) => (
          <div
            key={e.id}
            className={e.isNew ? (e.type === "sell" ? "flash-red" : "flash-green") : ""}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "8px 12px",
              borderBottom: i < entries.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
              transition: "background 0.3s",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: color(e.type), textTransform: "uppercase" }}>
                {label(e.type)}
              </span>
              <span style={{ fontSize: 11, color: "#ccc" }}>{e.username}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 11, fontFamily: "monospace", fontWeight: 700, color: color(e.type) }}>
                {e.amount.toLocaleString()} {e.symbol}
              </span>
              <span style={{ fontSize: 10, color: "#555" }}>{timeAgo(e.timestamp)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
