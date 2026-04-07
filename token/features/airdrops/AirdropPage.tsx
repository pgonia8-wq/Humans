import { useState, useEffect, useCallback, useRef } from "react";
  import { useApp } from "@/context/AppContext";
  import { api } from "@/services/api";
  import type { Airdrop } from "@/services/types";
  import { formatCompact, timeAgo } from "@/services/types";
  import { motion, AnimatePresence } from "framer-motion";
  import {
    Gift, Clock, Users, Shield, Loader2, CheckCircle2,
    Plus, Rocket, Zap, ChevronRight, RefreshCw, PartyPopper
  } from "lucide-react";

  type AirdropTab = "active" | "ended";

  function AirdropCard({ airdrop, onClaim, claiming, userId }: {
    airdrop: Airdrop; onClaim: (id: string) => void; claiming: string | null; userId: string;
  }) {
    const progress = airdrop.totalAmount > 0 ? (airdrop.claimedAmount / airdrop.totalAmount * 100) : 0;
    const isClaiming = claiming === airdrop.id;
    const participantPct = airdrop.maxParticipants > 0 ? (airdrop.participants / airdrop.maxParticipants * 100) : 0;

    return (
      <div className="p-3.5 rounded-xl bg-card/40 border border-border/20 space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500/15 to-cyan-500/15 flex items-center justify-center text-lg shrink-0 border border-violet-500/15">
            {airdrop.tokenEmoji}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm text-foreground">{airdrop.title}</span>
              {airdrop.isActive && <span className="badge-green">Live</span>}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] text-muted-foreground">{airdrop.tokenSymbol}</span>
              <span className="text-[10px] text-muted-foreground/50">\u00B7</span>
              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                <Users className="w-2.5 h-2.5" />{airdrop.participants}/{airdrop.maxParticipants}
              </span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-xs font-bold text-foreground font-mono">{formatCompact(airdrop.dailyAmount)}</div>
            <div className="text-[9px] text-muted-foreground">per claim</div>
          </div>
        </div>

        <div>
          <div className="flex justify-between text-[9px] text-muted-foreground mb-1">
            <span>Pool: {formatCompact(airdrop.claimedAmount)}/{formatCompact(airdrop.totalAmount)}</span>
            <span>{progress.toFixed(0)}% claimed</span>
          </div>
          <div className="h-1.5 rounded-full bg-secondary/50 overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400 transition-all duration-500"
              style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span>Cooldown: {airdrop.cooldownHours}h</span>
          </div>
          {airdrop.isActive && (
            <button onClick={() => onClaim(airdrop.id)} disabled={isClaiming}
              className={`px-4 py-1.5 rounded-lg text-[11px] font-bold transition-all active:scale-95 ${
                isClaiming
                  ? "bg-secondary/40 text-muted-foreground"
                  : "bg-green-500 text-white shadow-lg shadow-green-500/20 hover:bg-green-400"
              }`}>
              {isClaiming ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Claim"}
            </button>
          )}
        </div>
      </div>
    );
  }

  export default function AirdropPage() {
    const { user } = useApp();
    const [airdrops, setAirdrops] = useState<Airdrop[]>([]);
    const [loading, setLoading] = useState(true);
    const [claiming, setClaiming] = useState<string | null>(null);
    const [claimResult, setClaimResult] = useState<{ success: boolean; message: string } | null>(null);
    const [tab, setTab] = useState<AirdropTab>("active");
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const loadAirdrops = useCallback(async () => {
      try {
        const res = await api.getAirdrops();
        setAirdrops(res.airdrops);
      } catch (err) {
        console.error("[Airdrops] Error:", err);
      } finally {
        setLoading(false);
      }
    }, []);

    useEffect(() => {
      loadAirdrops();
      intervalRef.current = setInterval(loadAirdrops, 10000);
      return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }, [loadAirdrops]);

    const handleClaim = async (airdropId: string) => {
      if (!user?.id || user.id === "usr_guest") {
        setClaimResult({ success: false, message: "Connect your World ID to claim airdrops" });
        return;
      }
      setClaiming(airdropId);
      setClaimResult(null);
      try {
        const res = await api.claimAirdrop({ airdropId, userId: user.id });
        setClaimResult({ success: true, message: `Claimed ${formatCompact(res.amount)} tokens!` });
        loadAirdrops();
      } catch (err: any) {
        setClaimResult({ success: false, message: err.message || "Failed to claim" });
      } finally {
        setClaiming(null);
      }
    };

    const active = airdrops.filter(a => a.isActive);
    const ended = airdrops.filter(a => !a.isActive);
    const displayList = tab === "active" ? active : ended;

    const totalPool = airdrops.reduce((s, a) => s + a.totalAmount, 0);
    const totalClaimed = airdrops.reduce((s, a) => s + a.claimedAmount, 0);

    return (
      <div className="min-h-full pb-4" data-testid="airdrop-page">
        <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-2xl px-4 pt-3 pb-2 border-b border-border/20">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-base font-black text-foreground tracking-tight">Airdrops</h1>
              <p className="text-[9px] text-muted-foreground uppercase tracking-widest font-medium">Free tokens for verified humans</p>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="badge-green">{active.length} Live</span>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="px-4 pt-4 space-y-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 rounded-xl bg-card/30 animate-pulse" style={{ animationDelay: `${i * 80}ms` }} />
            ))}
          </div>
        ) : (
          <div className="px-4 pt-3 space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <div className="stat-card items-center">
                <span className="text-[9px] text-muted-foreground font-medium uppercase tracking-wider">Active</span>
                <span className="text-sm font-bold text-green-400">{active.length}</span>
              </div>
              <div className="stat-card items-center">
                <span className="text-[9px] text-muted-foreground font-medium uppercase tracking-wider">Total Pool</span>
                <span className="text-sm font-bold text-foreground">{formatCompact(totalPool)}</span>
              </div>
              <div className="stat-card items-center">
                <span className="text-[9px] text-muted-foreground font-medium uppercase tracking-wider">Claimed</span>
                <span className="text-sm font-bold text-foreground">{formatCompact(totalClaimed)}</span>
              </div>
            </div>

            <AnimatePresence>
              {claimResult && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                  className={`p-3 rounded-lg border text-xs font-medium flex items-center gap-2 ${
                    claimResult.success
                      ? "bg-green-500/10 border-green-500/20 text-green-400"
                      : "bg-red-500/10 border-red-500/20 text-red-400"
                  }`}>
                  {claimResult.success ? <PartyPopper className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                  {claimResult.message}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex rounded-lg bg-secondary/30 p-0.5 gap-0.5">
              <button onClick={() => setTab("active")}
                className={`flex-1 py-2 rounded-md text-[10px] font-bold transition-all ${
                  tab === "active" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                }`}>
                Active ({active.length})
              </button>
              <button onClick={() => setTab("ended")}
                className={`flex-1 py-2 rounded-md text-[10px] font-bold transition-all ${
                  tab === "ended" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                }`}>
                Ended ({ended.length})
              </button>
            </div>

            <div className="space-y-2">
              {displayList.length === 0 ? (
                <div className="text-center py-14 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-secondary/30 flex items-center justify-center mx-auto">
                    <Gift className="w-6 h-6 text-muted-foreground/30" />
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {tab === "active" ? "No active airdrops right now" : "No ended airdrops"}
                  </div>
                </div>
              ) : (
                displayList.map(a => (
                  <AirdropCard key={a.id} airdrop={a} onClaim={handleClaim} claiming={claiming} userId={user?.id ?? ""} />
                ))
              )}
            </div>
          </div>
        )}
      </div>
    );
  }
  