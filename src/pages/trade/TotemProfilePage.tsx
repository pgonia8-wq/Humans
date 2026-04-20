/**
 * TotemProfilePage.tsx — Perfil público de un Totem + TradePanel
 */

import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { getTotemProfile, getTotemHistory, type TotemProfile, type TotemHistory } from "../../lib/tradeApi";
import PriceChart from "./components/PriceChart";
import TradePanel from "./components/TradePanel";

interface Props {
  address:       string;
  userId:        string;
  isDark:        boolean;
  walletAddress?: string | null;
  onBack:        () => void;
}

const BADGES: Record<string, string> = {
  Newcomer: "🌱", Builder: "🔨", Warrior: "⚔️", Champion: "🏆", Legend: "👑",
};

export default function TotemProfilePage({ address, userId, isDark, walletAddress, onBack }: Props) {
  const [totem,   setTotem]   = useState<TotemProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    getTotemProfile(address)
      .then(setTotem)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [address]);

  const bg     = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)";
  const border = isDark ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.09)";
  const txt    = isDark ? "#e5e7eb" : "#111827";
  const sub    = isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.45)";

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "60px 20px" }}>
        <div style={{ width: 32, height: 32, borderRadius: "50%",
          border: "3px solid #6366f1", borderTopColor: "transparent",
          animation: "spin 0.7s linear infinite", margin: "0 auto" }} />
      </div>
    );
  }

  if (error || !totem) {
    return (
      <div style={{ textAlign: "center", padding: "40px 20px" }}>
        <p style={{ color: "#dc2626", fontSize: 13 }}>{error ?? "Totem no encontrado"}</p>
        <button onClick={onBack} style={{ color: sub, background: "none", border: "none", cursor: "pointer", fontSize: 13 }}>
          ← Volver
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Back + Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button onClick={onBack} style={{
          background: "none", border: "none", cursor: "pointer",
          color: sub, padding: 4, display: "flex", alignItems: "center",
        }}>
          <ArrowLeft style={{ width: 18, height: 18 }} />
        </button>
        <div style={{ flex: 1 }}>
          <h2 style={{ color: txt, fontSize: 15, fontWeight: 800, margin: 0 }}>
            {BADGES[totem.badge] ?? "🌱"} {totem.name}
          </h2>
          <span style={{ fontSize: 10, color: sub }}>
            {totem.badge} · Nivel {totem.level}
          </span>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ color: txt, fontSize: 15, fontWeight: 800 }}>
            {totem.price.toFixed(8)}
          </div>
          <div style={{ color: sub, fontSize: 10 }}>WLD / token</div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ background: bg, borderRadius: 14, border: `1px solid ${border}`, padding: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          {[
            { label: "Supply",     value: totem.supply.toLocaleString() },
            { label: "Score",      value: totem.score.toLocaleString() },
            { label: "Influencia", value: totem.influence.toLocaleString() },
            { label: "Vol 24h",    value: `${totem.volume_24h.toFixed(2)} WLD` },
            { label: "Precio",     value: `${totem.price.toFixed(8)}` },
            { label: "Nivel",      value: `${totem.level} — ${totem.badge}` },
          ].map(({ label, value }) => (
            <div key={label} style={{
              background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)",
              borderRadius: 10, padding: "8px 10px", textAlign: "center",
            }}>
              <div style={{ color: txt, fontSize: 11, fontWeight: 700 }}>{value}</div>
              <div style={{ color: sub, fontSize: 10 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Chart */}
      <PriceChart totemAddress={totem.address} isDark={isDark} />

      {/* Trade (solo si el viewer tiene wallet) */}
      {walletAddress ? (
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
      ) : (
        <div style={{ textAlign: "center", padding: 16,
          background: bg, borderRadius: 14, border: `1px solid ${border}` }}>
          <p style={{ color: sub, fontSize: 12 }}>Conecta tu wallet para tradear</p>
        </div>
      )}
    </div>
  );
}
