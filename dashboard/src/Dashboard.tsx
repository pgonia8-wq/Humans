import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

import { useDashboardData } from "./hooks/useDashboardData";
import { useMonetizationSettings } from "./hooks/useMonetizationSettings";
import { useCampaigns } from "./hooks/useCampaigns";

import { AppHeader } from "./components/AppHeader/AppHeader";
import { ControlBar } from "./components/ControlBar/ControlBar";
import { SystemStatus } from "./components/SystemStatus/SystemStatus";
import { ModeSwitch, type DashboardMode } from "./components/ModeSwitch/ModeSwitch";
import { FiltersBar } from "./components/FiltersBar/FiltersBar";
import { EarningsHero } from "./components/EarningsHero/EarningsHero";
import { StatsGrid } from "./components/StatsGrid/StatsGrid";
import { EarningsChart } from "./components/EarningsChart/EarningsChart";
import { TopPosts } from "./components/TopPosts/TopPosts";
import { PostMonetization } from "./components/PostMonetization/PostMonetization";
import { InsightsPanel } from "./components/InsightsPanel/InsightsPanel";
import { AudienceInsights } from "./components/AudienceInsights/AudienceInsights";
import { AdvertiserPanel } from "./components/AdvertiserPanel/AdvertiserPanel";
import { WithdrawPanel } from "./components/WithdrawPanel/WithdrawPanel";
import { MonetizationSettings } from "./components/MonetizationSettings/MonetizationSettings";
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
  const { settings, updateSettings } = useMonetizationSettings(currentUserId);
  const { campaigns } = useCampaigns(currentUserId);

  const [mode, setMode] = useState<DashboardMode>("creator");
  const [withdrawOpen, setWithdrawOpen] = useState(false);

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
              {/* Global Control Bar */}
              <ControlBar
                settings={settings}
                onUpdateSettings={updateSettings}
                onSwitchToAdvertiser={() => setMode("advertiser")}
                onOpenWithdraw={() => setWithdrawOpen(true)}
                totalEarnings={data?.totalEarnings ?? 0}
              />

              {/* System Status */}
              <SystemStatus
                adsEnabled={settings.ads_enabled}
                activeAds={data?.activeAds ?? 0}
                campaignCount={campaigns.length}
                totalEarnings={data?.totalEarnings ?? 0}
                impressions={data?.impressions ?? 0}
              />

              {/* Creator / Advertiser Toggle */}
              <ModeSwitch mode={mode} onChange={setMode} />

              {/* Filters */}
              <FiltersBar />

              {/* Creator Mode Sections */}
              <AnimatePresence mode="wait">
                {mode === "creator" && (
                  <motion.div
                    key="creator"
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -12 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-4"
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

                    <PostMonetization userId={currentUserId} />

                    <InsightsPanel
                      data={data}
                      campaignCount={campaigns.length}
                      onSwitchToAdvertiser={() => setMode("advertiser")}
                    />

                    <AudienceInsights
                      countries={data?.countries ?? []}
                      languages={data?.languages ?? []}
                      interests={data?.interests ?? []}
                    />
                  </motion.div>
                )}

                {/* Advertiser Mode Sections */}
                {mode === "advertiser" && (
                  <motion.div
                    key="advertiser"
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 12 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-4"
                  >
                    <AdvertiserPanel userId={currentUserId} />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Shared Sections (always visible) */}
              <WithdrawPanel
                userId={currentUserId}
                totalEarnings={data?.totalEarnings ?? 0}
                open={withdrawOpen}
                onClose={() => setWithdrawOpen(false)}
              />

              <MonetizationSettings
                userId={currentUserId}
                settings={settings}
                onUpdate={updateSettings}
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
