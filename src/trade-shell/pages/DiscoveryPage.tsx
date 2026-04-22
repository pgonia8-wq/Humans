/**
 * DiscoveryPage — Feed del mercado.
 * Cableado a getAllTotems/searchTotems y getSystemMetrics reales.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Search, TrendingUp, Activity, Trophy } from "lucide-react";
import { getAllTotems, searchTotems, getSystemMetrics } from "../../lib/tradeApi";
import type { TotemProfile, SystemMetrics } from "../../lib/tradeApi";
import { enrich, formatUsd, formatWld } from "../services/derive";
import TokenRow from "../components/TokenRow";
import { useShell } from "../context/ShellContext";
import MarketPhysicsPanel from "../components/MarketPhysicsPanel";

type Sort = "volume" | "price" | "score" | "supply";

const SORTS: { id: Sort; label: string; Icon: typeof TrendingUp }[] = [
  { id: "volume", label: "Volumen",  Icon: Activity   },
  { id: "score",  label: "Score",    Icon: Trophy     },
  { id: "price",  label: "Precio",   Icon: TrendingUp },
];

export default function DiscoveryPage() {
  const { userId, openToken } = useShell();
  const [sort,    setSort]    = useState<Sort>("volume");
  const [q,       setQ]       = useState("");
  const [items,   setItems]   = useState<TotemProfile[]>([]);
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [err,     setErr]     = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setErr(null);
    try {
      const [list, m] = await Promise.all([
        q.trim() ? searchTotems(q.trim()) : getAllTotems(sort, 50, userId || undefined),
        getSystemMetrics().catch(() => null),
      ]);
      setItems(list); setMetrics(m);
    } catch (e: any) {
      setErr(e?.message ?? "No se pudo cargar el mercado.");
    } finally { setLoading(false); }
  }, [sort, q, userId]);

  useEffect(() => { load(); }, [load]);

  const enriched = useMemo(() => items.map(enrich), [items]);
  const top      = enriched[0];

  return (
    <div className="h-full w-full overflow-y-auto pb-28 scrollbar-hide">
      {/* Header + metrics */}
      <div className="px-4 pt-4">
        <h1 className="text-2xl font-bold text-white">H · Mercado</h1>
        <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.55)" }}>
          {metrics
            ? `${metrics.totalTotems} tótems · ${formatWld(metrics.totalVolume, 2)} 24h · ${metrics.totalHumans} humanos`
            : "Cargando métricas…"}
        </p>
      </div>

      {/* Market Physics Panel — consume /api/system/physics directamente */}
      <MarketPhysicsPanel />

      {/* Hero top totem */}
      {top && (
        <motion.button
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          onClick={() => openToken(top.address)}
          className="mx-4 mt-4 w-[calc(100%-2rem)] rounded-2xl p-4 text-left"
          style={{
            background: "linear-gradient(135deg, rgba(34,197,94,0.18) 0%, rgba(167,139,250,0.18) 100%)",
            border: "1px solid rgba(255,255,255,0.10)",
          }}
        >
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl"
              style={{ background: "rgba(0,0,0,0.30)" }}>
              {top.emoji}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.55)" }}>
                Top del mercado
              </div>
              <div className="text-white font-bold text-lg truncate">{top.name}</div>
              <div className="text-xs" style={{ color: "rgba(255,255,255,0.65)" }}>
                L{top.level} · {top.badge || "—"} · Score {Math.round(top.score)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-white font-bold tabular-nums">{formatUsd(top.price, 6)}</div>
              <div className="text-[11px]" style={{ color: "rgba(255,255,255,0.60)" }}>
                Score {Math.round(top.score)}
              </div>
            </div>
          </div>
        </motion.button>
      )}

      {/* Search */}
      <div className="px-4 mt-4">
        <div className="relative">
          <Search size={16}
            style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.45)" }} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar tótems…"
            className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm text-white placeholder:text-white/35 focus:outline-none"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
          />
        </div>
      </div>

      {/* Sort chips */}
      {!q.trim() && (
        <div className="px-4 mt-3 flex gap-2 overflow-x-auto scrollbar-hide">
          {SORTS.map(({ id, label, Icon }) => {
            const active = sort === id;
            return (
              <button
                key={id}
                onClick={() => setSort(id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium shrink-0 transition-colors"
                style={{
                  background: active ? "rgba(34,197,94,0.18)" : "rgba(255,255,255,0.04)",
                  border:     `1px solid ${active ? "rgba(34,197,94,0.4)" : "rgba(255,255,255,0.08)"}`,
                  color:      active ? "#22c55e" : "rgba(255,255,255,0.60)",
                }}
              >
                <Icon size={13} />
                {label}
              </button>
            );
          })}
        </div>
      )}

      {/* Lista */}
      <div className="px-4 mt-4 flex flex-col gap-2">
        {loading && (
          <div className="text-center text-sm py-8" style={{ color: "rgba(255,255,255,0.45)" }}>
            Cargando…
          </div>
        )}
        {err && !loading && (
          <div className="text-center text-sm py-4" style={{ color: "#fca5a5" }}>
            {err}
          </div>
        )}
        {!loading && enriched.slice(top ? 1 : 0).map((t, i) => (
          <TokenRow key={t.address} t={t} index={i} onClick={openToken} />
        ))}
        {!loading && !err && enriched.length === 0 && (
          <div className="text-center text-sm py-10" style={{ color: "rgba(255,255,255,0.45)" }}>
            No hay totems todavia. Se el primero en crear uno.
          </div>
        )}
      </div>
    </div>
  );
}
