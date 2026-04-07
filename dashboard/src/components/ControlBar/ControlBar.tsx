import { memo } from "react";
import { motion } from "framer-motion";
import { Zap, Megaphone, ArrowDownToLine, ToggleLeft, ToggleRight } from "lucide-react";
import type { MonetizationSettings } from "../../hooks/useMonetizationSettings";

interface ControlBarProps {
  settings: MonetizationSettings;
  onUpdateSettings: (patch: Partial<MonetizationSettings>) => void;
  onSwitchToAdvertiser: () => void;
  onOpenWithdraw: () => void;
  totalEarnings: number;
}

export const ControlBar = memo(function ControlBar({
  settings,
  onUpdateSettings,
  onSwitchToAdvertiser,
  onOpenWithdraw,
  totalEarnings,
}: ControlBarProps) {
  const adsOn = settings.ads_enabled;

  return (
    <div
      className="rounded-2xl p-3.5 flex items-center gap-2.5"
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      {/* Monetization toggle */}
      <motion.button
        whileTap={{ scale: 0.94 }}
        onClick={() => onUpdateSettings({ ads_enabled: !adsOn })}
        className="flex items-center gap-2 flex-1 py-2 px-3 rounded-xl transition-all"
        style={{
          background: adsOn ? "rgba(52,211,153,0.12)" : "rgba(255,255,255,0.04)",
          border: adsOn ? "1px solid rgba(52,211,153,0.2)" : "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {adsOn ? (
          <ToggleRight size={16} className="text-emerald-400 shrink-0" />
        ) : (
          <ToggleLeft size={16} className="text-white/30 shrink-0" />
        )}
        <div className="text-left min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: adsOn ? "#34d399" : "rgba(255,255,255,0.3)" }}>
            {adsOn ? "Monetización ON" : "Monetización OFF"}
          </p>
        </div>
      </motion.button>

      {/* Campaign button */}
      <motion.button
        whileTap={{ scale: 0.92 }}
        onClick={onSwitchToAdvertiser}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold text-white/70 transition-all shrink-0"
        style={{ background: "rgba(96,165,250,0.1)", border: "1px solid rgba(96,165,250,0.18)" }}
      >
        <Megaphone size={13} className="text-blue-400" />
        Campaña
      </motion.button>

      {/* Withdraw button */}
      <motion.button
        whileTap={{ scale: 0.92 }}
        onClick={onOpenWithdraw}
        disabled={totalEarnings <= 0}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold transition-all shrink-0 disabled:opacity-30"
        style={{
          background: totalEarnings > 0 ? "rgba(167,139,250,0.15)" : "rgba(255,255,255,0.04)",
          border: totalEarnings > 0 ? "1px solid rgba(167,139,250,0.25)" : "1px solid rgba(255,255,255,0.06)",
          color: totalEarnings > 0 ? "#a78bfa" : "rgba(255,255,255,0.3)",
        }}
      >
        <ArrowDownToLine size={13} />
        Retirar
      </motion.button>
    </div>
  );
});
