import { useState, useEffect, useCallback, useRef } from "react";
import { useApp } from "@/context/AppContext";
import { api } from "@/services/api";
import type { Holding, UserProfile as UserProfileType, ActivityItem } from "@/services/types";
import { formatNum, formatCompact, timeAgo } from "@/services/types";
import { motion, AnimatePresence } from "framer-motion";
import { Wallet, TrendingUp, TrendingDown, Shield, ShieldCheck, PenLine, RefreshCw, ChevronRight, Coins, Activity, Loader2 } from "lucide-react";

type ProfileTab = "holdings" | "activity";

export default function UserProfilePage() {
  const { user, balanceWld, balanceUsdc, navigate, openCreatorDashboard } = useApp();
  const [profile, setProfile] = useState<UserProfileType | null>(null);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [totalValue, setTotalValue] = useState(0);
  const [totalPnl, setTotalPnl] = useState(0);
  const [totalPnlPercent, setTotalPnlPercent] = useState(0);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<ProfileTab>("holdings");
  const [refreshing, setRefreshing] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [orbVerified, setOrbVerified] = useState(false);
  const [orbLoading, setOrbLoading] = useState(true);

  useEffect(() => {
    if (user?.id && user.id !== "usr_guest") {
      api.checkOrbStatus(user.id).then((res) => {
        setOrbVerified(res.orbVerified);
        setOrbLoading(false);
      }).catch(() => setOrbLoading(false));
    } else {
      setOrbLoading(false);
    }
  }, [user?.id]);

  const loadData = useCallback(async (showRefresh = false) => {
    if (!user?.id || user.id === "usr_guest") { setLoading(false); return; }
    if (showRefresh) setRefreshing(true);
    try {
      const [profileRes, holdingsRes] = await Promise.all([
        api.getUser(user.id).catch(() => null),
        api.getUserHoldings(user.id).catch(() => null),
      ]);
      if (profileRes) setProfile(profileRes);
      if (holdingsRes) {
        setHoldings(holdingsRes.holdings);
        setTotalValue(holdingsRes.totalValue);
        setTotalPnl(holdingsRes.totalPnl);
        setTotalPnlPercent(holdingsRes.totalPnlPercent);
      }
    } catch (err) {
      console.error("[UserProfile] Error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadData();
    intervalRef.current = setInterval(() => loadData(), 8000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [loadData]);

  useEffect(() => {
    if (tab === "activity" && user?.id) {
      api.getUserActivity(user.id).then((r) => setActivities(r.activities)).catch(() => {});
    }
  }, [tab, user?.id]);

  const portfolioValue = (profile?.totalValue ?? totalValue) + balanceWld * 3 + balanceUsdc;
  const pnlPositive = totalPnl >= 0;

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <div className="h-32 rounded-2xl bg-card/40 animate-pulse" />
        <div className="h-20 rounded-2xl bg-card/40 animate-pulse" />
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => <div key={i} className="h-16 rounded-xl bg-card/40 animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full pb-4" data-testid="profile-page">
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-xl px-4 pt-4 pb-2 border-b border-border/30">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground tracking-tight">Portfolio</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => loadData(true)}
              data-testid="button-refresh-profile"
              className="p-2 rounded-xl bg-card/60 border border-border/40 active:scale-95 transition-transform"
            >
              <RefreshCw className={`w-4 h-4 text-muted-foreground ${refreshing ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={openCreatorDashboard}
              data-testid="button-open-creator"
              className="px-3 py-2 rounded-xl bg-primary/15 border border-primary/30 text-xs font-bold text-primary active:scale-95 transition-transform"
            >
              Creator
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/30 to-cyan-500/20 flex items-center justify-center text-xl font-bold text-primary border border-primary/20">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt="" className="w-full h-full rounded-2xl object-cover" />
            ) : (
              user?.username?.[0]?.toUpperCase() ?? "W"
            )}
          </div>
          <div className="flex-1">
            <div className="font-bold text-lg text-foreground">{user?.username ?? "Guest"}</div>
            <div className="flex items-center gap-1.5 mt-0.5">
              {orbLoading ? (
                <><Loader2 className="w-3.5 h-3.5 text-muted-foreground animate-spin" /><span className="text-[11px] text-muted-foreground font-medium">Checking...</span></>
              ) : orbVerified ? (
                <><ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /><span className="text-[11px] text-emerald-400 font-medium">ORB Verified</span></>
              ) : (
                <><Shield className="w-3.5 h-3.5 text-amber-400" /><span className="text-[11px] text-amber-400 font-medium">Device Verified</span></>
              )}
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-gradient-to-br from-primary/10 to-cyan-500/5 border border-primary/20">
          <div className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Total Portfolio Value</div>
          <div className="text-3xl font-bold text-foreground tracking-tight">${portfolioValue.toFixed(2)}</div>
          <div className={`flex items-center gap-1 mt-1 text-xs font-semibold ${pnlPositive ? "text-emerald-400" : "text-red-400"}`}>
            {pnlPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            {pnlPositive ? "+" : ""}{totalPnl.toFixed(2)} USD all time
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-xl bg-card/60 border border-border/40">
            <div className="text-lg font-bold text-foreground">{balanceWld.toFixed(2)}</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">WLD Balance</div>
          </div>
          <div className="p-3 rounded-xl bg-card/60 border border-border/40">
            <div className="text-lg font-bold text-foreground">${balanceUsdc.toFixed(2)}</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">USDC Balance</div>
          </div>
        </div>

        <div className="flex rounded-xl bg-card/40 border border-border/30 overflow-hidden">
          <button
            onClick={() => setTab("holdings")}
            data-testid="tab-holdings"
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold transition-all ${tab === "holdings" ? "bg-primary/15 text-primary border-b-2 border-primary" : "text-muted-foreground"}`}
          >
            <Coins className="w-3.5 h-3.5" /> Holdings
          </button>
          <button
            onClick={() => setTab("activity")}
            data-testid="tab-activity"
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold transition-all ${tab === "activity" ? "bg-primary/15 text-primary border-b-2 border-primary" : "text-muted-foreground"}`}
          >
            <Activity className="w-3.5 h-3.5" /> Activity
          </button>
        </div>

        <AnimatePresence mode="wait">
          {tab === "holdings" && (
            <motion.div key="holdings" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
              {holdings.length === 0 ? (
                <div className="text-center py-12 space-y-3">
                  <Wallet className="w-10 h-10 text-muted-foreground/50 mx-auto" />
                  <div className="text-sm text-muted-foreground">No holdings yet</div>
                  <button
                    onClick={() => navigate("discovery")}
                    data-testid="button-explore-tokens"
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-500 text-white text-sm font-bold active:scale-95 transition-transform"
                  >
                    Explore Tokens
                  </button>
                </div>
              ) : (
                holdings.map((h) => {
                  const isPos = h.pnlPercent >= 0;
                  return (
                    <button
                      key={h.tokenId}
                      onClick={() => navigate("token", { tokenId: h.tokenId })}
                      data-testid={`holding-${h.tokenId}`}
                      className="w-full flex items-center gap-3 p-3 rounded-xl bg-card/60 border border-border/40 hover:border-primary/30 active:scale-[0.98] transition-all text-left"
                    >
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-lg border border-border/30">
                        {h.tokenEmoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm text-foreground">{h.tokenSymbol}</div>
                        <div className="text-[11px] text-muted-foreground">{h.amount.toLocaleString()} tokens</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-foreground">${h.value.toFixed(2)}</div>
                        <div className={`text-[11px] font-semibold ${isPos ? "text-emerald-400" : "text-red-400"}`}>
                          {isPos ? "+" : ""}{h.pnlPercent.toFixed(1)}%
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                    </button>
                  );
                })
              )}
            </motion.div>
          )}

          {tab === "activity" && (
            <motion.div key="activity" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
              {activities.length === 0 ? (
                <div className="text-center py-12 text-sm text-muted-foreground">No activity yet</div>
              ) : (
                activities.map((a) => (
                  <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl bg-card/30 border border-border/20">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                      a.type === "buy" ? "bg-emerald-500/20 text-emerald-400" :
                      a.type === "sell" ? "bg-red-500/20 text-red-400" :
                      "bg-violet-500/20 text-violet-400"
                    }`}>
                      {a.type === "buy" ? "B" : a.type === "sell" ? "S" : a.type[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-foreground capitalize">{a.type} {a.tokenSymbol}</div>
                      <div className="text-[11px] text-muted-foreground">{timeAgo(a.timestamp)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-medium text-foreground">{formatCompact(a.amount)}</div>
                      {a.total != null && <div className="text-[10px] text-muted-foreground">${formatNum(a.total)}</div>}
                    </div>
                  </div>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
