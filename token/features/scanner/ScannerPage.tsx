import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTokenScanner, type TokenAnalysis, type RiskLevel, type TokenHeat, type SocialAnalysis } from "@/hooks/useTokenScanner";
import { useApp } from "@/context/AppContext";
import { formatCompact } from "@/services/types";
import {
  ScanSearch, RefreshCw, TrendingUp, TrendingDown,
  Shield, AlertTriangle, Flame, Snowflake, Zap,
  ChevronDown, ChevronUp, Users, Activity, Eye,
  ArrowUpRight, ArrowDownRight, BarChart3, Target,
  Search, X, Star, MessageSquare, Heart, Repeat,
  BadgeCheck, Megaphone, Rocket, Crown
} from "lucide-react";

type ViewMode = "overview" | "rankings" | "alerts";
type SortMode = "score" | "risk" | "momentum" | "volume";

const HEAT_CONFIG: Record<TokenHeat, { label: string; color: string; bg: string; icon: typeof Flame }> = {
  HOT: { label: "HOT", color: "text-orange-400", bg: "bg-orange-500/15", icon: Flame },
  RISING: { label: "RISING", color: "text-green-400", bg: "bg-green-500/15", icon: TrendingUp },
  NEUTRAL: { label: "NEUTRAL", color: "text-blue-400", bg: "bg-blue-500/15", icon: Activity },
  COOLING: { label: "COOLING", color: "text-yellow-400", bg: "bg-yellow-500/15", icon: TrendingDown },
  COLD: { label: "COLD", color: "text-cyan-400", bg: "bg-cyan-500/15", icon: Snowflake },
};

const RISK_CONFIG: Record<RiskLevel, { label: string; color: string; bg: string }> = {
  SAFE: { label: "SAFE", color: "text-green-400", bg: "bg-green-500/15" },
  WATCH: { label: "WATCH", color: "text-yellow-400", bg: "bg-yellow-500/15" },
  WARNING: { label: "WARNING", color: "text-orange-400", bg: "bg-orange-500/15" },
  DANGER: { label: "DANGER", color: "text-red-400", bg: "bg-red-500/15" },
};

const TIER_CONFIG: Record<string, { color: string; icon: typeof Crown }> = {
  "Influencer": { color: "text-purple-400", icon: Crown },
  "Activo Pro": { color: "text-blue-400", icon: Star },
  "Activo": { color: "text-green-400", icon: Zap },
  "Regular": { color: "text-yellow-400", icon: Activity },
  "Nuevo": { color: "text-muted-foreground", icon: Users },
};

function ScoreBar({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-muted-foreground w-16 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
      <span className="text-[10px] font-mono font-medium text-foreground w-8 text-right">{value}</span>
    </div>
  );
}

function SocialSection({ social }: { social: SocialAnalysis }) {
  const tier = TIER_CONFIG[social.stats.tier] || TIER_CONFIG["Nuevo"];
  const TierIcon = tier.icon;

  return (
    <div className="space-y-2.5 border-t border-border/20 pt-2.5">
      <div className="flex items-center gap-2">
        <Megaphone className="w-3.5 h-3.5 text-purple-400" />
        <p className="text-[10px] font-semibold text-purple-400 uppercase tracking-wider">Análisis Social</p>
      </div>

      {social.profile && (
        <div className="flex items-center gap-2.5 bg-white/[0.03] rounded-xl p-2.5">
          {social.profile.avatarUrl && (
            <img src={social.profile.avatarUrl} className="w-8 h-8 rounded-full" alt="" />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-foreground truncate">@{social.profile.username}</span>
              {social.profile.orbVerified && <BadgeCheck className="w-3.5 h-3.5 text-blue-400 shrink-0" />}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] text-muted-foreground">{social.profile.followersCount} seguidores</span>
              <span className="text-[10px] text-muted-foreground">·</span>
              <span className={`text-[10px] font-semibold flex items-center gap-0.5 ${tier.color}`}>
                <TierIcon className="w-3 h-3" />{social.stats.tier}
              </span>
            </div>
          </div>
          <div className="text-center shrink-0">
            <div className="relative w-10 h-10">
              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeWidth="3" className="text-white/5" />
                <circle
                  cx="18" cy="18" r="15" fill="none"
                  strokeWidth="3"
                  strokeDasharray={`${social.socialScore * 0.94} 100`}
                  strokeLinecap="round"
                  className={social.socialScore >= 70 ? "text-purple-400" : social.socialScore >= 40 ? "text-yellow-400" : "text-red-400"}
                  stroke="currentColor"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-foreground">{social.socialScore}</span>
            </div>
            <p className="text-[8px] text-muted-foreground">Social</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-4 gap-1.5">
        <div className="bg-white/[0.03] rounded-lg p-2 text-center">
          <MessageSquare className="w-3 h-3 text-muted-foreground mx-auto mb-0.5" />
          <p className="text-[11px] font-bold text-foreground">{social.stats.totalPosts}</p>
          <p className="text-[8px] text-muted-foreground">Posts</p>
        </div>
        <div className="bg-white/[0.03] rounded-lg p-2 text-center">
          <Heart className="w-3 h-3 text-red-400 mx-auto mb-0.5" />
          <p className="text-[11px] font-bold text-foreground">{formatCompact(social.stats.totalLikes)}</p>
          <p className="text-[8px] text-muted-foreground">Likes</p>
        </div>
        <div className="bg-white/[0.03] rounded-lg p-2 text-center">
          <Repeat className="w-3 h-3 text-green-400 mx-auto mb-0.5" />
          <p className="text-[11px] font-bold text-foreground">{formatCompact(social.stats.totalReposts)}</p>
          <p className="text-[8px] text-muted-foreground">Reposts</p>
        </div>
        <div className="bg-white/[0.03] rounded-lg p-2 text-center">
          <Star className="w-3 h-3 text-yellow-400 mx-auto mb-0.5" />
          <p className="text-[11px] font-bold text-foreground">{social.stats.totalTips.toFixed(1)}</p>
          <p className="text-[8px] text-muted-foreground">Tips WLD</p>
        </div>
      </div>

      <div className="flex items-center gap-2 text-[10px]">
        <span className="text-muted-foreground">Esta semana:</span>
        <span className="font-semibold text-foreground">{social.stats.postsThisWeek} posts</span>
        <span className="text-muted-foreground">·</span>
        <span className={`font-semibold ${
          social.stats.activityTrend === "increasing" ? "text-green-400" :
          social.stats.activityTrend === "stable" ? "text-yellow-400" :
          social.stats.activityTrend === "decreasing" ? "text-orange-400" : "text-red-400"
        }`}>
          {social.stats.activityTrend === "increasing" ? "En aumento" :
           social.stats.activityTrend === "stable" ? "Estable" :
           social.stats.activityTrend === "decreasing" ? "Bajando" : "Inactivo"}
        </span>
        {social.stats.activeBoostedPosts > 0 && (
          <>
            <span className="text-muted-foreground">·</span>
            <span className="font-semibold text-purple-400">{social.stats.activeBoostedPosts} boost activo</span>
          </>
        )}
        {social.stats.campaignPosts > 0 && (
          <>
            <span className="text-muted-foreground">·</span>
            <span className="font-semibold text-blue-400">{social.stats.campaignPosts} campaña(s)</span>
          </>
        )}
      </div>

      {social.fomoSignals.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] font-semibold text-green-400 uppercase tracking-wider flex items-center gap-1">
            <Rocket className="w-3 h-3" /> Señales FOMO
          </p>
          {social.fomoSignals.map((s, i) => (
            <div key={i} className="flex items-start gap-1.5 text-[11px] text-green-400/90">
              <span className="mt-0.5">🚀</span>
              <span>{s}</span>
            </div>
          ))}
        </div>
      )}

      {social.warnings.length > 0 && (
        <div className="space-y-1">
          {social.warnings.map((w, i) => (
            <div key={i} className="flex items-start gap-1.5 text-[11px] text-orange-400/80">
              <span className="mt-0.5">⚠️</span>
              <span>{w}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TokenAnalysisCard({ analysis, onViewToken, defaultExpanded }: { analysis: TokenAnalysis; onViewToken: (id: string) => void; defaultExpanded?: boolean }) {
  const [expanded, setExpanded] = useState(defaultExpanded || false);
  const { fmtWld } = useApp();
  const heat = HEAT_CONFIG[analysis.heat];
  const risk = RISK_CONFIG[analysis.riskLevel];
  const HeatIcon = heat.icon;

  return (
    <motion.div
      layout
      className="bg-card/50 backdrop-blur-sm border border-border/30 rounded-2xl overflow-hidden"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div
        className="p-3.5 cursor-pointer active:bg-white/[0.02] transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-card flex items-center justify-center text-lg border border-border/30 shrink-0">
            {analysis.token.emoji || "🪙"}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-foreground truncate">{analysis.token.symbol}</span>
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${heat.bg} ${heat.color}`}>
                <HeatIcon className="w-2.5 h-2.5 inline mr-0.5" />
                {heat.label}
              </span>
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${risk.bg} ${risk.color}`}>
                {risk.label}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="text-xs text-muted-foreground">{fmtWld(analysis.token.priceWld)}</span>
              <span className={`text-xs font-medium ${analysis.token.change24h >= 0 ? "text-green-400" : "text-red-400"}`}>
                {analysis.token.change24h >= 0 ? "+" : ""}{analysis.token.change24h.toFixed(1)}%
              </span>
              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                <Users className="w-3 h-3" />{analysis.token.holders}
              </span>
              {analysis.socialScore > 0 && (
                <span className="text-[10px] text-purple-400 flex items-center gap-0.5">
                  <Megaphone className="w-3 h-3" />{analysis.socialScore}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col items-end gap-1 shrink-0">
            <div className="relative w-11 h-11">
              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeWidth="3" className="text-white/5" />
                <circle
                  cx="18" cy="18" r="15" fill="none"
                  strokeWidth="3"
                  strokeDasharray={`${analysis.overallScore * 0.94} 100`}
                  strokeLinecap="round"
                  className={analysis.overallScore >= 70 ? "text-green-400" : analysis.overallScore >= 40 ? "text-yellow-400" : "text-red-400"}
                  stroke="currentColor"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-foreground">
                {analysis.overallScore}
              </span>
            </div>
            {expanded ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-3.5 pb-3.5 space-y-3 border-t border-border/20 pt-3">
              <div className="space-y-1.5">
                <ScoreBar value={analysis.trustScore} label="Confianza" color="#22c55e" />
                <ScoreBar value={analysis.momentumScore} label="Momentum" color="#f59e0b" />
                <ScoreBar value={analysis.socialScore} label="Social" color="#a855f7" />
                <ScoreBar value={analysis.overallScore} label="Overall" color="#8b5cf6" />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <MiniStat icon={BarChart3} label="Vol 24h" value={formatCompact(analysis.token.volume24h)} />
                <MiniStat icon={Target} label="Concentr." value={analysis.holderConcentration.toFixed(0) + "%"} />
                <MiniStat icon={Activity} label="Vol trend" value={analysis.volumeTrend} />
                <MiniStat icon={Users} label="Ballenas" value={String(analysis.whales.length)} />
              </div>

              {analysis.fomoSignals.length > 0 && (
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold text-green-400 uppercase tracking-wider flex items-center gap-1">
                    <Rocket className="w-3 h-3" /> FOMO
                  </p>
                  {analysis.fomoSignals.map((f, i) => (
                    <div key={i} className="flex items-start gap-1.5 text-[11px] text-green-400/90">
                      <span className="mt-0.5">🚀</span>
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              )}

              {analysis.greenFlags.length > 0 && (
                <div className="space-y-1">
                  {analysis.greenFlags.map((f, i) => (
                    <div key={i} className="flex items-start gap-1.5 text-[11px] text-green-400/80">
                      <span className="mt-0.5">✅</span>
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              )}

              {analysis.redFlags.length > 0 && (
                <div className="space-y-1">
                  {analysis.redFlags.map((f, i) => (
                    <div key={i} className="flex items-start gap-1.5 text-[11px] text-red-400/80">
                      <span className="mt-0.5">🚩</span>
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              )}

              {analysis.whales.length > 0 && (
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Ballenas detectadas</p>
                  {analysis.whales.slice(0, 3).map((w, i) => (
                    <div key={i} className="flex items-center gap-2 text-[11px]">
                      <span className="text-foreground font-medium">@{w.username}</span>
                      <span className="text-muted-foreground">{w.percentage.toFixed(1)}%</span>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                        w.action === "dumping" ? "bg-red-500/15 text-red-400" :
                        w.action === "accumulating" ? "bg-green-500/15 text-green-400" :
                        "bg-white/5 text-muted-foreground"
                      }`}>
                        {w.action === "dumping" ? "VENDIENDO" : w.action === "accumulating" ? "COMPRANDO" : "HOLD"}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {analysis.socialAnalysis && (
                <SocialSection social={analysis.socialAnalysis} />
              )}

              {analysis.insights.map((insight, i) => (
                <p key={i} className="text-[11px] text-muted-foreground italic border-l-2 border-purple-500/30 pl-2">
                  "{insight}"
                </p>
              ))}

              <button
                onClick={() => onViewToken(analysis.token.id)}
                className="w-full py-2 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
              >
                <Eye className="w-3.5 h-3.5" />
                Ver token completo
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function MiniStat({ icon: Icon, label, value }: { icon: typeof Activity; label: string; value: string }) {
  return (
    <div className="bg-white/[0.03] rounded-lg px-2.5 py-2 flex items-center gap-2">
      <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
      <div className="min-w-0">
        <p className="text-[9px] text-muted-foreground">{label}</p>
        <p className="text-[11px] font-semibold text-foreground truncate">{value}</p>
      </div>
    </div>
  );
}

function MarketOverview({ summary }: { summary: NonNullable<ReturnType<typeof useTokenScanner>["marketSummary"]> }) {
  const { fmtWld } = useApp();
  const sentimentColor = summary.marketSentiment === "bullish" ? "text-green-400" : summary.marketSentiment === "bearish" ? "text-red-400" : "text-yellow-400";
  const sentimentBg = summary.marketSentiment === "bullish" ? "bg-green-500/10" : summary.marketSentiment === "bearish" ? "bg-red-500/10" : "bg-yellow-500/10";
  const sentimentLabel = summary.marketSentiment === "bullish" ? "ALCISTA" : summary.marketSentiment === "bearish" ? "BAJISTA" : "NEUTRAL";

  return (
    <div className="space-y-3">
      <div className={`rounded-2xl p-4 ${sentimentBg} border border-white/5`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full ${sentimentBg} flex items-center justify-center`}>
              {summary.marketSentiment === "bullish" ? <ArrowUpRight className={`w-4 h-4 ${sentimentColor}`} /> :
               summary.marketSentiment === "bearish" ? <ArrowDownRight className={`w-4 h-4 ${sentimentColor}`} /> :
               <Activity className={`w-4 h-4 ${sentimentColor}`} />}
            </div>
            <div>
              <p className={`text-xs font-bold ${sentimentColor}`}>Mercado {sentimentLabel}</p>
              <p className="text-[10px] text-muted-foreground">Cambio promedio: {summary.avgChange24h >= 0 ? "+" : ""}{summary.avgChange24h.toFixed(1)}%</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2">
          <StatBox label="Tokens" value={String(summary.totalTokens)} />
          <StatBox label="HOT" value={String(summary.hotTokens)} color="text-orange-400" />
          <StatBox label="Rising" value={String(summary.risingTokens)} color="text-green-400" />
          <StatBox label="Nuevos" value={String(summary.newTokensToday)} color="text-blue-400" />
        </div>
      </div>

      <div className="bg-card/30 rounded-xl p-3 border border-border/20">
        <p className="text-[10px] text-muted-foreground mb-1">Volumen total 24h</p>
        <p className="text-lg font-bold text-foreground">{fmtWld(summary.totalVolume24h, { compact: true })}</p>
      </div>
    </div>
  );
}

function StatBox({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="text-center">
      <p className={`text-sm font-bold ${color || "text-foreground"}`}>{value}</p>
      <p className="text-[9px] text-muted-foreground">{label}</p>
    </div>
  );
}

export default function ScannerPage() {
  const {
    analyses, marketSummary, scanning, scanningToken,
    lastScan, scanCount, searchResult,
    rescan, searchToken, clearSearch
  } = useTokenScanner();
  const { navigate } = useApp();
  const [viewMode, setViewMode] = useState<ViewMode>("overview");
  const [sortMode, setSortMode] = useState<SortMode>("score");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchNotFound, setSearchNotFound] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const sortedAnalyses = [...analyses].sort((a, b) => {
    switch (sortMode) {
      case "risk": return a.trustScore - b.trustScore;
      case "momentum": return b.momentumScore - a.momentumScore;
      case "volume": return b.token.volume24h - a.token.volume24h;
      default: return b.overallScore - a.overallScore;
    }
  });

  const alerts = analyses.filter(a =>
    a.creatorDumping || a.washTradingRisk ||
    a.whales.some(w => w.action === "dumping") ||
    a.riskLevel === "DANGER"
  );

  const handleViewToken = (id: string) => {
    navigate("token", { tokenId: id });
  };

  const handleSearch = async () => {
    const q = searchQuery.trim();
    if (!q) return;
    setSearchNotFound(false);
    const result = await searchToken(q);
    if (!result) {
      setSearchNotFound(true);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setSearchNotFound(false);
    clearSearch();
    searchInputRef.current?.focus();
  };

  return (
    <div className="pb-20 min-h-screen">
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-xl border-b border-border/30 px-4 pt-4 pb-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center shadow-lg shadow-purple-900/20">
              <ScanSearch className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-foreground tracking-tight">H Scanner</h1>
              <p className="text-[10px] text-muted-foreground">
                {scanning ? "Escaneando top 10..." : lastScan ? `Scan #${scanCount} · ${new Date(lastScan).toLocaleTimeString()}` : "Iniciando..."}
              </p>
            </div>
          </div>
          <button
            onClick={rescan}
            disabled={scanning}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors disabled:opacity-40"
          >
            <RefreshCw className={`w-4 h-4 text-muted-foreground ${scanning ? "animate-spin" : ""}`} />
          </button>
        </div>

        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Buscar token para analizar..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="w-full pl-9 pr-20 py-2.5 rounded-xl bg-white/5 border border-border/30 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 transition-colors"
          />
          <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {(searchQuery || searchResult) && (
              <button
                onClick={handleClearSearch}
                className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center transition-colors"
              >
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            )}
            <button
              onClick={handleSearch}
              disabled={!searchQuery.trim() || !!scanningToken}
              className="px-3 py-1.5 rounded-lg bg-primary/20 hover:bg-primary/30 text-primary text-[11px] font-semibold transition-colors disabled:opacity-40"
            >
              {scanningToken ? "..." : "Analizar"}
            </button>
          </div>
        </div>

        {!searchResult && (
          <div className="flex gap-1">
            {(["overview", "rankings", "alerts"] as ViewMode[]).map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                  viewMode === mode
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                }`}
              >
                {mode === "overview" ? "Top 10" : mode === "rankings" ? "Rankings" : `Alertas${alerts.length > 0 ? ` (${alerts.length})` : ""}`}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="px-4 pt-4 space-y-3">
        {searchResult && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-primary" />
                Resultado del análisis
              </p>
              <button
                onClick={handleClearSearch}
                className="text-[10px] text-primary font-semibold"
              >
                Volver al top 10
              </button>
            </div>
            <TokenAnalysisCard analysis={searchResult} onViewToken={handleViewToken} defaultExpanded />
          </div>
        )}

        {searchNotFound && !searchResult && (
          <div className="text-center py-8 space-y-2">
            <Search className="w-8 h-8 text-muted-foreground/30 mx-auto" />
            <p className="text-sm text-muted-foreground">No se encontró "{searchQuery}"</p>
            <p className="text-[11px] text-muted-foreground/60">Intenta con el símbolo o nombre exacto del token</p>
          </div>
        )}

        {scanningToken && !searchResult && (
          <div className="text-center py-8 space-y-2">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="w-8 h-8 mx-auto"
            >
              <ScanSearch className="w-8 h-8 text-primary/40" />
            </motion.div>
            <p className="text-sm text-muted-foreground">Analizando token...</p>
            <p className="text-[10px] text-muted-foreground/60">Obteniendo datos on-chain y sociales</p>
          </div>
        )}

        {!searchResult && !searchNotFound && !scanningToken && (
          <>
            {viewMode === "overview" && (
              <>
                {marketSummary && <MarketOverview summary={marketSummary} />}

                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-foreground">Top 10 Tokens</p>
                </div>
                {sortedAnalyses.slice(0, 10).map(a => (
                  <TokenAnalysisCard key={a.token.id} analysis={a} onViewToken={handleViewToken} />
                ))}
              </>
            )}

            {viewMode === "rankings" && (
              <>
                <div className="flex gap-1 bg-card/30 rounded-xl p-1">
                  {(["score", "risk", "momentum", "volume"] as SortMode[]).map(mode => (
                    <button
                      key={mode}
                      onClick={() => setSortMode(mode)}
                      className={`flex-1 py-1.5 rounded-lg text-[10px] font-semibold transition-all ${
                        sortMode === mode ? "bg-white/10 text-foreground" : "text-muted-foreground"
                      }`}
                    >
                      {mode === "score" ? "Score" : mode === "risk" ? "Riesgo" : mode === "momentum" ? "Momentum" : "Volumen"}
                    </button>
                  ))}
                </div>

                {sortedAnalyses.map((a, i) => (
                  <div key={a.token.id} className="flex items-center gap-3">
                    <span className="text-[10px] font-bold text-muted-foreground w-5 text-right">#{i + 1}</span>
                    <div className="flex-1">
                      <TokenAnalysisCard analysis={a} onViewToken={handleViewToken} />
                    </div>
                  </div>
                ))}
              </>
            )}

            {viewMode === "alerts" && (
              <>
                {alerts.length === 0 ? (
                  <div className="text-center py-12">
                    <Shield className="w-10 h-10 text-green-400/40 mx-auto mb-3" />
                    <p className="text-sm font-semibold text-foreground">Todo en orden</p>
                    <p className="text-xs text-muted-foreground mt-1">No hay alertas críticas en este momento</p>
                  </div>
                ) : (
                  alerts.map(a => (
                    <div key={a.token.id} className="space-y-1">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-orange-400" />
                        <span className="text-xs font-bold text-foreground">{a.token.symbol}</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${RISK_CONFIG[a.riskLevel].bg} ${RISK_CONFIG[a.riskLevel].color}`}>
                          {a.riskLevel}
                        </span>
                      </div>
                      <TokenAnalysisCard analysis={a} onViewToken={handleViewToken} />
                    </div>
                  ))
                )}
              </>
            )}

            {analyses.length === 0 && !scanning && (
              <div className="text-center py-16">
                <ScanSearch className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">Sin datos aún</p>
                <button onClick={rescan} className="mt-3 text-xs text-primary font-semibold">
                  Iniciar escaneo
                </button>
              </div>
            )}

            {scanning && analyses.length === 0 && (
              <div className="text-center py-16 space-y-3">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="w-10 h-10 mx-auto"
                >
                  <ScanSearch className="w-10 h-10 text-primary/40" />
                </motion.div>
                <p className="text-sm text-muted-foreground">Analizando top 10 tokens...</p>
                <p className="text-[10px] text-muted-foreground/60">Detectando ballenas, patrones, riesgos y análisis social</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
