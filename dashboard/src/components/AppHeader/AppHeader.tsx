import { memo } from "react";
import { motion } from "framer-motion";
import { Sparkles, Wifi, ArrowLeft, X } from "lucide-react";

interface AppHeaderProps {
  onClose?: () => void;
  isRefreshing?: boolean;
}

export const AppHeader = memo(function AppHeader({ onClose, isRefreshing }: AppHeaderProps) {
  return (
    <div
      className="sticky top-0 z-30 flex items-center justify-between px-4 py-3"
      style={{
        background: "rgba(10,10,20,0.72)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <button
        onClick={onClose}
        className="flex items-center justify-center w-8 h-8 rounded-xl text-white/50 hover:text-white hover:bg-white/8 transition-all duration-200 active:scale-95"
        data-testid="header-back"
      >
        {onClose ? <X size={18} /> : <ArrowLeft size={18} />}
      </button>

      <div className="flex flex-col items-center">
        <div className="flex items-center gap-1.5">
          <Sparkles size={12} className="text-emerald-400" />
          <span className="text-xs font-semibold text-white/80 uppercase tracking-widest">H by Humans</span>
        </div>
        <span className="text-[10px] text-white/30 tracking-wider">Creator Dashboard</span>
      </div>

      <div className="flex items-center gap-1.5">
        <motion.div
          className="w-1.5 h-1.5 rounded-full bg-emerald-400"
          animate={{ opacity: isRefreshing ? [1, 0.2, 1] : [1, 0.5, 1] }}
          transition={{ duration: isRefreshing ? 0.5 : 2, repeat: Infinity }}
        />
        <span className="text-[10px] text-emerald-400/80 font-medium uppercase tracking-widest">
          {isRefreshing ? "Updating" : "Live"}
        </span>
        <Wifi size={11} className="text-emerald-400/60" />
      </div>
    </div>
  );
});
