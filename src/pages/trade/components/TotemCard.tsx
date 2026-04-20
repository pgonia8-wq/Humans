/**
 * TotemCard.tsx — Tarjeta de Totem en el listado del mercado
 */

import { TrendingUp, TrendingDown } from "lucide-react";
import type { TotemProfile } from "../../../lib/tradeApi";

interface Props {
  totem:   TotemProfile;
  rank:    number;
  isDark:  boolean;
  onClick: () => void;
}

const BADGES: Record<string, string> = {
  Newcomer: "🌱", Builder: "🔨", Warrior: "⚔️", Champion: "🏆", Legend: "👑",
};

export default function TotemCard({ totem, rank, isDark, onClick }: Props) {
  const bg     = isDark ? "rgba(255,255,255,0.05)" : "#ffffff";
  const border = isDark ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.09)";
  const txt    = isDark ? "#e5e7eb" : "#111827";
  const sub    = isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.45)";

  const rankColor = rank === 1 ? "#f59e0b" : rank === 2 ? "#9ca3af" : rank === 3 ? "#cd7c2f" : sub;

  return (
    <button
      onClick={onClick}
      style={{
        width: "100%", textAlign: "left",
        background: bg, borderRadius: 14,
        border: `1px solid ${border}`,
        padding: "12px 14px",
        cursor: "pointer", transition: "all 0.15s",
        display: "flex", alignItems: "center", gap: 12,
      }}
    >
      {/* Rank */}
      <span style={{ fontSize: 11, fontWeight: 800, color: rankColor, width: 18, flexShrink: 0 }}>
        #{rank}
      </span>

      {/* Badge + Name */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
          <span style={{ fontSize: 16 }}>{BADGES[totem.badge] ?? "🌱"}</span>
          <span style={{ color: txt, fontSize: 13, fontWeight: 700,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {totem.name}
          </span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 10, color: sub }}>{totem.badge}</span>
          <span style={{ fontSize: 10, color: sub }}>·</span>
          <span style={{ fontSize: 10, color: sub }}>
            Vol: {totem.volume_24h.toFixed(1)} WLD
          </span>
        </div>
      </div>

      {/* Price */}
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div style={{ color: txt, fontSize: 12, fontWeight: 800 }}>
          {totem.price.toFixed(8)}
        </div>
        <div style={{ color: sub, fontSize: 10 }}>WLD</div>
      </div>

      {/* Supply chip */}
      <div style={{
        background: isDark ? "rgba(99,102,241,0.12)" : "rgba(99,102,241,0.08)",
        borderRadius: 8, padding: "3px 8px", flexShrink: 0,
      }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: "#6366f1" }}>
          {totem.supply.toLocaleString()}
        </span>
      </div>
    </button>
  );
}
