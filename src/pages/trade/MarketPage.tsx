/**
 * MarketPage.tsx — Lista de Totems en el mercado con búsqueda y ordenamiento
 */

import { useEffect, useState, useCallback } from "react";
import { Search, TrendingUp, BarChart2, Zap } from "lucide-react";
import { getAllTotems, searchTotems, getSystemMetrics,
  type TotemProfile, type SystemMetrics } from "../../lib/tradeApi";
import TotemCard from "./components/TotemCard";

interface Props {
  isDark:         boolean;
  onSelectTotem:  (address: string) => void;
}

type SortKey = "volume" | "price" | "score" | "supply";

export default function MarketPage({ isDark, onSelectTotem }: Props) {
  const [totems,   setTotems]   = useState<TotemProfile[]>([]);
  const [metrics,  setMetrics]  = useState<SystemMetrics | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [query,    setQuery]    = useState("");
  const [sort,     setSort]     = useState<SortKey>("volume");
  const [searching, setSearching] = useState(false);

  const txt = isDark ? "#e5e7eb" : "#111827";
  const sub = isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.45)";
  const bg  = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)";
  const brd = isDark ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.09)";

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [list, m] = await Promise.all([getAllTotems(sort), getSystemMetrics()]);
      setTotems(list);
      setMetrics(m);
    } catch {
      setTotems([]);
    } finally {
      setLoading(false);
    }
  }, [sort]);

  useEffect(() => { loadAll(); }, [loadAll]);

  useEffect(() => {
    if (!query) { loadAll(); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const r = await searchTotems(query);
        setTotems(r);
      } catch { setTotems([]); }
      finally { setSearching(false); }
    }, 350);
    return () => clearTimeout(t);
  }, [query, loadAll]);

  const sorts: { key: SortKey; label: string }[] = [
    { key: "volume", label: "Vol" },
    { key: "price",  label: "Precio" },
    { key: "score",  label: "Score" },
    { key: "supply", label: "Supply" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Métricas del sistema */}
      {metrics && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          {[
            { icon: <BarChart2 size={12} />, label: "Totems",       value: metrics.totalTotems },
            { icon: <TrendingUp size={12} />, label: "Vol Total",    value: `${metrics.totalVolume.toFixed(1)} WLD` },
            { icon: <Zap size={12} />,        label: "Precio Medio", value: `${metrics.avgPrice.toFixed(8)}` },
          ].map(({ icon, label, value }) => (
            <div key={label} style={{
              background: bg, borderRadius: 12, border: `1px solid ${brd}`,
              padding: "10px 8px", textAlign: "center",
            }}>
              <div style={{ color: "#6366f1", marginBottom: 4 }}>{icon}</div>
              <div style={{ color: txt, fontSize: 12, fontWeight: 700 }}>{value}</div>
              <div style={{ color: sub, fontSize: 10 }}>{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Búsqueda */}
      <div style={{ position: "relative" }}>
        <Search style={{
          position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)",
          width: 14, height: 14, color: sub,
        }} />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Buscar Totem…"
          style={{
            width: "100%", padding: "9px 12px 9px 32px",
            borderRadius: 12, border: `1px solid ${brd}`,
            background: bg, color: txt, fontSize: 13, outline: "none",
            boxSizing: "border-box",
          }}
        />
      </div>

      {/* Sort */}
      <div style={{ display: "flex", gap: 6 }}>
        {sorts.map(s => (
          <button key={s.key}
            onClick={() => setSort(s.key)}
            style={{
              padding: "5px 12px", borderRadius: 8, fontSize: 11, fontWeight: 700,
              cursor: "pointer", border: "none",
              background: sort === s.key ? "#6366f1" : bg,
              color: sort === s.key ? "#fff" : sub,
            }}>
            {s.label}
          </button>
        ))}
      </div>

      {/* Lista */}
      {(loading || searching) ? (
        <div style={{ textAlign: "center", padding: "40px" }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%",
            border: "3px solid #6366f1", borderTopColor: "transparent",
            animation: "spin 0.7s linear infinite", margin: "0 auto" }} />
        </div>
      ) : totems.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px" }}>
          <p style={{ color: sub, fontSize: 13 }}>No se encontraron Totems</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {totems.map((t, i) => (
            <TotemCard
              key={t.address}
              totem={t}
              rank={i + 1}
              isDark={isDark}
              onClick={() => onSelectTotem(t.address)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
