import { memo, useState } from "react";
import { motion } from "framer-motion";
import { CalendarDays } from "lucide-react";

export type DateRange = "7d" | "30d" | "90d";

interface FiltersBarProps {
  onRangeChange?: (range: DateRange) => void;
}

const RANGES: { key: DateRange; label: string }[] = [
  { key: "7d", label: "7 días" },
  { key: "30d", label: "30 días" },
  { key: "90d", label: "90 días" },
];

export const FiltersBar = memo(function FiltersBar({ onRangeChange }: FiltersBarProps) {
  const [range, setRange] = useState<DateRange>("7d");

  const handleChange = (r: DateRange) => {
    setRange(r);
    onRangeChange?.(r);
  };

  return (
    <div className="flex items-center gap-2">
      <CalendarDays size={13} className="text-white/25 shrink-0" />
      <div className="flex gap-1">
        {RANGES.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => handleChange(key)}
            className="relative px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-all duration-200 active:scale-95"
            style={{
              color: range === key ? "#fff" : "rgba(255,255,255,0.3)",
              background: range === key ? "rgba(109,40,217,0.35)" : "transparent",
              border: range === key ? "1px solid rgba(109,40,217,0.4)" : "1px solid transparent",
            }}
          >
            {range === key && (
              <motion.div
                layoutId="filter-pill"
                className="absolute inset-0 rounded-xl"
                style={{ background: "rgba(109,40,217,0.2)" }}
                transition={{ type: "spring", damping: 22, stiffness: 300 }}
              />
            )}
            <span className="relative">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
});
