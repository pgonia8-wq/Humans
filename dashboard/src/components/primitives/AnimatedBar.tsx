import { memo } from "react";
import { motion } from "framer-motion";

interface AnimatedBarProps {
  label: string;
  pct: number;
  delay?: number;
}

export const AnimatedBar = memo(function AnimatedBar({ label, pct, delay = 0 }: AnimatedBarProps) {
  return (
    <motion.div
      className="flex items-center gap-3"
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay }}
    >
      <span className="text-sm text-white/65 w-32 truncate shrink-0">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-white/8 overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: "linear-gradient(90deg, #7c3aed, #34d399)" }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, delay: delay + 0.2, ease: "easeOut" }}
        />
      </div>
      <span className="text-[10px] text-white/30 w-9 text-right shrink-0 font-medium">{pct}%</span>
    </motion.div>
  );
});
