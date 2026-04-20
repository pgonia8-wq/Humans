/**
 * TotemDashboard.tsx — FASE 4: Centro de trading completo de un Totem
 *
 *  Estructura:
 *   - Header premium: nombre · address · score badge · precio grande · delta · health
 *   - Chart central (PriceChart) con data real de getTotemHistory()
 *   - Métricas: Supply · Vol 24h · Holders · Market Cap (derivado)
 *   - Tabs secundarios: Trades · Holders · Score History (placeholders elegantes)
 *   - TradePanel en sidebar derecho (desktop ≥920px) o stacked (mobile)
 *
 *  Data:
 *   - getTotemProfile(address)   → identidad + métricas
 *   - getTotemHistory(address)   → serie para PriceChart
 *   - 3 estados explícitos: loading / error / success (sin mock data)
 */

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import {
  ArrowLeft, AlertTriangle, RotateCw, Activity, Heart, Flame, ShieldAlert,
  TrendingUp, TrendingDown, Layers, BarChart2, Users, History,
} from "lucide-react";
import {
  getTotemProfile, getTotemHistory,
  type TotemProfile, type TotemHistory,
} from "../../lib/tradeApi";
import PriceChart, { type PricePoint } from "./components/PriceChart";
import TradePanel from "./components/TradePanel";

// ── Props ───────────────────────────────────────────────────────────────────
interface Props {
  totemAddress:    string;
  isDark:          boolean;
  userId:          string;
  walletAddress?:  string | null;
  userBalanceWld?: number;
  onBack:          () => void;
}

type Health   = "healthy" | "volatile" | "stress";
type SubTab   = "trades" | "holders" | "score";

// ── Helpers ─────────────────────────────────────────────────────────────────
function shortAddr(a: string) {
  return a && a.length >= 10 ? `${a.slice(0,6)}…${a.slice(-4)}` : a;
}
function fmtPrice(p: number): string {
  if (!isFinite(p) || p === 0) return "0.0000";
  if (p >= 1)      return p.toFixed(4);
  if (p >= 0.0001) return p.toFixed(6);
  return p.toExponential(3);
}
function fmtCompact(n: number): string {
  if (!isFinite(n)) return "0";
  const abs = Math.abs(n);
  if (abs >= 1e9) return (n / 1e9).toFixed(2) + "B";
  if (abs >= 1e6) return (n / 1e6).toFixed(2) + "M";
  if (abs >= 1e3) return (n / 1e3).toFixed(2) + "K";
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}
function deriveHealth(score: number): Health {
  if (score >= 70) return "healthy";
  if (score >= 40) return "volatile";
  return "stress";
}
function deriveScoreTier(score: number): "high" | "mid" | "low" {
  if (score >= 70) return "high";
  if (score >= 40) return "mid";
  return "low";
}

const HEALTH_META = {
  healthy:  { label: "Healthy",  color: "#22c55e", bg: "rgba(34,197,94,0.10)",  border: "rgba(34,197,94,0.28)",  Icon: Heart },
  volatile: { label: "Volatile", color: "#fbbf24", bg: "rgba(251,191,36,0.10)", border: "rgba(251,191,36,0.30)", Icon: Flame },
  stress:   { label: "Stress",   color: "#f87171", bg: "rgba(248,113,113,0.10)",border: "rgba(248,113,113,0.30)",Icon: ShieldAlert },
} as const;

const SCORE_TIER = {
  high: { bg: "linear-gradient(135deg, #6366f1, #a855f7)", glow: "0 4px 18px rgba(99,102,241,0.40)", txt: "#fff" },
  mid:  { bg: "linear-gradient(135deg, #4b5563, #1f2937)", glow: "0 4px 14px rgba(0,0,0,0.40)",     txt: "#fff" },
  low:  { bg: "linear-gradient(135deg, #7f1d1d, #450a0a)", glow: "0 4px 14px rgba(127,29,29,0.40)", txt: "#fff" },
} as const;

// ── Hook responsive ─────────────────────────────────────────────────────────
function useDesktop(breakpoint = 920): boolean {
  const [isDesktop, setIsDesktop] = useState(
    typeof window !== "undefined" ? window.innerWidth >= breakpoint : false,
  );
  useEffect(() => {
    const m = window.matchMedia(`(min-width: ${breakpoint}px)`);
    const cb = () => setIsDesktop(m.matches);
    m.addEventListener("change", cb);
    setIsDesktop(m.matches);
    return () => m.removeEventListener("change", cb);
  }, [breakpoint]);
  return isDesktop;
}

// ════════════════════════════════════════════════════════════════════════════
//  COMPONENTE
// ════════════════════════════════════════════════════════════════════════════
export default function TotemDashboard({
  totemAddress, isDark, userId, walletAddress, userBalanceWld, onBack,
}: Props) {
  const [profile,   setProfile]   = useState<TotemProfile | null>(null);
  const [history,   setHistory]   = useState<TotemHistory[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [updating,  setUpdating]  = useState(false);
  const [error,     setError]     = useState(false);
  const [subTab,    setSubTab]    = useState<SubTab>("trades");
  const reqIdRef = useRef(0);
  const isDesktop = useDesktop();

  // ── Carga (con race-safe + sin flash) ────────────────────────────────
  const load = useCallback(async (silent = false) => {
    const id = ++reqIdRef.current;
    setError(false);
    if (silent) setUpdating(true);
    else        setLoading(true);
    try {
      const [p, h] = await Promise.all([
        getTotemProfile(totemAddress),
        getTotemHistory(totemAddress, 96).catch(() => [] as TotemHistory[]),
      ]);
      if (id !== reqIdRef.current) return;
      setProfile(p);
      setHistory(Array.isArray(h) ? h : []);
    } catch {
      if (id !== reqIdRef.current) return;
      setError(true);
    } finally {
      if (id === reqIdRef.current) { setLoading(false); setUpdating(false); }
    }
  }, [totemAddress]);

  useEffect(() => { load(); }, [load]);

  // ── Refresco silencioso al ejecutar trade ─────────────────────────────
  const onTradeSuccess = useCallback(() => { load(true); }, [load]);

  // ── Derivados ────────────────────────────────────────────────────────
  const series: PricePoint[] = useMemo(
    () => history
      .slice()
      .sort((a, b) => +new Date(a.timestamp) - +new Date(b.timestamp))
      .map((h) => ({ time: h.timestamp, price: Number(h.price) || 0 })),
    [history],
  );

  const delta = useMemo(() => {
    if (series.length < 2) return null;
    const first = series[0].price, last = series[series.length - 1].price;
    if (!first) return null;
    return ((last - first) / first) * 100;
  }, [series]);

  const marketCap = profile ? profile.price * profile.supply : 0;
  const health    = profile ? deriveHealth(profile.score) : "volatile";
  const tier      = profile ? deriveScoreTier(profile.score) : "mid";

  // ── Tokens visuales ──────────────────────────────────────────────────
  const txt        = isDark ? "#ffffff" : "#111827";
  const txtSub     = isDark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.55)";
  const txtMuted   = isDark ? "rgba(255,255,255,0.32)" : "rgba(0,0,0,0.40)";
  const cardBg     = isDark ? "#111113" : "#ffffff";
  const cardBorder = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";

  // ── ESTADOS GLOBALES ─────────────────────────────────────────────────
  if (loading) {
    return <DashboardSkeleton isDark={isDark} onBack={onBack} />;
  }
  if (error || !profile) {
    return <DashboardError isDark={isDark} onRetry={() => load()} onBack={onBack} />;
  }

  const hMeta = HEALTH_META[health];
  const tMeta = SCORE_TIER[tier];

  // ════════════════════════════════════════════════════════════════════════
  //  RENDER
  // ════════════════════════════════════════════════════════════════════════
  return (
    <div style={{ paddingBottom: 32, position: "relative" }}>
      <style>{TD_KEYFRAMES}</style>

      {/* ─── BACK BAR ─────────────────────────────────────────────────── */}
      <button
        onClick={onBack}
        style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          background: "transparent", border: "none", color: txtSub,
          fontSize: 12, fontWeight: 700, letterSpacing: -0.1,
          cursor: "pointer", padding: "6px 8px 6px 0", marginBottom: 10,
        }}
      >
        <ArrowLeft size={14} strokeWidth={2.6} /> Mercado
      </button>

      {/* ─── HEADER PREMIUM ───────────────────────────────────────────── */}
      <div style={{
        background: cardBg,
        border: `1px solid ${cardBorder}`,
        borderRadius: 24,
        padding: "16px 18px",
        marginBottom: 14,
        boxShadow: isDark
          ? "0 8px 28px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.04)"
          : "0 4px 18px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.80)",
        position: "relative",
        overflow: "hidden",
        opacity: updating ? 0.85 : 1,
        transition: "opacity 200ms ease",
      }}>
        {/* línea fina superior con gradient brand */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 1,
          background: "linear-gradient(90deg, transparent, rgba(99,102,241,0.55), transparent)",
        }} />

        {/* Identidad */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          {/* Score badge avatar */}
          <div style={{
            width: 44, height: 44, borderRadius: 14,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: tMeta.bg, color: tMeta.txt,
            boxShadow: `${tMeta.glow}, inset 0 1px 0 rgba(255,255,255,0.20)`,
            border: "1px solid rgba(255,255,255,0.14)",
            fontSize: 17, fontWeight: 900, letterSpacing: -0.4,
          }}>
            {profile.name.trim().charAt(0).toUpperCase()}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{
              fontSize: 17, fontWeight: 900, color: txt, letterSpacing: -0.3,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              lineHeight: 1.15,
            }}>
              {profile.name}
            </div>
            <div style={{
              fontSize: 10.5, color: txtMuted,
              fontFamily: "ui-monospace, SFMono-Regular, monospace",
              letterSpacing: 0.2, marginTop: 2,
            }}>
              {shortAddr(profile.address)}
            </div>
          </div>

          {/* Score pill */}
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            padding: "4px 10px", borderRadius: 999,
            background: "rgba(99,102,241,0.14)",
            border: "1px solid rgba(99,102,241,0.28)",
          }}>
            <Activity size={11} strokeWidth={2.6} color="#a78bfa" />
            <span style={{
              fontSize: 11, fontWeight: 800, color: "#a78bfa",
              fontVariantNumeric: "tabular-nums",
            }}>
              {Math.round(profile.score)}
            </span>
          </div>
        </div>

        {/* Precio + delta + health */}
        <div style={{ display: "flex", alignItems: "flex-end", gap: 10, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 10, fontWeight: 800, color: txtMuted,
              letterSpacing: 1.4, textTransform: "uppercase", marginBottom: 3,
            }}>
              Precio
            </div>
            <div style={{
              fontSize: 30, fontWeight: 900, color: txt,
              letterSpacing: -0.8, lineHeight: 1.05,
              fontVariantNumeric: "tabular-nums",
            }}>
              {fmtPrice(profile.price)}{" "}
              <span style={{ fontSize: 12, fontWeight: 700, color: txtMuted, letterSpacing: 1 }}>WLD</span>
            </div>
          </div>

          {delta != null && (
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              padding: "5px 9px", borderRadius: 10,
              background: delta >= 0 ? "rgba(34,197,94,0.10)" : "rgba(248,113,113,0.10)",
              border: `1px solid ${delta >= 0 ? "rgba(34,197,94,0.24)" : "rgba(248,113,113,0.24)"}`,
              color: delta >= 0 ? "#22c55e" : "#f87171",
              fontSize: 12, fontWeight: 800, fontVariantNumeric: "tabular-nums",
            }}>
              {delta >= 0 ? <TrendingUp size={12} strokeWidth={2.6} /> : <TrendingDown size={12} strokeWidth={2.6} />}
              {delta >= 0 ? "+" : ""}{delta.toFixed(2)}%
            </div>
          )}

          {/* Health pill */}
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            padding: "5px 9px", borderRadius: 10,
            background: hMeta.bg,
            border: `1px solid ${hMeta.border}`,
            color: hMeta.color,
            fontSize: 11, fontWeight: 800, letterSpacing: -0.1,
          }}>
            <hMeta.Icon size={12} strokeWidth={2.6} />
            {hMeta.label}
          </div>
        </div>
      </div>

      {/* ─── GRID PRINCIPAL ──────────────────────────────────────────── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: isDesktop ? "minmax(0, 1fr) 340px" : "minmax(0, 1fr)",
        gap: 14,
        alignItems: "start",
      }}>
        {/* === COLUMNA IZQUIERDA: Chart + métricas + tabs === */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>

          {/* ── CHART ──────────────────────────────────────────────── */}
          <div style={{
            background: cardBg,
            border: `1px solid ${cardBorder}`,
            borderRadius: 24,
            padding: "12px 12px 6px",
            boxShadow: isDark
              ? "0 8px 28px rgba(0,0,0,0.40), inset 0 1px 0 rgba(255,255,255,0.04)"
              : "0 4px 18px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.80)",
            opacity: updating ? 0.85 : 1,
            transition: "opacity 200ms ease",
          }}>
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "2px 6px 6px",
            }}>
              <span style={{
                fontSize: 10, fontWeight: 800, color: txtMuted,
                letterSpacing: 1.4, textTransform: "uppercase",
              }}>
                Precio histórico
              </span>
              <span style={{
                fontSize: 10, fontWeight: 700, color: txtSub,
                fontVariantNumeric: "tabular-nums",
              }}>
                {series.length} pts
              </span>
            </div>
            <PriceChart data={series} isDark={isDark} height={isDesktop ? 280 : 220} />
          </div>

          {/* ── MÉTRICAS ────────────────────────────────────────────── */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: 10,
          }}>
            <Metric isDark={isDark} icon={Layers}    label="Supply"     value={fmtCompact(profile.supply)} suffix="TKN" />
            <Metric isDark={isDark} icon={BarChart2} label="Volumen 24h" value={fmtCompact(profile.volume_24h)} suffix="WLD" />
            <Metric isDark={isDark} icon={Users}     label="Holders"    value="—" hint="próximamente" />
            <Metric isDark={isDark} icon={Activity}  label="Market Cap" value={fmtCompact(marketCap)} suffix="WLD" />
          </div>

          {/* ── TABS SECUNDARIOS ────────────────────────────────────── */}
          <div style={{
            background: cardBg,
            border: `1px solid ${cardBorder}`,
            borderRadius: 24,
            padding: 4,
            boxShadow: isDark
              ? "0 4px 14px rgba(0,0,0,0.30), inset 0 1px 0 rgba(255,255,255,0.04)"
              : "0 2px 10px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.80)",
          }}>
            {/* Tabs header */}
            <div style={{
              display: "flex", gap: 4, padding: 4,
              borderBottom: `1px solid ${cardBorder}`,
            }}>
              <SubTabBtn active={subTab === "trades"}  onClick={() => setSubTab("trades")}  isDark={isDark} icon={History} label="Trades" />
              <SubTabBtn active={subTab === "holders"} onClick={() => setSubTab("holders")} isDark={isDark} icon={Users}   label="Holders" />
              <SubTabBtn active={subTab === "score"}   onClick={() => setSubTab("score")}   isDark={isDark} icon={Activity}label="Score" />
            </div>
            {/* Contenido */}
            <div style={{
              minHeight: 140, padding: "26px 18px",
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              textAlign: "center",
            }}>
              <div style={{
                width: 38, height: 38, borderRadius: 12,
                background: "linear-gradient(160deg, #2c2c2c 0%, #1a1a1a 45%, #0f0f0f 100%)",
                border: "1px solid rgba(255,255,255,0.08)",
                display: "flex", alignItems: "center", justifyContent: "center",
                marginBottom: 10,
                boxShadow: "0 4px 14px rgba(0,0,0,0.40), inset 0 1px 0 rgba(255,255,255,0.10)",
              }}>
                {subTab === "trades"  && <History  size={16} color="#fff" strokeWidth={2.4} />}
                {subTab === "holders" && <Users    size={16} color="#fff" strokeWidth={2.4} />}
                {subTab === "score"   && <Activity size={16} color="#fff" strokeWidth={2.4} />}
              </div>
              <div style={{ fontSize: 13, fontWeight: 800, color: txt, marginBottom: 3, letterSpacing: -0.2 }}>
                {subTab === "trades" ? "Feed de trades en vivo"
               : subTab === "holders" ? "Distribución de holders"
               :                        "Evolución del score"}
              </div>
              <div style={{ fontSize: 11, color: txtSub, lineHeight: 1.5, maxWidth: 260 }}>
                Próximamente — esta sección se conecta a un endpoint dedicado.
              </div>
            </div>
          </div>

        </div>

        {/* === COLUMNA DERECHA: TradePanel === */}
        <div style={{
          position: isDesktop ? "sticky" : "static",
          top: isDesktop ? 14 : "auto",
        }}>
          <TradePanel
            totemAddress={profile.address}
            totemName={profile.name}
            userId={userId}
            isDark={isDark}
            walletAddress={walletAddress}
            userBalanceWld={userBalanceWld}
            onTradeSuccess={onTradeSuccess}
          />
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  SUBCOMPONENTES
// ════════════════════════════════════════════════════════════════════════════
function Metric({
  isDark, icon: Icon, label, value, suffix, hint,
}: {
  isDark: boolean; icon: React.ComponentType<{ size?: number; strokeWidth?: number; color?: string }>;
  label: string; value: string; suffix?: string; hint?: string;
}) {
  const cardBg     = isDark ? "#111113" : "#ffffff";
  const cardBorder = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
  const txt        = isDark ? "#ffffff" : "#111827";
  const txtSub     = isDark ? "rgba(255,255,255,0.50)" : "rgba(0,0,0,0.50)";
  const txtMuted   = isDark ? "rgba(255,255,255,0.30)" : "rgba(0,0,0,0.40)";

  return (
    <div style={{
      background: cardBg,
      border: `1px solid ${cardBorder}`,
      borderRadius: 18,
      padding: "11px 13px",
      boxShadow: isDark
        ? "0 4px 14px rgba(0,0,0,0.30), inset 0 1px 0 rgba(255,255,255,0.04)"
        : "0 2px 10px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.80)",
    }}>
      <div style={{
        display: "inline-flex", alignItems: "center", gap: 5,
        fontSize: 10, fontWeight: 700, color: txtSub,
        letterSpacing: 0.6, textTransform: "uppercase", marginBottom: 4,
      }}>
        <Icon size={11} strokeWidth={2.4} color={txtSub} />
        {label}
      </div>
      <div style={{
        fontSize: 17, fontWeight: 900, color: txt,
        letterSpacing: -0.4, lineHeight: 1.1,
        fontVariantNumeric: "tabular-nums",
      }}>
        {value}{suffix && <span style={{ fontSize: 9.5, fontWeight: 700, color: txtMuted, marginLeft: 4, letterSpacing: 1 }}>{suffix}</span>}
      </div>
      {hint && <div style={{ fontSize: 9.5, color: txtMuted, marginTop: 3, fontStyle: "italic" }}>{hint}</div>}
    </div>
  );
}

function SubTabBtn({
  active, onClick, isDark, icon: Icon, label,
}: {
  active: boolean; onClick: () => void; isDark: boolean;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; color?: string }>;
  label: string;
}) {
  const txtSub = isDark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.55)";
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1, padding: "9px 8px", borderRadius: 14,
        background: active
          ? "linear-gradient(135deg, #6366f1, #a855f7)"
          : "transparent",
        border: "none", cursor: "pointer",
        color: active ? "#fff" : txtSub,
        fontSize: 11.5, fontWeight: 800, letterSpacing: -0.1,
        display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5,
        boxShadow: active ? "0 4px 14px rgba(99,102,241,0.32), inset 0 1px 0 rgba(255,255,255,0.20)" : "none",
        transition: "all 220ms cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    >
      <Icon size={12} strokeWidth={2.6} color={active ? "#fff" : txtSub} />
      {label}
    </button>
  );
}

// ── Skeleton ─────────────────────────────────────────────────────────────
function DashboardSkeleton({ isDark, onBack }: { isDark: boolean; onBack: () => void }) {
  const sk = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)";
  const bg = isDark ? "#111113" : "#ffffff";
  const br = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
  return (
    <div style={{ paddingBottom: 32 }}>
      <style>{TD_KEYFRAMES}</style>
      <button onClick={onBack} style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        background: "transparent", border: "none",
        color: isDark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.55)",
        fontSize: 12, fontWeight: 700, padding: "6px 8px 6px 0", marginBottom: 10, cursor: "pointer",
      }}>
        <ArrowLeft size={14} strokeWidth={2.6} /> Mercado
      </button>
      {[180, 280, 110, 200].map((h, i) => (
        <div key={i} style={{
          background: bg, border: `1px solid ${br}`, borderRadius: 24,
          height: h, marginBottom: 14, position: "relative", overflow: "hidden",
        }}>
          <div style={{
            position: "absolute", inset: 0,
            background: `linear-gradient(90deg, transparent, ${sk}, transparent)`,
            animation: "tdShimmer 1.4s ease-in-out infinite",
          }} />
        </div>
      ))}
    </div>
  );
}

// ── Error ────────────────────────────────────────────────────────────────
function DashboardError({
  isDark, onRetry, onBack,
}: { isDark: boolean; onRetry: () => void; onBack: () => void }) {
  const txt    = isDark ? "#fff" : "#111827";
  const txtSub = isDark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.55)";
  return (
    <div style={{ paddingBottom: 32 }}>
      <button onClick={onBack} style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        background: "transparent", border: "none", color: txtSub,
        fontSize: 12, fontWeight: 700, padding: "6px 8px 6px 0", marginBottom: 10, cursor: "pointer",
      }}>
        <ArrowLeft size={14} strokeWidth={2.6} /> Mercado
      </button>
      <div role="alert" style={{
        minHeight: "44vh",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        textAlign: "center", padding: "32px 20px",
      }}>
        <div style={{ position: "relative", width: 96, height: 96, marginBottom: 22 }}>
          <div style={{
            position: "absolute", inset: -16, borderRadius: "50%",
            background: "radial-gradient(circle, rgba(248,113,113,0.26), transparent 65%)",
            filter: "blur(18px)",
          }} />
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            borderRadius: 24,
            background: "linear-gradient(135deg, #7f1d1d, #450a0a)",
            border: "1px solid rgba(248,113,113,0.30)",
            boxShadow: "0 12px 40px rgba(127,29,29,0.45), inset 0 1px 0 rgba(255,255,255,0.18)",
          }}>
            <AlertTriangle size={34} color="#fff" strokeWidth={2.2} />
          </div>
        </div>
        <h3 style={{ fontSize: 18, fontWeight: 900, color: txt, letterSpacing: -0.4, marginBottom: 6 }}>
          No se pudo cargar el Totem
        </h3>
        <p style={{ fontSize: 13, color: txtSub, lineHeight: 1.55, maxWidth: 280, marginBottom: 18 }}>
          Hubo un problema al conectar con el servidor. Intenta nuevamente.
        </p>
        <button onClick={onRetry} style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "11px 20px", borderRadius: 14,
          background: "linear-gradient(135deg, #6366f1, #a855f7)",
          border: "1px solid rgba(255,255,255,0.18)",
          color: "#fff", fontSize: 13, fontWeight: 800, cursor: "pointer",
          boxShadow: "0 4px 20px rgba(99,102,241,0.40), inset 0 1px 0 rgba(255,255,255,0.22)",
        }}>
          <RotateCw size={14} strokeWidth={2.6} /> Reintentar
        </button>
      </div>
    </div>
  );
}

// ── Keyframes ────────────────────────────────────────────────────────────
const TD_KEYFRAMES = `
  @keyframes tdShimmer {
    0%   { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }
`;
