import { memo } from "react";
import { motion } from "framer-motion";
import { Lightbulb, TrendingUp, AlertTriangle, Megaphone, Star, Coins } from "lucide-react";
import { SectionBlock } from "../primitives/SectionBlock";
import type { DashboardData } from "../../lib/types";

interface InsightsPanelProps {
  data: DashboardData | null;
  campaignCount: number;
  onSwitchToAdvertiser?: () => void;
}

interface Insight {
  icon: React.ElementType;
  title: string;
  description: string;
  color: string;
  bg: string;
  border: string;
  action?: string;
  onAction?: () => void;
}

export const InsightsPanel = memo(function InsightsPanel({ data, campaignCount, onSwitchToAdvertiser }: InsightsPanelProps) {
  const insights: Insight[] = [];

  const totalEarnings = data?.totalEarnings ?? 0;
  const ctr = data?.ctr ?? 0;
  const topPosts = data?.topPosts ?? [];

  if (totalEarnings === 0) {
    insights.push({
      icon: Coins,
      title: "Activa la monetización",
      description: "Aún no tienes ganancias. Activa los anuncios en tu perfil y empieza a ganar WLD por cada impresión y clic en tu contenido.",
      color: "#f59e0b",
      bg: "rgba(245,158,11,0.08)",
      border: "rgba(245,158,11,0.18)",
    });
  }

  if (ctr > 0 && ctr < 1) {
    insights.push({
      icon: AlertTriangle,
      title: "CTR bajo — mejora tu contenido",
      description: `Tu CTR actual es ${ctr.toFixed(2)}%. Un CTR saludable supera el 1%. Prueba títulos más llamativos y formatos multimedia.`,
      color: "#f87171",
      bg: "rgba(248,113,113,0.07)",
      border: "rgba(248,113,113,0.18)",
    });
  }

  if (campaignCount === 0) {
    insights.push({
      icon: Megaphone,
      title: "Crea tu primera campaña",
      description: "Las campañas amplifican tu alcance. Con un presupuesto pequeño puedes multiplicar tus impresiones y ganancias.",
      color: "#60a5fa",
      bg: "rgba(96,165,250,0.07)",
      border: "rgba(96,165,250,0.18)",
      action: "Ver Advertiser Panel",
      onAction: onSwitchToAdvertiser,
    });
  }

  if (topPosts.length > 0) {
    const top = topPosts[0];
    const totalClicks = topPosts.reduce((sum: number, p: { clicks: number }) => sum + p.clicks, 0);
    const topShare = totalClicks > 0 ? ((top.clicks / totalClicks) * 100).toFixed(0) : 0;
    if (Number(topShare) > 50) {
      insights.push({
        icon: Star,
        title: `"${top.content?.slice(0, 30) ?? "Tu post top"}" domina el ${topShare}%`,
        description: "Un solo post genera la mayoría de tus clicks. Crea más contenido en ese mismo estilo para diversificar tus ingresos.",
        color: "#a78bfa",
        bg: "rgba(167,139,250,0.07)",
        border: "rgba(167,139,250,0.18)",
      });
    }
  }

  if (ctr >= 1 && totalEarnings > 0) {
    insights.push({
      icon: TrendingUp,
      title: "¡Buen momentum! Sigue así",
      description: `Tu CTR de ${ctr.toFixed(2)}% está por encima del promedio. Mantén la frecuencia de publicación para sostener el crecimiento.`,
      color: "#34d399",
      bg: "rgba(52,211,153,0.07)",
      border: "rgba(52,211,153,0.18)",
    });
  }

  if (insights.length === 0) return null;

  return (
    <SectionBlock icon={Lightbulb} title="Insights Inteligentes" iconColor="text-amber-400">
      <div className="space-y-3">
        {insights.map((insight, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.07 }}
            className="flex gap-3 p-4 rounded-2xl"
            style={{
              background: insight.bg,
              border: `1px solid ${insight.border}`,
            }}
          >
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
              style={{ background: `${insight.bg}`, border: `1px solid ${insight.border}` }}
            >
              <insight.icon size={15} style={{ color: insight.color }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold mb-1" style={{ color: insight.color }}>
                {insight.title}
              </p>
              <p className="text-[11px] text-white/40 leading-relaxed">{insight.description}</p>
              {insight.action && insight.onAction && (
                <button
                  onClick={insight.onAction}
                  className="mt-2 text-[10px] font-bold uppercase tracking-widest transition-all active:scale-95"
                  style={{ color: insight.color }}
                >
                  {insight.action} →
                </button>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </SectionBlock>
  );
});
