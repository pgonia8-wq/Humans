import { useState, useEffect, useCallback, useRef } from "react";
  import { useApp } from "@/context/AppContext";
  import { api } from "@/services/api";
  import type { Holding, UserProfile as UserProfileType, ActivityItem } from "@/services/types";
  import { formatNum, formatCompact, timeAgo } from "@/services/types";
  import { motion, AnimatePresence } from "framer-motion";
  import {
    Wallet, TrendingUp, TrendingDown, Shield, ShieldCheck,
    RefreshCw, ChevronRight, Coins, Activity, Loader2,
    PieChart, ArrowUpRight, ArrowDownRight, Flame, Lock,
    Copy, Check, ExternalLink
  } from "lucide-react";

  type ProfileTab = "holdings" | "activity";

  export default function UserProfilePage() {
    const { user, balanceWld, balanceUsdc, walletAddress, navigate, openCreatorDashboard } = useApp();
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
    const [copied, setCopied] = useState(false);

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

    const handleCopyWallet = () => {
      if (walletAddress) {
        navigator.clipboard.writeText(walletAddress).catch(() => {});
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    };

    const holdingsValue = holdings.reduce((s, h) => s + h.value, 0);
    const portfolioWld = holdingsValue + balanceWld;
    const pnlPositive = totalPnl >= 0;

    const sortedHoldings = [...holdings].sort((a, b) => b.value - a.value);
    const topHolding = sortedHoldings[0];

    if (loading) {
      return (
        <div className="p-4 space-y-3">
          <div className="h-28 rounded-xl bg-card/30 animate-pulse" />
          <div className="grid grid-cols-3 gap-2">
            {[0,1,2].map(i => <div key={i} className="h-16 rounded-xl bg-card/30 animate-pulse" />)}
          </div>
          <div className="space-y-1.5">
            {[...Array(5)].map((_, i) => <div key={i} className="h-14 rounded-xl bg-card/30 animate-pulse" style={{ animationDelay: `${i * 80}ms` }} />)}
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-full pb-4" data-testid="profile-page">
        <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-2xl px-4 pt-3 pb-2 border-b border-border/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-600/20 flex items-center justify-center text-base font-bold text-green-400 border border-green-500/20 overflow-hidden">
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  user?.username?.[0]?.toUpperCase() ?? "W"
                )}
              </div>
              <div>
                <div className="font-bold text-sm text-foreground">{user?.username ?? "Guest"}</div>
                <div className="flex items-center gap-1">
                  {orbLoading ? (
                    <Loader2 className="w-3 h-3 text-muted-foreground animate-spin" />
                  ) : orbVerified ? (
                    <><ShieldCheck className="w-3 h-3 text-green-400" /><span className="text-[9px] text-green-400 font-medium">ORB Verified</span></>
                  ) : (
                    <><Shield className="w-3 h-3 text-yellow-400" /><span className="text-[9px] text-yellow-400 font-medium">Device</span></>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button onClick={() => loadData(true)} className="p-2 rounded-lg bg-secondary/40 active:scale-95 transition-transform">
                <RefreshCw className={`w-3.5 h-3.5 text-muted-foreground ${refreshing ? "animate-spin" : ""}`} />
              </button>
              <button onClick={openCreatorDashboard} data-testid="button-open-creator"
                className="px-3 py-1.5 rounded-lg bg-green-500/15 border border-green-500/25 text-[10px] font-bold text-green-400 active:scale-95 transition-transform uppercase tracking-wider">
                Creator
              </button>
            </div>
          </div>
        </div>

        <div className="px-4 pt-3 space-y-3">
          <div className="p-4 rounded-xl bg-gradient-to-br from-green-500/8 to-emerald-600/5 border border-green-500/15">
            <div className="text-[9px] text-muted-foreground uppercase tracking-widest font-medium mb-1">Portfolio Value</div>
            <div className="text-2xl font-black text-foreground tracking-tight font-mono">{portfolioWld.toFixed(4)} <span className="text-sm text-muted-foreground font-medium">WLD</span></div>
            <div className={`flex items-center gap-1 mt-1 ${pnlPositive ? "text-green-400" : "text-red-400"}`}>
              {pnlPositive ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
              <span className="text-xs font-bold">{pnlPositive ? "+" : ""}{totalPnl.toFixed(4)} WLD</span>
              <span className="text-[10px] text-muted-foreground">({pnlPositive ? "+" : ""}{totalPnlPercent.toFixed(1)}%)</span>
            </div>
          </div>

          {walletAddress && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-secondary/30 border border-border/20">
              <Wallet className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="text-[10px] text-muted-foreground font-mono flex-1 truncate">{walletAddress}</span>
              <button onClick={handleCopyWallet} className="p-1 rounded active:scale-90 transition-transform">
                {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3 text-muted-foreground" />}
              </button>
              <a href={`https://worldscan.org/address/${walletAddress}`} target="_blank" rel="noopener noreferrer" className="p-1">
                <ExternalLink className="w-3 h-3 text-muted-foreground" />
              </a>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2">
            <div className="stat-card items-center">
              <span className="text-[9px] text-muted-foreground font-medium uppercase tracking-wider">WLD</span>
              <span className="text-sm font-bold text-foreground font-mono">{balanceWld.toFixed(2)}</span>
            </div>
            <div className="stat-card items-center">
              <span className="text-[9px] text-muted-foreground font-medium uppercase tracking-wider">Tokens</span>
              <span className="text-sm font-bold text-foreground">{holdings.length}</span>
            </div>
            <div className="stat-card items-center">
              <span className="text-[9px] text-muted-foreground font-medium uppercase tracking-wider">Created</span>
              <span className="text-sm font-bold text-foreground">{profile?.tokensCreated ?? 0}</span>
            </div>
          </div>

          <div className="flex rounded-lg bg-secondary/30 p-0.5 gap-0.5">
            <button onClick={() => setTab("holdings")} data-testid="tab-holdings"
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-[10px] font-bold transition-all ${
                tab === "holdings" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
              }`}>
              <Coins className="w-3 h-3" /> Holdings ({holdings.length})
            </button>
            <button onClick={() => setTab("activity")} data-testid="tab-activity"
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-[10px] font-bold transition-all ${
                tab === "activity" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
              }`}>
              <Activity className="w-3 h-3" /> Activity
            </button>
          </div>

          <AnimatePresence mode="wait">
            {tab === "holdings" && (
              <motion.div key="holdings" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-1.5">
                {sortedHoldings.length === 0 ? (
                  <div className="text-center py-14 space-y-3">
                    <div className="w-12 h-12 rounded-full bg-secondary/40 flex items-center justify-center mx-auto">
                      <PieChart className="w-6 h-6 text-muted-foreground/40" />
                    </div>
                    <div className="text-xs text-muted-foreground">No holdings yet</div>
                    <button onClick={() => navigate("discovery")} data-testid="button-explore-tokens"
                      className="px-5 py-2 rounded-lg bg-green-500 text-white text-xs font-bold active:scale-95 transition-transform">
                      Explore Tokens
                    </button>
                  </div>
                ) : (
                  sortedHoldings.map((h, i) => {
                    const isPos = h.pnlPercent >= 0;
                    const pctOfPortfolio = holdingsValue > 0 ? (h.value / holdingsValue * 100) : 0;
                    return (
                      <button key={h.tokenId} onClick={() => navigate("token", { tokenId: h.tokenId })}
                        data-testid={`holding-${h.tokenId}`}
                        className="w-full flex items-center gap-2.5 p-3 rounded-xl bg-card/40 border border-border/20 hover:border-border/50 active:scale-[0.99] transition-all text-left group">
                        <div className="w-8 h-8 rounded-lg bg-secondary/50 flex items-center justify-center text-base shrink-0">{h.tokenEmoji}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-xs text-foreground">{h.tokenSymbol}</span>
                            <span className="text-[9px] text-muted-foreground/60">{pctOfPortfolio.toFixed(0)}%</span>
                          </div>
                          <div className="text-[10px] text-muted-foreground font-mono">{h.amount.toLocaleString()} tokens</div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-xs font-bold text-foreground font-mono">{h.value.toFixed(4)}</div>
                          <div className={`text-[10px] font-semibold ${isPos ? "text-green-400" : "text-red-400"}`}>
                            {isPos ? "+" : ""}{h.pnlPercent.toFixed(1)}%
                          </div>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/30 group-hover:text-muted-foreground shrink-0" />
                      </button>
                    );
                  })
                )}
              </motion.div>
            )}

            {tab === "activity" && (
              <motion.div key="activity" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-1.5">
                {activities.length === 0 ? (
                  <div className="text-center py-14 text-xs text-muted-foreground">No activity yet</div>
                ) : (
                  activities.map((a) => (
                    <div key={a.id} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-card/30 border border-border/15">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                        a.type === "buy" ? "bg-green-500/15 text-green-400" :
                        a.type === "sell" ? "bg-red-500/15 text-red-400" :
                        a.type === "create" ? "bg-violet-500/15 text-violet-400" :
                        "bg-yellow-500/15 text-yellow-400"
                      }`}>
                        {a.type === "buy" ? <ArrowUpRight className="w-3.5 h-3.5" /> :
                         a.type === "sell" ? <ArrowDownRight className="w-3.5 h-3.5" /> :
                         <Flame className="w-3.5 h-3.5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <span className={`text-[10px] font-bold uppercase ${
                            a.type === "buy" ? "text-green-400" : a.type === "sell" ? "text-red-400" : "text-violet-400"
                          }`}>{a.type}</span>
                          <span className="text-xs text-foreground font-medium">{a.tokenSymbol}</span>
                        </div>
                        <div className="text-[10px] text-muted-foreground">{timeAgo(a.timestamp)}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[11px] font-bold text-foreground font-mono">{formatCompact(a.amount)}</div>
                        {a.total != null && <div className="text-[9px] text-muted-foreground font-mono">{a.total.toFixed(4)} WLD</div>}
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
  