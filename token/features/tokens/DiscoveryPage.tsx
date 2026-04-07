import { useState, useEffect, useCallback, useRef } from "react";
  import { formatNum, formatCompact, type Token } from "@/services/types";
  import { api } from "@/services/api";
  import { useApp } from "@/context/AppContext";
  import { motion, AnimatePresence } from "framer-motion";
  import {
    Search, TrendingUp, Flame, Rocket, Crown,
    ArrowUp, ArrowDown, Users, BarChart3, Clock,
    Zap, Star, Filter, ChevronRight
  } from "lucide-react";

  type SortOption = "newest" | "volume" | "marketcap" | "holders" | "trending";
  type FilterOption = "all" | "new" | "graduating" | "graduated";

  function MarketTicker({ tokens }: { tokens: Token[] }) {
    const top = tokens.filter(t => t.volume24h > 0).sort((a, b) => b.change24h - a.change24h).slice(0, 10);
    if (top.length === 0) return null;
    return (
      <div className="overflow-hidden py-2 border-b border-border/20">
        <div className="flex animate-[scroll_30s_linear_infinite] gap-6 whitespace-nowrap">
          {[...top, ...top].map((t, i) => (
            <span key={i} className="inline-flex items-center gap-1.5 text-xs">
              <span className="font-bold text-foreground/90">{t.symbol}</span>
              <span className={t.change24h >= 0 ? "text-green-400" : "text-red-400"}>
                {t.change24h >= 0 ? "+" : ""}{t.change24h.toFixed(1)}%
              </span>
            </span>
          ))}
        </div>
      </div>
    );
  }

  function StatBanner({ tokens }: { tokens: Token[] }) {
    const totalMcap = tokens.reduce((s, t) => s + t.marketCap, 0);
    const totalVol = tokens.reduce((s, t) => s + t.volume24h, 0);
    const totalHolders = tokens.reduce((s, t) => s + t.holders, 0);
    const graduating = tokens.filter(t => t.curvePercent >= 80 && !t.graduated).length;

    return (
      <div className="grid grid-cols-4 gap-2 px-4 py-3">
        <div className="stat-card items-center">
          <span className="text-[9px] text-muted-foreground font-medium uppercase tracking-wider">Tokens</span>
          <span className="text-sm font-bold text-foreground">{tokens.length}</span>
        </div>
        <div className="stat-card items-center">
          <span className="text-[9px] text-muted-foreground font-medium uppercase tracking-wider">MCap</span>
          <span className="text-sm font-bold text-green-400">${formatCompact(totalMcap)}</span>
        </div>
        <div className="stat-card items-center">
          <span className="text-[9px] text-muted-foreground font-medium uppercase tracking-wider">24h Vol</span>
          <span className="text-sm font-bold text-foreground">${formatCompact(totalVol)}</span>
        </div>
        <div className="stat-card items-center">
          <span className="text-[9px] text-muted-foreground font-medium uppercase tracking-wider">Grad.</span>
          <span className="text-sm font-bold text-yellow-400">{graduating}</span>
        </div>
      </div>
    );
  }

  function TokenRow({ token, onClick, rank }: { token: Token; onClick: () => void; rank: number }) {
    const isPositive = token.change24h >= 0;
    const curveColor = token.graduated ? "bg-green-500" :
      token.curvePercent >= 80 ? "bg-yellow-400" :
      token.curvePercent >= 50 ? "bg-violet-500" : "bg-violet-500/60";

    return (
      <button
        onClick={onClick}
        data-testid={`card-token-${token.id}`}
        className="w-full flex items-center gap-2.5 p-3 rounded-xl bg-card/40 border border-border/30 hover:border-border/60 active:scale-[0.99] transition-all duration-150 text-left group"
      >
        <span className="text-[10px] text-muted-foreground font-mono w-5 text-right shrink-0">{rank}</span>

        <div className="w-9 h-9 rounded-lg bg-secondary/60 flex items-center justify-center text-lg shrink-0 overflow-hidden">
          {token.avatarUrl ? (
            <img src={token.avatarUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <span>{token.emoji}</span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-[13px] text-foreground truncate">{token.symbol}</span>
            {token.graduated && <span className="badge-green">DEX</span>}
            {token.curvePercent >= 80 && !token.graduated && <span className="badge-yellow">GRAD</span>}
            {token.isTrending && <Zap className="w-3 h-3 text-yellow-400" />}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[11px] text-muted-foreground truncate">{token.name}</span>
            <span className="text-[10px] text-muted-foreground/60">·</span>
            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
              <Users className="w-2.5 h-2.5" />{token.holders}
            </span>
          </div>
        </div>

        <div className="text-right shrink-0 min-w-[70px]">
          <div className="text-[13px] font-bold text-foreground font-mono">
            {token.priceWld < 0.001
              ? token.priceWld.toExponential(1)
              : token.priceWld < 1
              ? token.priceWld.toFixed(6)
              : token.priceWld.toFixed(4)}
          </div>
          <div className={`text-[11px] font-semibold ${isPositive ? "text-green-400" : "text-red-400"}`}>
            {isPositive ? "\u25B2" : "\u25BC"} {Math.abs(token.change24h).toFixed(1)}%
          </div>
        </div>

        <div className="w-10 shrink-0 flex flex-col items-center gap-0.5">
          <div className="w-full h-1 rounded-full bg-secondary/80 overflow-hidden">
            <div className={`h-full rounded-full ${curveColor} transition-all duration-700`}
              style={{ width: `${Math.min(token.curvePercent, 100)}%` }} />
          </div>
          <span className="text-[8px] text-muted-foreground font-bold">{token.curvePercent.toFixed(0)}%</span>
        </div>
      </button>
    );
  }

  function HeroCard({ token, onClick, variant }: { token: Token; onClick: () => void; variant: "hot" | "new" }) {
    const isHot = variant === "hot";
    return (
      <button onClick={onClick} data-testid={`${variant}-token-${token.id}`}
        className={`shrink-0 w-[130px] p-3 rounded-xl border text-left transition-all active:scale-95 ${
          isHot
            ? "bg-gradient-to-br from-orange-500/8 to-red-500/8 border-orange-500/15 hover:border-orange-500/30"
            : "bg-gradient-to-br from-violet-500/8 to-cyan-500/8 border-violet-500/15 hover:border-violet-500/30"
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="w-8 h-8 rounded-lg bg-secondary/40 flex items-center justify-center text-base overflow-hidden">
            {token.avatarUrl ? <img src={token.avatarUrl} alt="" className="w-full h-full object-cover" /> : token.emoji}
          </div>
          {isHot && <Flame className="w-3.5 h-3.5 text-orange-400" />}
        </div>
        <div className="font-bold text-xs text-foreground">{token.symbol}</div>
        <div className="text-[10px] text-muted-foreground truncate mt-0.5">{token.name}</div>
        {isHot ? (
          <div className="text-green-400 text-[11px] font-bold mt-1.5">+{token.change24h.toFixed(0)}%</div>
        ) : (
          <div className="flex items-center gap-1 mt-1.5">
            <div className="h-1 flex-1 rounded-full bg-secondary/60 overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400"
                style={{ width: `${token.curvePercent}%` }} />
            </div>
            <span className="text-[9px] text-cyan-400 font-bold">{token.curvePercent.toFixed(0)}%</span>
          </div>
        )}
      </button>
    );
  }

  export default function DiscoveryPage() {
    const { navigate } = useApp();
    const [search, setSearch] = useState("");
    const [sort, setSort] = useState<SortOption>("newest");
    const [filter, setFilter] = useState<FilterOption>("all");
    const [allTokens, setAllTokens] = useState<Token[]>([]);
    const [loading, setLoading] = useState(true);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const fetchingRef = useRef(false);

    const loadTokens = useCallback(async () => {
      if (fetchingRef.current) return;
      fetchingRef.current = true;
      try {
        const res = await api.getTokens({ sort });
        setAllTokens(res.tokens);
      } catch (err) {
        console.error("[Discovery] load error:", err);
      } finally {
        fetchingRef.current = false;
        setLoading(false);
      }
    }, [sort]);

    useEffect(() => {
      loadTokens();
      intervalRef.current = setInterval(loadTokens, 8000);
      return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }, [loadTokens]);

    const filtered = allTokens.filter(t => {
      if (search) {
        const q = search.toLowerCase();
        if (!t.name.toLowerCase().includes(q) && !t.symbol.toLowerCase().includes(q)) return false;
      }
      if (filter === "new") return t.curvePercent < 20;
      if (filter === "graduating") return t.curvePercent >= 80 && !t.graduated;
      if (filter === "graduated") return t.graduated;
      return true;
    });

    const exploding = allTokens.filter(t => t.change24h > 30).sort((a, b) => b.change24h - a.change24h);
    const earlyTokens = allTokens.filter(t => t.curvePercent < 15 && !t.graduated).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const sortOptions: { key: SortOption; label: string; icon: typeof TrendingUp }[] = [
      { key: "newest", label: "New", icon: Clock },
      { key: "trending", label: "Hot", icon: Flame },
      { key: "volume", label: "Vol", icon: BarChart3 },
      { key: "marketcap", label: "MCap", icon: Crown },
      { key: "holders", label: "Holders", icon: Users },
    ];

    const filterOptions: { key: FilterOption; label: string }[] = [
      { key: "all", label: "All" },
      { key: "new", label: "Early" },
      { key: "graduating", label: "Graduating" },
      { key: "graduated", label: "DEX Live" },
    ];

    return (
      <div className="min-h-full pb-4" data-testid="discovery-page">
        <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-2xl border-b border-border/20">
          <div className="flex items-center justify-between px-4 pt-3 pb-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                <span className="text-white font-black text-sm">H</span>
              </div>
              <div>
                <h1 className="text-base font-black text-foreground tracking-tight leading-tight">Token Market</h1>
                <p className="text-[9px] text-muted-foreground uppercase tracking-widest font-medium">Powered by World Chain</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] text-green-400 font-medium">Live</span>
            </div>
          </div>

          <MarketTicker tokens={allTokens} />

          <div className="px-4 py-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or symbol..."
                data-testid="input-search"
                className="w-full pl-9 pr-4 py-2 rounded-lg bg-secondary/60 border border-border/30 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-green-500/40 focus:ring-1 focus:ring-green-500/10 transition-all"
              />
            </div>
          </div>

          <div className="flex gap-1 px-4 pb-2 overflow-x-auto scrollbar-hide">
            {filterOptions.map(f => (
              <button key={f.key} onClick={() => setFilter(f.key)}
                className={`px-3 py-1 rounded-md text-[10px] font-bold whitespace-nowrap transition-all ${
                  filter === f.key
                    ? "bg-green-500/15 text-green-400 border border-green-500/25"
                    : "text-muted-foreground hover:text-foreground border border-transparent"
                }`}
              >{f.label}</button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="px-4 pt-4 space-y-2">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-14 rounded-xl bg-card/30 animate-pulse" style={{ animationDelay: `${i * 80}ms` }} />
            ))}
          </div>
        ) : (
          <div className="pt-2 space-y-4">
            <StatBanner tokens={allTokens} />

            {!search && exploding.length > 0 && (
              <section className="px-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-orange-400" />
                    <h2 className="text-xs font-black text-foreground uppercase tracking-wide">Exploding</h2>
                  </div>
                  <span className="text-[9px] text-muted-foreground">{exploding.length} tokens</span>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4">
                  {exploding.slice(0, 8).map(t => (
                    <HeroCard key={t.id} token={t} onClick={() => navigate("token", { tokenId: t.id })} variant="hot" />
                  ))}
                </div>
              </section>
            )}

            {!search && earlyTokens.length > 0 && (
              <section className="px-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <Rocket className="w-3.5 h-3.5 text-violet-400" />
                    <h2 className="text-xs font-black text-foreground uppercase tracking-wide">Get In Early</h2>
                  </div>
                  <span className="text-[9px] text-muted-foreground">{earlyTokens.length} tokens</span>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4">
                  {earlyTokens.slice(0, 8).map(t => (
                    <HeroCard key={t.id} token={t} onClick={() => navigate("token", { tokenId: t.id })} variant="new" />
                  ))}
                </div>
              </section>
            )}

            <section className="px-4">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xs font-black text-foreground uppercase tracking-wide">
                  {search ? `Results (${filtered.length})` : "All Tokens"}
                </h2>
                <div className="flex gap-0.5 bg-secondary/40 rounded-lg p-0.5">
                  {sortOptions.map(opt => {
                    const Icon = opt.icon;
                    return (
                      <button key={opt.key} onClick={() => setSort(opt.key)} data-testid={`sort-${opt.key}`}
                        className={`flex items-center gap-1 px-2 py-1 rounded-md text-[9px] font-bold transition-all ${
                          sort === opt.key
                            ? "bg-card text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <Icon className="w-2.5 h-2.5" />{opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5">
                {filtered.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="text-3xl mb-2">🔍</div>
                    <div className="text-sm text-muted-foreground">No tokens found</div>
                  </div>
                ) : (
                  filtered.map((t, i) => (
                    <TokenRow key={t.id} token={t} rank={i + 1} onClick={() => navigate("token", { tokenId: t.id })} />
                  ))
                )}
              </div>
            </section>
          </div>
        )}

        <style>{`
          @keyframes scroll {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
        `}</style>
      </div>
    );
  }
  