/**
 * TotemDashboard.tsx — Mi Totem: saldo, chart de precio, y panel de trading
 */

import { useEffect, useState, useCallback } from "react";
import { BarChart2, TrendingUp, Globe, Plus } from "lucide-react";
import { getTotemProfile, createTotem, type TotemProfile } from "../../lib/tradeApi";
import PriceChart from "./components/PriceChart";
import TradePanel from "./components/TradePanel";

interface Props {
  userId:        string;
  walletAddress: string | null;
  isDark:        boolean;
  onViewMarket:  () => void;
}

const BADGES: Record<string, string> = {
  Newcomer:  "🌱",
  Builder:   "🔨",
  Warrior:   "⚔️",
  Champion:  "🏆",
  Legend:    "👑",
};

export default function TotemDashboard({ userId, walletAddress, isDark, onViewMarket }: Props) {
  const [totem, setTotem]     = useState<TotemProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!walletAddress) { setLoading(false); return; }
    setLoading(true); setError(null);
    try {
      const p = await getTotemProfile(walletAddress);
      setTotem(p);
    } catch {
      setTotem(null);
    } finally {
      setLoading(false);
    }
  }, [walletAddress]);

  useEffect(() => { load(); }, [load]);

  async function handleCreate() {
    if (!walletAddress) return;
    setCreating(true);
    try {
      const name = walletAddress.slice(0, 6) + "…" + walletAddress.slice(-4);
      const p = await createTotem(walletAddress, name, userId);
      setTotem(p);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setCreating(false);
    }
  }

  const bg     = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)";
  const border = isDark ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.09)";
  const txt    = isDark ? "#e5e7eb" : "#111827";
  const sub    = isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.45)";

  if (!walletAddress) {
    return (
      <div style={{ textAlign: "center", padding: "40px 20px" }}>
        <p style={{ color: sub, fontSize: 13 }}>Conecta tu wallet para ver tu Totem</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "60px 20px" }}>
        <div style={{ width: 32, height: 32, borderRadius: "50%",
          border: "3px solid #6366f1", borderTopColor: "transparent",
          animation: "spin 0.7s linear infinite", margin: "0 auto 12px" }} />
        <p style={{ color: sub, fontSize: 12 }}>Cargando tu Totem…</p>
      </div>
    );
  }

  if (!totem) {
    return (
      <div style={{ textAlign: "center", padding: "40px 20px" }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🌱</div>
        <h3 style={{ color: txt, fontSize: 16, fontWeight: 800, marginBottom: 8 }}>
          Sin Totem aún
        </h3>
        <p style={{ color: sub, fontSize: 12, marginBottom: 20 }}>
          Crea tu Totem para participar en el mercado
        </p>
        {error && <p style={{ color: "#dc2626", fontSize: 11, marginBottom: 12 }}>{error}</p>}
        <button
          onClick={handleCreate}
          disabled={creating}
          style={{
            padding: "10px 24px", borderRadius: 12, border: "none",
            background: "#6366f1", color: "#fff", fontSize: 13, fontWeight: 700,
            cursor: creating ? "wait" : "pointer",
          }}
        >
          {creating ? "Creando…" : "Crear mi Totem"}
        </button>
        <div style={{ marginTop: 16 }}>
          <button
            onClick={onViewMarket}
            style={{ display: "inline-flex", alignItems: "center", gap: 6,
              color: sub, fontSize: 12, background: "none", border: "none", cursor: "pointer" }}>
            <Globe style={{ width: 13, height: 13 }} /> Ver mercado
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Cabecera Totem */}
      <div style={{ background: bg, borderRadius: 16, border: `1px solid ${border}`, padding: 16 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 22 }}>{BADGES[totem.badge] ?? "🌱"}</span>
              <div>
                <h2 style={{ color: txt, fontSize: 15, fontWeight: 800, margin: 0 }}>
                  {totem.name}
                </h2>
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 6,
                  background: "#6366f115", color: "#6366f1",
                }}>
                  {totem.badge} · Nv {totem.level}
                </span>
              </div>
            </div>
            <p style={{ color: sub, fontSize: 10, margin: 0 }}>
              {totem.address.slice(0, 8)}…{totem.address.slice(-6)}
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ color: txt, fontSize: 16, fontWeight: 800 }}>
              {totem.price.toFixed(8)}
            </div>
            <div style={{ color: sub, fontSize: 10 }}>WLD / token</div>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 12 }}>
          {[
            { label: "Supply",     value: totem.supply.toLocaleString() },
            { label: "Score",      value: totem.score.toLocaleString() },
            { label: "Vol 24h",    value: `${totem.volume_24h.toFixed(2)} WLD` },
          ].map(({ label, value }) => (
            <div key={label} style={{
              background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)",
              borderRadius: 10, padding: "8px 10px", textAlign: "center",
            }}>
              <div style={{ color: txt, fontSize: 12, fontWeight: 700 }}>{value}</div>
              <div style={{ color: sub, fontSize: 10 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Chart */}
      <PriceChart totemAddress={totem.address} isDark={isDark} />

      {/* Panel de trading */}
      <TradePanel
        totemAddress={totem.address}
        totemName={totem.name}
        userId={userId}
        isDark={isDark}
        walletAddress={walletAddress}
        onTradeSuccess={(_, newPrice, newSupply) => {
          setTotem(prev => prev ? { ...prev, price: newPrice, supply: newSupply } : prev);
        }}
      />

      {/* Link mercado */}
      <button
        onClick={onViewMarket}
        style={{
          width: "100%", padding: "10px", borderRadius: 12,
          background: "transparent", border: `1px solid ${border}`,
          color: sub, fontSize: 12, fontWeight: 600, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
        }}>
        <Globe style={{ width: 13, height: 13 }} />
        Ver todos los Totems
      </button>
    </div>
  );
}
