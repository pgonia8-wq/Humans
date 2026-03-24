import { memo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, RefreshCw, Download, Lightbulb } from "lucide-react";

interface FABProps {
  onRefresh: () => void;
}

export const FAB = memo(function FAB({ onRefresh }: FABProps) {
  const [open, setOpen] = useState(false);

  const actions = [
    {
      icon: RefreshCw,
      label: "Refresh",
      color: "#34d399",
      onClick: () => { onRefresh(); setOpen(false); },
    },
    {
      icon: Download,
      label: "Export",
      color: "#60a5fa",
      onClick: () => setOpen(false),
    },
    {
      icon: Lightbulb,
      label: "Insights",
      color: "#a78bfa",
      onClick: () => setOpen(false),
    },
  ];

  return (
    <div className="fixed bottom-6 right-5 z-40 flex flex-col items-end gap-2.5">
      <AnimatePresence>
        {open && actions.map((a, i) => (
          <motion.button
            key={a.label}
            initial={{ opacity: 0, y: 12, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.8 }}
            transition={{ duration: 0.2, delay: i * 0.05 }}
            onClick={a.onClick}
            className="flex items-center gap-2.5 px-3.5 py-2 rounded-2xl active:scale-95 transition-transform"
            style={{
              background: "rgba(10,10,22,0.85)",
              border: "1px solid rgba(255,255,255,0.08)",
              backdropFilter: "blur(16px)",
            }}
          >
            <a.icon size={14} style={{ color: a.color }} />
            <span className="text-xs text-white/70 font-medium">{a.label}</span>
          </motion.button>
        ))}
      </AnimatePresence>

      <motion.button
        onClick={() => setOpen((o) => !o)}
        whileTap={{ scale: 0.92 }}
        className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-xl"
        style={{
          background: "linear-gradient(135deg, #7c3aed, #059669)",
          boxShadow: "0 4px 24px rgba(109,40,217,0.45)",
        }}
        data-testid="fab-button"
      >
        <motion.div animate={{ rotate: open ? 45 : 0 }} transition={{ duration: 0.2 }}>
          <Sparkles size={18} className="text-white" />
        </motion.div>
      </motion.button>
    </div>
  );
});
