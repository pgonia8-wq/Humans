/**
   * TokenRow — Fila de la lista de mercado. Glass premium 2026.
   */
  import { motion } from "framer-motion";
  import type { Enriched } from "../services/derive";
  import { formatUsd, formatWld } from "../services/derive";

  interface Props {
    t: Enriched;
    onClick: (address: string) => void;
    index?: number;
  }

  export default function TokenRow({ t, onClick, index = 0 }: Props) {
    const lvl = typeof t.level === "number" ? t.level : null;
    const levelColor =
      lvl == null ? "rgba(255,255,255,0.45)" :
      lvl >= 4    ? "#a78bfa" :
      lvl >= 3    ? "#22c55e" :
      lvl >= 2    ? "#fbbf24" :
                    "rgba(255,255,255,0.55)";

    return (
      <motion.button
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: Math.min(index * 0.03, 0.25) }}
        whileTap={{ scale: 0.985 }}
        onClick={() => onClick(t.address)}
        className="relative w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left overflow-hidden"
        style={{
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.025) 100%)",
          border: "1px solid rgba(255,255,255,0.08)",
          backdropFilter: "blur(14px) saturate(140%)",
          WebkitBackdropFilter: "blur(14px) saturate(140%)",
          boxShadow:
            "0 12px 28px -16px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.06), inset 0 -1px 0 rgba(0,0,0,0.20)",
        }}
      >
        <div
          className="flex items-center justify-center w-12 h-12 rounded-xl text-2xl shrink-0 overflow-hidden"
          style={{
            background: "linear-gradient(135deg, rgba(34,197,94,0.18), rgba(167,139,250,0.18))",
            border: "1px solid rgba(255,255,255,0.10)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.10), 0 6px 14px -8px rgba(0,0,0,0.5)",
          }}
        >
          {t.avatar
            ? <img src={t.avatar} alt={t.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : <span>{t.emoji}</span>}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-white font-semibold truncate">{t.name}</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{
              background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.65)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}>{t.symbol}</span>
          </div>
          <div className="flex items-center gap-2 mt-1 text-[11px]">
            <span style={{ color: levelColor }}>
              {lvl != null ? `L${lvl}` : "L—"} · {t.badge || "—"}
            </span>
            <span style={{ color: "rgba(255,255,255,0.35)" }}>·</span>
            <span style={{ color: "rgba(255,255,255,0.55)" }}>
              Vol {formatWld(t.volume_24h, 2)}
            </span>
          </div>
        </div>

        <div className="text-right shrink-0">
          <div className="text-white font-semibold tabular-nums">{formatUsd(t.price, 6)}</div>
          <div className="text-[11px] tabular-nums" style={{ color: "rgba(255,255,255,0.55)" }}>
            {typeof t.score === "number" ? `Score ${Math.round(t.score)}` : "Score —"}
          </div>
        </div>
      </motion.button>
    );
  }
  