import { memo } from "react";
import { Eye, MousePointerClick, TrendingUp, Zap } from "lucide-react";
import { StatCardPro } from "./StatCardPro";
import { useCountUp } from "../../hooks/useCountUp";

interface StatsGridProps {
  clicks: number;
  impressions: number;
  ctr: number;
  activeAds: number;
}

export const StatsGrid = memo(function StatsGrid({ clicks, impressions, ctr, activeAds }: StatsGridProps) {
  const animatedClicks = useCountUp(clicks, 1000, 0);
  const animatedImpressions = useCountUp(impressions, 1000, 0);
  const animatedCTR = useCountUp(ctr, 1000, 2);

  return (
    <div className="grid grid-cols-2 gap-3">
      <StatCardPro
        icon={Eye}
        label="Impressions"
        value={Math.round(animatedImpressions).toLocaleString()}
        accentColor="#60a5fa"
        delay={0.05}
      />
      <StatCardPro
        icon={MousePointerClick}
        label="Clicks"
        value={Math.round(animatedClicks).toLocaleString()}
        accentColor="#a78bfa"
        delay={0.1}
      />
      <StatCardPro
        icon={TrendingUp}
        label="CTR"
        value={`${animatedCTR.toFixed(2)}%`}
        sub="Click-through rate"
        accentColor="#34d399"
        delay={0.15}
      />
      <StatCardPro
        icon={Zap}
        label="Active Ads"
        value={String(activeAds)}
        sub="Posts monetizados"
        accentColor="#fbbf24"
        delay={0.2}
      />
    </div>
  );
});
