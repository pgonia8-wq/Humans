import { memo } from "react";
import { motion } from "framer-motion";
import { GLASS } from "../../lib/tokens";

interface StatCardProProps {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  accentColor: string;
  delay?: number;
}

export const StatCardPro = memo(function StatCardPro({
  icon: Icon,
  label,
  value,
  sub,
  accentColor,
  delay = 0,
}: StatCardProProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      whileHover={{ y: -2, transition: { duration: 0.15 } }}
      whileTap={{ scale: 0.97 }}
      className="relative rounded-2xl overflow-hidden cursor-default p-4"
      style={GLASS}
      data-testid={`stat-card-${label.toLowerCase()}`}
    >
      <div
        className="absolute -top-6 -right-6 w-20 h-20 rounded-full opacity-20 blur-2xl"
        style={{ background: accentColor }}
      />
      <div className="flex items-start justify-between relative">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-semibold text-white/35 uppercase tracking-widest mb-1.5">{label}</p>
          <p className="text-2xl font-black text-white tracking-tight leading-none">{value}</p>
          {sub && <p className="text-[10px] text-white/25 mt-1.5">{sub}</p>}
        </div>
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `${accentColor}22`, border: `1px solid ${accentColor}33` }}
        >
          <Icon size={17} style={{ color: accentColor }} />
        </div>
      </div>
    </motion.div>
  );
});
