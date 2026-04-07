import { memo } from "react";
import { motion } from "framer-motion";
import { ChevronUp } from "lucide-react";
import { HERO_GLASS } from "../../lib/tokens";
import { useCountUp } from "../../hooks/useCountUp";

interface EarningsHeroProps {
  totalEarnings: number;
}

export const EarningsHero = memo(function EarningsHero({ totalEarnings }: EarningsHeroProps) {
  const animatedEarnings = useCountUp(totalEarnings, 1400, 4);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className="relative rounded-3xl overflow-hidden p-6"
      style={HERO_GLASS}
      data-testid="earnings-hero"
    >
      <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-emerald-500/8 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-12 -left-12 w-40 h-40 rounded-full bg-violet-500/8 blur-3xl pointer-events-none" />

      <div className="relative">
        <div className="flex items-center gap-2 mb-2">
          <motion.div
            className="w-2 h-2 rounded-full bg-emerald-400"
            animate={{ scale: [1, 1.4, 1], opacity: [1, 0.6, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <span className="text-[10px] text-emerald-300/70 font-semibold uppercase tracking-widest">Total Earnings</span>
        </div>

        <div className="flex items-end gap-2 mb-3">
          <span
            className="text-5xl font-black tracking-tighter leading-none"
            style={{
              background: "linear-gradient(135deg, #34d399 0%, #a78bfa 50%, #60a5fa 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              filter: "drop-shadow(0 0 20px rgba(52,211,153,0.3))",
            }}
            data-testid="total-earnings"
          >
            {animatedEarnings.toFixed(4)}
          </span>
          <span className="text-base font-bold text-white/50 mb-1.5">WLD</span>
        </div>

        <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-medium">
          <ChevronUp size={12} />
          <span>Tu contenido trabaja para ti 24/7</span>
        </div>
      </div>
    </motion.div>
  );
});
