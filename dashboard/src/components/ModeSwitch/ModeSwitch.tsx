import { memo } from "react";
import { motion } from "framer-motion";
import { LayoutDashboard, Megaphone } from "lucide-react";

export type DashboardMode = "creator" | "advertiser";

interface ModeSwitchProps {
  mode: DashboardMode;
  onChange: (mode: DashboardMode) => void;
}

const MODES: { key: DashboardMode; label: string; icon: React.ElementType }[] = [
  { key: "creator", label: "Creator", icon: LayoutDashboard },
  { key: "advertiser", label: "Advertiser", icon: Megaphone },
];

export const ModeSwitch = memo(function ModeSwitch({ mode, onChange }: ModeSwitchProps) {
  return (
    <div
      className="flex rounded-2xl p-1 gap-1"
      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
    >
      {MODES.map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className="relative flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 active:scale-95"
          style={{
            color: mode === key ? "#fff" : "rgba(255,255,255,0.35)",
          }}
        >
          {mode === key && (
            <motion.div
              layoutId="mode-pill"
              className="absolute inset-0 rounded-xl"
              style={{
                background: "linear-gradient(135deg, rgba(109,40,217,0.6), rgba(16,185,129,0.4))",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
              transition={{ type: "spring", damping: 22, stiffness: 300 }}
            />
          )}
          <span className="relative flex items-center gap-1.5">
            <Icon size={13} />
            {label}
          </span>
        </button>
      ))}
    </div>
  );
});
