import { memo } from "react";
import { motion } from "framer-motion";
import { BarChart2, RefreshCw } from "lucide-react";

interface EmptyStatePremiumProps {
  onRefresh?: () => void;
}

export const EmptyStatePremium = memo(function EmptyStatePremium({ onRefresh }: EmptyStatePremiumProps) {
  return (
    <motion.div
      className="flex flex-col items-center justify-center py-20 px-6 text-center"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div
        className="w-20 h-20 rounded-3xl mb-6 flex items-center justify-center"
        style={{
          background: "linear-gradient(135deg, rgba(109,40,217,0.2), rgba(16,185,129,0.2))",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
        animate={{ scale: [1, 1.04, 1] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      >
        <BarChart2 size={32} className="text-violet-400" />
      </motion.div>
      <h3 className="text-lg font-bold text-white/80 mb-2">Sin datos aún</h3>
      <p className="text-sm text-white/35 max-w-xs leading-relaxed mb-6">
        Crea contenido y activa anuncios para comenzar a ver tus ganancias aquí.
      </p>
      {onRefresh && (
        <button
          onClick={onRefresh}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-all duration-200 active:scale-95"
          style={{
            background: "linear-gradient(135deg, rgba(109,40,217,0.5), rgba(16,185,129,0.4))",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <RefreshCw size={14} />
          Actualizar
        </button>
      )}
    </motion.div>
  );
});
