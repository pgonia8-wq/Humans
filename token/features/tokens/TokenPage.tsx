import { useState, useEffect, useCallback, useRef } from "react";
import { formatNum, formatCompact, timeAgo, type TokenDetail, type HolderInfo, type ActivityItem, type Candle } from "@/services/types";
import { api } from "@/services/api";
import { useApp } from "@/context/AppContext";
import CurrencyToggle from "@/components/CurrencyToggle";
import BuySellUI from "@/features/payments/BuySellUI";
import FOMOBanner from "@/features/conversion/FOMOBanner";
import BuyPressureIndicator from "@/features/conversion/BuyPressureIndicator";
import LiveActivityFeed from "@/features/conversion/LiveActivityFeed";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, TrendingUp, Users, Activity, Lock, Flame,
  Copy, Check, ArrowUpRight, ArrowDownRight, BarChart3,
  Shield, Globe, ExternalLink, ChevronDown
} from "lucide-react";

type TabName = "overview" | "holders" | "activity";
type ChartPeriod = "1h" | "6h" | "24h" | "7d" | "30d" | "all";

function usePageVisible() {
  const [visible, setVisible] = useState(!document.hidden);
  useEffect(() => {
    const handler = () => setVisible(!document.hidden);
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, []);
  return visible;
}

function CandlestickChart({ tokenId }: { tokenId: string }) {
  const [candles, setCandles] = useState<Candle[]>([]);
  const [period, setPeriod] = useState<ChartPeriod>("24h");
  const [loading, setLoading] = useState(true);
  const pageVisible = usePageVisible();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.getPriceHistory(tokenId, period)
      .then((res) => { if (!cancelled) { setCandles(res.candles ?? []); setLoading(false); } })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [tokenId, period]);

  useEffect(() => {
    if (!pageVisible) return;
    const iv = setInterval(() => {
      api.getPriceHistory(tokenId, period)
        .then((res) => setCandles(res.candles ?? []))
        .catch((err) => console.warn("[CandlestickChart] poll error:", err.message));
    }, 8000);
    return () => clearInterval(iv);
  }, [tokenId, period, pageVisible]);

  const periods: ChartPeriod[] = ["1h", "6h", "24h", "7d", "30d", "all"];

  if (loading) {
    return <div className="h-48 rounded-xl bg-card/30 animate-shimmer flex items-center justify-center text-[10px] text-muted-foreground">Loading chart...</div>;
  }

  if (candles.length === 0) {
    return (
      <div className="rounded-xl bg-card/30 border border-border/20 p-4">
        <div className="h-36 flex flex-col items-center justify-center gap-2">
          <BarChart3 className="w-8 h-8 text-muted-foreground/30" />
          <span className="text-[11px] text-muted-foreground">Chart available after first trades</span>
        </div>
        <PeriodSelector periods={periods} current={period} onChange={setPeriod} />
      </div>
    );
  }

  const allPrices = candles.flatMap((c) => [c.high, c.low]);
  const minP = Math.min(...allPrices);
  const maxP = Math.max(...allPrices);
  const range = maxP - minP || minP * 0.01 || 0.0000001;
  const padding = range * 0.12;
  const adjMin = minP - padding;
  const adjMax = maxP + padding;
  const adjRange = adjMax - adjMin;

  const svgW = 360;
  const svgH = 180;
  const candleW = Math.max(2, Math.min(10, (svgW - 20) / candles.length - 1));
  const gap = 1;
  const totalCandleW = candleW + gap;
  const startX = Math.max(0, (svgW - candles.length * totalCandleW) / 2);

  const lastCandle = candles[candles.length - 1];
  const firstCandle = candles[0];
  const chartChange = firstCandle ? ((lastCandle.close - firstCandle.open) / firstCandle.open * 100) : 0;
  const isChartPositive = chartChange >= 0;

  const areaPoints = candles.map((c, i) => {
    const x = startX + i * totalCandleW + candleW / 2;
    const y = svgH - ((c.close - adjMin) / adjRange) * (svgH - 20) - 10;
    return `${x},${y}`;
  }).join(" ");
  const areaFill = `${startX + candleW / 2},${svgH} ${areaPoints} ${startX + (candles.length - 1) * totalCandleW + candleW / 2},${svgH}`;

  return (
    <div className="rounded-xl bg-card/30 border border-border/20 overflow-hidden">
      <div className="px-3 pt-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`text-[11px] font-bold ${isChartPositive ? "text-green-400" : "text-red-400"}`}>
            {isChartPositive ? "\u25B2" : "\u25BC"} {Math.abs(chartChange).toFixed(2)}%
          </span>
          <span className="text-[10px] text-muted-foreground">in {period}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-muted-foreground">H:</span>
          <span className="text-[10px] text-foreground font-mono">{maxP.toFixed(7)}</span>
          <span className="text-[10px] text-muted-foreground ml-1">L:</span>
          <span className="text-[10px] text-foreground font-mono">{minP.toFixed(7)}</span>
        </div>
      </div>
      <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id="area-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={isChartPositive ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)"} />
            <stop offset="100%" stopColor="transparent" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((pct) => (
          <line key={pct} x1={0} x2={svgW} y1={svgH * pct} y2={svgH * pct} stroke="rgba(255,255,255,0.03)" strokeDasharray="3,6" />
        ))}
        <polygon points={areaFill} fill="url(#area-grad)" />
        {candles.map((c, i) => {
          const x = startX + i * totalCandleW;
          const bullish = c.close >= c.open;
          const color = bullish ? "#22c55e" : "#ef4444";
          const wickTop = svgH - ((c.high - adjMin) / adjRange) * (svgH - 20) - 10;
          const wickBot = svgH - ((c.low - adjMin) / adjRange) * (svgH - 20) - 10;
          const bodyTop = svgH - ((Math.max(c.open, c.close) - adjMin) / adjRange) * (svgH - 20) - 10;
          const bodyBot = svgH - ((Math.min(c.open, c.close) - adjMin) / adjRange) * (svgH - 20) - 10;
          const bodyH = Math.max(1, bodyBot - bodyTop);
          return (
            <g key={i}>
              <line x1={x + candleW / 2} x2={x + candleW / 2} y1={wickTop} y2={wickBot} stroke={color} strokeWidth={0.8} opacity={0.5} />
              <rect x={x} y={bodyTop} width={candleW} height={bodyH} fill={color} rx={0.3} />
            </g>
          );
        })}
      </svg>
      <div className="px-3 pb-2.5">
        <PeriodSelector periods={periods} current={period} onChange={setPeriod} />
      </div>
    </div>
  );
}

function PeriodSelector({ periods, current, onChange }: { periods: ChartPeriod[]; current: ChartPeriod; onChange: (p: ChartPeriod) => void }) {
  return (
    <div className="flex gap-0.5 bg-secondary/30 rounded-lg p-0.5 mt-2">
      {periods.map((p) => (
        <button key={p} onClick={() => onChange(p)} data-testid={`period-${p}`}
          className={`flex-1 py-1.5 rounded-md text-[9px] font-bold transition-all ${
            current === p ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}>
          {p}
        </button>
      ))}
    </div>
  );
}

function Stat({ label, value, color, sub }: { label: string; value: string; color?: string; sub?: string }) {
  return (
    <div className="stat-card">
      <div className="text-[9px] text-muted-foreground uppercase tracking-widest font-medium">{label}</div>
      <div className="text-xs font-bold font-mono" style={color ? { color } : undefined}>{value}</div>
      {sub && <div className="text-[8px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

export default function TokenPage() {
  const { selectedTokenId, navigate, user, formatPrice, fmtUsd, fmtWld, displayCurrency } = useApp();
  const [token, setToken] = useState<TokenDetail | null>(null);
  const [holders, setHolders] = useState<HolderInfo[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabName>("overview");
  const [showTrade, setShowTrade] = useState<"buy" | "sell" | null>(null);
  const [copied, setCopied] = useState(false);
  const pageVisible = usePageVisible();

  const loadToken = useCallback(async () => {
    if (!selectedTokenId) return;
    try {
      const data = await api.getToken(selectedTokenId);
      setToken(data);
    } catch (err) {
      console.error("[TokenPage] Error:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedTokenId]);

  useEffect(() => {
    loadToken();
  }, [loadToken]);

  useEffect(() => {
    if (!pageVisible) return;
    const iv = setInterval(loadToken, 8000);
    return () => clearInterval(iv);
  }, [loadToken, pageVisible]);

  useEffect(() => {
    if (!selectedTokenId) return;
    if (tab === "holders") {
      api.getTokenHolders(selectedTokenId).then(setHolders)
        .catch((err) => console.warn("[TokenPage] holders error:", err.message));
    }
    if (tab === "activity") {
      api.getTokenActivity(selectedTokenId).then((r) => setActivities(r.activities))
        .catch((err) => console.warn("[TokenPage] activity error:", err.message));
    }
  }, [selectedTokenId, tab]);

  const copyAddress = () => {
    if (token?.contractAddress) {
      navigator.clipboard.writeText(token.contractAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading || !token) {
    return (
      <div className="p-4 space-y-3">
        <div className="h-8 w-24 bg-card/30 rounded-lg animate-pulse" />
        <div className="h-48 bg-card/30 rounded-xl animate-pulse" />
        <div className="grid grid-cols-3 gap-2">
          {[...Array(6)].map((_, i) => <div key={i} className="h-14 bg-card/30 rounded-xl animate-pulse" style={{ animationDelay: `${i * 60}ms` }} />)}
        </div>
      </div>
    );
  }

  const isPositive = token.change24h >= 0;
  const curvePercent = token.curvePercent ?? 0;
  const stats = token.stats;
  const lockPct = token.totalSupply > 0 ? (token.lockedSupply / token.totalSupply * 100) : 0;
  const burnPct = token.totalSupply > 0 ? (token.burnedSupply / token.totalSupply * 100) : 0;
  const isCreator = user?.id === token.creatorId;

  const buyPressure = stats && (stats.buys + stats.sells) > 0
    ? Math.round((stats.buys / (stats.buys + stats.sells)) * 100)
    : 50;

  return (
    <div className="min-h-full pb-24" data-testid="token-page">
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-2xl px-4 py-2.5 flex items-center gap-2.5 border-b border-border/20">
        <button onClick={() => navigate("discovery")} data-testid="button-back"
          className="p-1.5 -ml-1 rounded-lg hover:bg-secondary/40 active:scale-95 transition-all">
          <ArrowLeft className="w-4.5 h-4.5 text-foreground" />
        </button>
        <div className="w-8 h-8 rounded-lg bg-secondary/40 flex items-center justify-center text-base shrink-0 overflow-hidden">
          {token.avatarUrl ? <img src={token.avatarUrl} alt="" className="w-full h-full object-cover" /> : token.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-black text-sm text-foreground">{token.symbol}</span>
            {token.graduated && <span className="badge-green">DEX</span>}
            {isCreator && <span className="badge-accent">Creator</span>}
          </div>
          <span className="text-[10px] text-muted-foreground">{token.name}</span>
        </div>
        <CurrencyToggle />
        <div className="text-right">
          <div className="text-sm font-black text-foreground font-mono">
            {formatPrice(token.priceWld)}
          </div>
          <div className={`text-[11px] font-bold ${isPositive ? "text-green-400" : "text-red-400"}`}>
            {isPositive ? "\u25B2" : "\u25BC"} {Math.abs(token.change24h).toFixed(1)}%
          </div>
        </div>
      </div>

      <div className="px-4 pt-3 space-y-3">
        {!token.graduated && (
          <FOMOBanner
            curvePercent={curvePercent}
            change24h={token.change24h}
            volume24h={token.volume24h}
            symbol={token.symbol}
          />
        )}

        <CandlestickChart tokenId={token.id} />

        <div className="p-3 rounded-xl bg-card/30 border border-border/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Bonding Curve</span>
            <span className={`text-[11px] font-bold ${curvePercent >= 100 ? "text-green-400" : curvePercent >= 80 ? "text-yellow-400" : "text-foreground"}`}>
              {curvePercent.toFixed(1)}%
            </span>
          </div>
          <div className="h-2 rounded-full bg-secondary/50 overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(curvePercent, 100)}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="h-full rounded-full"
              style={{ background: curvePercent >= 100 ? "linear-gradient(90deg, #22c55e, #06d6f7)" : curvePercent >= 80 ? "linear-gradient(90deg, #eab308, #f97316)" : "linear-gradient(90deg, #8b5cf6, #06b6d4)" }}
            />
          </div>
          <div className="flex justify-between text-[9px] text-muted-foreground mt-1.5">
            <span>{(token.totalWldInCurve ?? 0).toFixed(2)} WLD</span>
            <span>{token.holders} / 300 holders</span>
          </div>
        </div>

        {stats && (stats.buys + stats.sells) > 0 && (
          <BuyPressureIndicator buyPressure={buyPressure} />
        )}

        <div className="grid grid-cols-4 gap-1.5">
          <Stat label="MCap" value={fmtUsd(token.marketCap, { compact: true })} />
          <Stat label="Vol 24h" value={fmtUsd(token.volume24h, { compact: true })} />
          <Stat label="Liq" value={fmtWld(token.totalWldInCurve ?? 0, { compact: true })} />
          <Stat label="FDV" value={fmtWld(token.priceWld * token.totalSupply, { compact: true })} />
        </div>

        <div className="grid grid-cols-4 gap-1.5">
          <Stat label="Supply" value={formatCompact(token.totalSupply)} />
          <Stat label="Holders" value={String(token.holders)} />
          <Stat label="Lock" value={`${lockPct.toFixed(0)}%`} color={lockPct > 0 ? "#eab308" : undefined} />
          <Stat label="Burn" value={`${burnPct.toFixed(0)}%`} color={burnPct > 0 ? "#f97316" : undefined} />
        </div>

        {stats && (
          <div className="grid grid-cols-3 gap-1.5">
            <Stat label="TXNs" value={String(stats.txns)} />
            <Stat label="Buys" value={String(stats.buys)} color="#22c55e" />
            <Stat label="Sells" value={String(stats.sells)} color="#ef4444" />
          </div>
        )}

        <div className="flex gap-1.5">
          {lockPct > 0 && (
            <div className="flex items-center gap-1.5 flex-1 p-2 rounded-lg bg-yellow-500/8 border border-yellow-500/15">
              <Lock className="w-3 h-3 text-yellow-400" />
              <span className="text-[10px] text-yellow-400 font-medium">{lockPct.toFixed(0)}% Locked</span>
            </div>
          )}
          {burnPct > 0 && (
            <div className="flex items-center gap-1.5 flex-1 p-2 rounded-lg bg-orange-500/8 border border-orange-500/15">
              <Flame className="w-3 h-3 text-orange-400" />
              <span className="text-[10px] text-orange-400 font-medium">{burnPct.toFixed(0)}% Burned</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 flex-1 p-2 rounded-lg bg-green-500/8 border border-green-500/15">
            <Shield className="w-3 h-3 text-green-400" />
            <span className="text-[10px] text-green-400 font-medium">Verified</span>
          </div>
        </div>

        {token.contractAddress && (
          <button onClick={copyAddress} className="flex items-center gap-2 w-full p-2.5 rounded-lg bg-secondary/30 border border-border/15 transition-all active:scale-[0.99]">
            <Globe className="w-3 h-3 text-muted-foreground shrink-0" />
            <span className="text-[10px] text-muted-foreground font-mono flex-1 text-left truncate">{token.contractAddress}</span>
            {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3 text-muted-foreground" />}
          </button>
        )}

        <LiveActivityFeed tokenId={token.id} symbol={token.symbol} limit={5} />

        <div className="flex rounded-lg bg-secondary/30 p-0.5 gap-0.5">
          {(["overview", "holders", "activity"] as TabName[]).map((t) => (
            <button key={t} onClick={() => setTab(t)} data-testid={`tab-${t}`}
              className={`flex-1 py-2 rounded-md text-[10px] font-bold capitalize transition-all ${
                tab === t ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
              }`}>
              {t === "holders" ? `Holders (${token.holders})` : t}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {tab === "overview" && (
            <motion.div key="ov" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
              {token.description && (
                <p className="text-xs text-muted-foreground leading-relaxed">{token.description}</p>
              )}
              <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                <div className="p-2.5 rounded-lg bg-card/30 border border-border/15">
                  <span className="text-muted-foreground">Creator: </span>
                  <span className="text-foreground font-medium">{token.creatorName}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-card/30 border border-border/15">
                  <span className="text-muted-foreground">Created: </span>
                  <span className="text-foreground font-medium">{timeAgo(token.createdAt)}</span>
                </div>
              </div>
              {token.socials && Object.keys(token.socials).length > 0 && (
                <div className="flex gap-2">
                  {Object.entries(token.socials).map(([key, url]) => (
                    url && <a key={key} href={String(url)} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-secondary/30 border border-border/15 text-[10px] text-muted-foreground hover:text-foreground transition-colors">
                      <ExternalLink className="w-2.5 h-2.5" /> {key}
                    </a>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {tab === "holders" && (
            <motion.div key="h" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-1.5">
              {holders.length === 0 ? (
                <div className="text-center py-12 text-xs text-muted-foreground">No holders yet</div>
              ) : (
                holders.map((h, i) => (
                  <div key={h.userId} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-card/30 border border-border/15">
                    <span className="text-[10px] font-mono text-muted-foreground w-5 text-right">{i + 1}</span>
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold ${
                      i === 0 ? "bg-yellow-500/15 text-yellow-400" : i === 1 ? "bg-gray-400/15 text-gray-400" : i === 2 ? "bg-orange-500/15 text-orange-400" : "bg-secondary/40 text-muted-foreground"
                    }`}>
                      {h.username?.[0]?.toUpperCase() ?? "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-foreground truncate">{h.username}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">{formatCompact(h.amount)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-foreground">{h.percentage.toFixed(1)}%</div>
                      <div className="w-12 h-1 rounded-full bg-secondary/50 overflow-hidden mt-0.5">
                        <div className="h-full rounded-full bg-green-500/60" style={{ width: `${Math.min(h.percentage, 100)}%` }} />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </motion.div>
          )}

          {tab === "activity" && (
            <motion.div key="a" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-1.5">
              {activities.length === 0 ? (
                <div className="text-center py-12 text-xs text-muted-foreground">No activity yet</div>
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
                       <TrendingUp className="w-3.5 h-3.5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className={`text-[9px] font-bold uppercase ${
                          a.type === "buy" ? "text-green-400" : a.type === "sell" ? "text-red-400" : "text-violet-400"
                        }`}>{a.type}</span>
                        <span className="text-[11px] text-foreground font-medium truncate">{a.username}</span>
                      </div>
                      <div className="text-[9px] text-muted-foreground">{timeAgo(a.timestamp)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[11px] font-bold text-foreground font-mono">{formatCompact(a.amount)}</div>
                      {a.total != null && <div className="text-[9px] text-muted-foreground font-mono">{fmtWld(a.total, { decimals: 4 })}</div>}
                    </div>
                  </div>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {!token.graduated && (
        <div className="fixed bottom-0 left-0 right-0 z-30 p-3 bg-background/95 backdrop-blur-2xl border-t border-border/20 max-w-md mx-auto">
          <AnimatePresence mode="wait">
            {showTrade ? (
              <motion.div key="trade" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }}>
                <BuySellUI token={token} onSuccess={() => { setShowTrade(null); loadToken(); }} defaultTab={showTrade} onClose={() => setShowTrade(null)} />
              </motion.div>
            ) : (
              <motion.div key="buttons" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex gap-2">
                <button onClick={() => setShowTrade("buy")} data-testid="button-buy"
                  className="flex-1 py-3 rounded-xl bg-green-500 hover:bg-green-400 text-white font-black text-sm active:scale-[0.97] transition-all shadow-lg shadow-green-500/20">
                  Buy
                </button>
                <button onClick={() => setShowTrade("sell")} data-testid="button-sell"
                  className="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-400 text-white font-black text-sm active:scale-[0.97] transition-all shadow-lg shadow-red-500/20">
                  Sell
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
