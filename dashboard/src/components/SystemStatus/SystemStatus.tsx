import { memo } from "react";
import { motion } from "framer-motion";
import { CheckCircle, XCircle, Activity, Megaphone, TrendingUp } from "lucide-react";

interface SystemStatusProps {
  adsEnabled: boolean;
  activeAds: number;
  campaignCount: number;
  totalEarnings: number;
  impressions: number;
}

interface StatusItemProps {
  icon: React.ElementType;
  label: string;
  value: string;
  ok: boolean;
  delay?: number;
}

const StatusItem = memo(function StatusItem({ icon: Icon, label, value, ok, delay = 0 }: StatusItemProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className="flex flex-col items-center gap-1.5 flex-1"
    >
      <div
        className="w-8 h-8 rounded-xl flex items-center justify-center"
        style={{
          background: ok ? "rgba(52,211,153,0.12)" : "rgba(255,255,255,0.05)",
          border: ok ? "1px solid rgba(52,211,153,0.2)" : "1px solid rgba(255,255,255,0.07)",
        }}
      >
        <Icon size={14} style={{ color: ok ? "#34d399" : "rgba(255,255,255,0.3)" }} />
      </div>
      <p className="text-[9px] text-white/25 uppercase tracking-widest font-semibold text-center">{label}</p>
      <p className="text-xs font-bold" style={{ color: ok ? "#34d399" : "rgba(255,255,255,0.4)" }}>{value}</p>
    </motion.div>
  );
});

export const SystemStatus = memo(function SystemStatus({
  adsEnabled,
  activeAds,
  campaignCount,
  totalEarnings,
  impressions,
}: SystemStatusProps) {
  return (
    <div
      className="rounded-2xl px-4 py-3.5"
      style={{
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div className="flex items-center gap-1.5 mb-3">
        <motion.div
          className="w-1.5 h-1.5 rounded-full bg-emerald-400"
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        <p className="text-[9px] text-white/25 uppercase tracking-widest font-semibold">Estado del sistema</p>
      </div>

      <div className="flex items-start gap-3">
        <StatusItem
          icon={adsEnabled ? CheckCircle : XCircle}
          label="Monetización"
          value={adsEnabled ? "Activa" : "Inactiva"}
          ok={adsEnabled}
          delay={0}
        />
        <div className="w-px self-stretch bg-white/5" />
        <StatusItem
          icon={Activity}
          label="Ads activos"
          value={activeAds > 0 ? String(activeAds) : "Ninguno"}
          ok={activeAds > 0}
          delay={0.05}
        />
        <div className="w-px self-stretch bg-white/5" />
        <StatusItem
          icon={Megaphone}
          label="Campañas"
          value={campaignCount > 0 ? String(campaignCount) : "Ninguna"}
          ok={campaignCount > 0}
          delay={0.1}
        />
        <div className="w-px self-stretch bg-white/5" />
        <StatusItem
          icon={TrendingUp}
          label="Ganancias"
          value={totalEarnings > 0 ? `${totalEarnings.toFixed(2)} WLD` : "Sin datos"}
          ok={totalEarnings > 0}
          delay={0.15}
        />
      </div>
    </div>
  );
});
