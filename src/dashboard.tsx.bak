import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

import { useDashboardData } from "./hooks/useDashboardData";

import { AppHeader } from "./components/AppHeader/AppHeader";
import { EarningsHero } from "./components/EarningsHero/EarningsHero";
import { StatsGrid } from "./components/StatsGrid/StatsGrid";
import { EarningsChart } from "./components/EarningsChart/EarningsChart";
import { TopPosts } from "./components/TopPosts/TopPosts";
import { AudienceInsights } from "./components/AudienceInsights/AudienceInsights";
import { ActivityFeed } from "./components/ActivityFeed/ActivityFeed";
import { FAB } from "./components/FAB/FAB";
import { GlassCard } from "./components/primitives/GlassCard";
import { LoadingSkeleton } from "./components/primitives/LoadingSkeleton";

import { BG_GRADIENT } from "./lib/tokens";

interface DashboardProps {
  currentUserId?: string | null;
  onClose?: () => void;
}

export default function Dashboard({ currentUserId, onClose }: DashboardProps) {
  const { data, loading, error, isRefreshing, refresh } = useDashboardData(currentUserId);

  if (!currentUserId) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "hsl(230 15% 7%)" }}>
        <GlassCard className="p-8 text-center max-w-xs">
          <p className="text-white/60 font-semibold mb-1">Sin sesión activa</p>
          <p className="text-white/30 text-sm">Inicia sesión con World App para ver tu dashboard.</p>
        </GlassCard>
      </div>
    );
  }

  return (
    <motion.div
      className="flex flex-col text-white"
      style={{
        background: BG_GRADIENT,
        height: "100dvh",
        maxHeight: "100dvh",
        overflow: "hidden",
        position: "relative",
      }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      data-testid="dashboard-root"
    >
      <AppHeader onClose={onClose} isRefreshing={isRefreshing} />

      <div
        className="flex-1 overflow-y-auto overscroll-contain"
        style={{ WebkitOverflowScrolling: "touch" }}
        data-testid="dashboard-scroll"
      >
        <AnimatePresence mode="wait">
          {loading && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="pt-4"
            >
              <LoadingSkeleton />
            </motion.div>
          )}

          {!loading && error && (
            <motion.div
              key="error"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center min-h-[60vh] px-6"
            >
              <GlassCard className="p-7 text-center max-w-sm w-full">
                <div className="w-12 h-12 rounded-2xl bg-red-500/15 flex items-center justify-center mx-auto mb-4">
                  <X size={22} className="text-red-400" />
                </div>
                <p className="text-red-400 font-semibold mb-2 text-sm">Error de conexión</p>
                <p className="text-white/35 text-xs mb-5 leading-relaxed">{error}</p>
                <button
                  onClick={() => refresh()}
                  className="px-5 py-2.5 rounded-xl bg-violet-600/80 hover:bg-violet-500/80 text-white text-sm font-medium transition-all active:scale-95"
                >
                  Reintentar
                </button>
              </GlassCard>
            </motion.div>
          )}

          {!loading && !error && (
            <motion.div
              key="content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
              className="px-4 pt-4 pb-28 space-y-4"
            >
              <EarningsHero totalEarnings={data?.totalEarnings ?? 0} />

              <StatsGrid
                clicks={data?.clicks ?? 0}
                impressions={data?.impressions ?? 0}
                ctr={data?.ctr ?? 0}
                activeAds={data?.activeAds ?? 0}
              />

              <EarningsChart chartData={data?.chartData ?? []} />

              <TopPosts posts={data?.topPosts ?? []} />

              <AudienceInsights
                countries={data?.countries ?? []}
                languages={data?.languages ?? []}
                interests={data?.interests ?? []}
              />

              <ActivityFeed activity={data?.activity ?? []} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <FAB onRefresh={() => refresh(true)} />
    </motion.div>
  );
}
