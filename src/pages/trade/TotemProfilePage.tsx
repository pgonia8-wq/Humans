/**
 * TotemProfilePage.tsx — Bloomberg-style FULLSCREEN para un Totem
 *
 *  Filosofía: terminal de trading. Sin ornamentos. Los datos protagonizan.
 *  Layout:
 *   ┌─────────────────────────────────────────────────────────────┐
 *   │ ◄  TICKER  · 0x12…ab     ★ 🔔   ● STABLE                    │
 *   │ 0.0001234 WLD       ↑ 4.21% (24h)                           │
 *   │ MCap  Supply  Holders  Vol24h  Score  Lvl                   │
 *   ├─────────────────────────────────────────────────────────────┤
 *   │ 1H  24H  7D  ALL                              ◀ live ▶      │
 *   │ ┌─────────────── PRICE CHART ──────────────────────────┐    │
 *   │ │                                                      │    │
 *   │ └──────────────────────────────────────────────────────┘    │
 *   ├─────────────────────────────────────────────────────────────┤
 *   │ [ Activity ] [ Holders ] [ Stats ]                          │
 *   │ ── tabla de trades / holders / stats ──                     │
 *   ├─────────────────────────────────────────────────────────────┤
 *   │ ▼ STICKY ▼  [ COMPRAR ]   [ VENDER ]                        │
 *   └─────────────────────────────────────────────────────────────┘
 *
 *  Datos REALES:
 *   - profile (price, supply, score, vol24h, level, badge)
 *   - history (PriceChart + cambio % 24h derivado)
 *   - trades (timeline real desde tabla `trades`)
 *   - holders (derivados del aggregate de trades)
 *   - market cap = price × supply
 *   - polling cada 15s
 *  Local-only:
 *   - watchlist (star)
 *   - price alerts (bell)
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft, Star, Bell, BellRing, RefreshCw, Activity, Users, BarChart3,
  TrendingUp, TrendingDown, X, Plus,
} from "lucide-react";
import {
  getTotemProfile, getTotemHistory, getTotemTrades, getTotemHolders,
  type TotemProfile, type TotemHistory, type TotemTrade, type TotemHoldersResult,
} from "../../lib/tradeApi";
import PriceChart from "./components/PriceChart";
import BuySellFullscreen from "./components/BuySellFullscreen";
import {
  isWatched, toggleWatch, subscribeWatchlist,
} from "../../lib/watchlist";
import {
  addAlert, getAlertsFor, removeAlert, checkAlerts, subscribePriceAlerts,
  type PriceAlert,
} from "../../lib/priceAlerts";

// ── Props (mantenidas; nuevas opcionales) ───────────────────────────────────
interface Props {
  address:        string;
  userId:         string;
  isDark:         boolean;
  walletAddress?: string | null;
  onBack:         () => void;

  /** Si está disponible, gate Orb: canTrade=false → CTA pide verificación */
  canTrade?:      boolean;
  onRequestVerify?: () => void;
}

const BADGES: Record<string, string> = {
  Newcomer: "🌱", Builder: "🔨", Warrior: "⚔️", Champion: "🏆", Legend: "👑",
};

type Timeframe = "1H" | "24H" | "7D" | "ALL";
type SubTab    = "activity" | "holders" | "stats";

const POLL_MS = 15_000;

// ── Helpers de formato ──────────────────────────────────────────────────────
function fmtPrice(p: number): string {
  if (!isFinite(p) || p === 0) return "0.0000";
  if (p >= 1)      return p.toFixed(4);
  if (p >= 0.0001) return p.toFixed(6);
  return p.toExponential(3);
}
function fmtCompact(n: number): string {
  if (!isFinite(n)) return "0";
  const a = Math.abs(n);
  if (a >= 1e9) return (n / 1e9).toFixed(2) + "B";
  if (a >= 1e6) return (n / 1e6).toFixed(2) + "M";
  if (a >= 1e3) return (n / 1e3).toFixed(2) + "K";
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}
function shortAddr(a?: string | null): string {
  if (!a) return "—";
  if (a.length < 11) return a;
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}
function ago(iso: string): string {
  const t = new Date(iso).getTime();
  if (!isFinite(t)) return "—";
  const s = Math.max(1, Math.floor((Date.now() - t) / 1000));
  if (s < 60)        return `${s}s`;
  if (s < 3600)      return `${Math.floor(s / 60)}m`;
  if (s < 86400)     return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

// ════════════════════════════════════════════════════════════════════════════
//  COMPONENTE
// ════════════════════════════════════════════════════════════════════════════
export default function TotemProfilePage({
  address, userId, isDark, walletAddress, onBack,
  canTrade, onRequestVerify,
}: Props) {
  const [totem,    setTotem]    = useState<TotemProfile | null>(null);
  const [history,  setHistory]  = useState<TotemHistory[]>([]);
  const [trades,   setTrades]   = useState<TotemTrade[]>([]);
  const [holders,  setHolders]  = useState<TotemHoldersResult | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);

  const [tf,         setTf]         = useState<Timeframe>("24H");
  const [subTab,     setSubTab]     = useState<SubTab>("activity");
  const [tradeOpen,  setTradeOpen]  = useState<null | "buy" | "sell">(null);
  const [showAlertEditor, setShowAlertEditor] = useState(false);

  const [starred,  setStarred]  = useState<boolean>(() => isWatched(address));
  const [alerts,   setAlerts]   = useState<PriceAlert[]>(() => getAlertsFor(address));

  // Toast ligero para alertas disparadas / acciones locales
  const [toast, setToast] = useState<{ key: number; text: string; kind: "ok" | "warn" } | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const showToast = useCallback((text: string, kind: "ok" | "warn" = "ok") => {
    setToast({ key: Date.now(), text, kind });
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 3200);
  }, []);

  // ── Data fetch (carga inicial + polling) ──────────────────────────────
  // requestSeq descarta respuestas obsoletas si una petición posterior
  // termina antes (race condition en redes inestables).
  const requestSeqRef = useRef(0);
  const mountedRef    = useRef(true);
  const lastPriceRef  = useRef<number | null>(null);

  const loadAll = useCallback(async (silent = false) => {
    const mySeq = ++requestSeqRef.current;
    if (!silent) setLoading(true);
    try {
      const [p, h, tr, ho] = await Promise.all([
        getTotemProfile(address, userId).catch((e) => { throw e; }),
        getTotemHistory(address, 200).catch(() => []),
        getTotemTrades(address, 50).catch(() => []),
        getTotemHolders(address, 20).catch(() => null),
      ]);

      // Si llegó una respuesta más nueva mientras esperábamos, descartamos.
      if (!mountedRef.current || mySeq !== requestSeqRef.current) return;

      setTotem(p);
      setHistory(h);
      setTrades(tr);
      setHolders(ho);
      setError(null);

      // Alertas: comprueba si el precio actual cruzó algún umbral
      const fired = checkAlerts(address, p.price);
      if (fired.length > 0) {
        const a = fired[0];
        showToast(
          `Alerta: ${p.name ?? "Totem"} ${a.side === "above" ? "subió a" : "bajó a"} ${fmtPrice(p.price)} WLD (objetivo ${fmtPrice(a.target)})`,
          "ok",
        );
        setAlerts(getAlertsFor(address));
      }
      lastPriceRef.current = p.price;
    } catch (e: any) {
      if (!mountedRef.current || mySeq !== requestSeqRef.current) return;
      setError(e?.message ?? "No se pudo cargar el Totem");
    } finally {
      if (mountedRef.current && mySeq === requestSeqRef.current && !silent) {
        setLoading(false);
      }
    }
  }, [address, userId, showToast]);

  useEffect(() => { loadAll(false); }, [loadAll]);
  useEffect(() => {
    const id = window.setInterval(() => loadAll(true), POLL_MS);
    return () => window.clearInterval(id);
  }, [loadAll]);

  // Mounted flag + cleanup completo en unmount (intervalos, toast timer)
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
        toastTimerRef.current = null;
      }
    };
  }, []);

  // Sync watchlist + alerts si se modifican desde otro lado
  useEffect(() => {
    return subscribeWatchlist(() => setStarred(isWatched(address)));
  }, [address]);
  useEffect(() => {
    return subscribePriceAlerts(() => setAlerts(getAlertsFor(address)));
  }, [address]);

  // ── Derived ───────────────────────────────────────────────────────────
  const series = useMemo(() => {
    // history viene como rows {timestamp, price, ...}; lo ordenamos ASC
    const sorted = [...history].sort((a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    const now = Date.now();
    const cutoff = tf === "1H"  ? now - 3600_000
                 : tf === "24H" ? now - 86_400_000
                 : tf === "7D"  ? now - 7 * 86_400_000
                 : 0;
    const filt = cutoff > 0 ? sorted.filter((p) => new Date(p.timestamp).getTime() >= cutoff) : sorted;
    return filt.map((p) => ({ time: p.timestamp, price: Number(p.price ?? 0) }));
  }, [history, tf]);

  const change = useMemo(() => {
    // Cambio % vs precio hace 24h (o el más antiguo si no llegamos)
    if (history.length < 2 || !totem) return { pct: 0, abs: 0, up: true, hasData: false };
    const sorted = [...history].sort((a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    const cutoff = Date.now() - 86_400_000;
    let base = sorted[0];
    for (const p of sorted) {
      if (new Date(p.timestamp).getTime() <= cutoff) base = p;
      else break;
    }
    const basePrice = Number(base?.price ?? 0);
    if (basePrice <= 0) return { pct: 0, abs: 0, up: true, hasData: false };
    const abs = totem.price - basePrice;
    const pct = (abs / basePrice) * 100;
    return { pct, abs, up: pct >= 0, hasData: true };
  }, [history, totem]);

  const marketCap = useMemo(
    () => (totem ? totem.price * Number(totem.supply ?? 0) : 0),
    [totem]
  );

  // ── Tokens visuales ───────────────────────────────────────────────────
  const bg     = isDark ? "#0a0a0c" : "#fafafa";
  const surf   = isDark ? "#111113" : "#ffffff";
  const surf2  = isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)";
  const txt    = isDark ? "#ffffff" : "#0b0b0f";
  const txtSub = isDark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.55)";
  const txtMt  = isDark ? "rgba(255,255,255,0.32)" : "rgba(0,0,0,0.40)";
  const bdr    = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
  const bdrSt  = isDark ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.10)";
  const accUp  = "#22c55e";
  const accDn  = "#f87171";
  const acc    = "#a78bfa";

  // Estado de carga
  if (loading && !totem) {
    return (
      <FullscreenShell bg={bg} txt={txt}>
        <header style={headerStyle(isDark, bdr)}>
          <BackButton onClick={onBack} isDark={isDark} bdr={bdr} txt={txt} />
          <span style={{ color: txtSub, fontSize: 12, fontWeight: 700, letterSpacing: 0.4 }}>
            CARGANDO TOTEM…
          </span>
        </header>
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{
            width: 28, height: 28, borderRadius: "50%",
            border: "2px solid rgba(255,255,255,0.18)", borderTopColor: acc,
            animation: "tpfSpin 0.7s linear infinite",
          }} />
        </div>
        <style>{KEYFRAMES}</style>
      </FullscreenShell>
    );
  }

  if (error || !totem) {
    return (
      <FullscreenShell bg={bg} txt={txt}>
        <header style={headerStyle(isDark, bdr)}>
          <BackButton onClick={onBack} isDark={isDark} bdr={bdr} txt={txt} />
        </header>
        <div style={{
          flex: 1, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: 14, padding: 20,
        }}>
          <div style={{
            color: accDn, fontSize: 13, fontWeight: 700, textAlign: "center",
            maxWidth: 320, lineHeight: 1.4,
          }}>
            {error ?? "Totem no encontrado"}
          </div>
          <button onClick={() => loadAll(false)} style={primaryBtn(acc)}>
            <RefreshCw size={14} strokeWidth={2.6} /> Reintentar
          </button>
        </div>
        <style>{KEYFRAMES}</style>
      </FullscreenShell>
    );
  }

  const changeColor = change.up ? accUp : accDn;
  const ChangeIcon  = change.up ? TrendingUp : TrendingDown;

  return (
    <FullscreenShell bg={bg} txt={txt}>
      {/* ───────────────────────── HEADER STICKY ───────────────────────── */}
      <header style={headerStyle(isDark, bdr)}>
        <BackButton onClick={onBack} isDark={isDark} bdr={bdr} txt={txt} />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            fontSize: 9, fontWeight: 800, letterSpacing: 1.6,
            color: txtMt, textTransform: "uppercase",
          }}>
            <span>{BADGES[totem.badge] ?? "🌱"} {totem.badge}</span>
            <span style={{ opacity: 0.4 }}>·</span>
            <span>LVL {totem.level}</span>
            <span style={{ opacity: 0.4 }}>·</span>
            <span style={{ fontFamily: "ui-monospace, SFMono-Regular, monospace" }}>
              {shortAddr(totem.address)}
            </span>
          </div>
          <div style={{
            fontSize: 17, fontWeight: 900, letterSpacing: -0.4,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            marginTop: 1, color: txt,
          }}>
            {totem.name}
          </div>
        </div>

        {/* Toolbar acciones */}
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          <IconBtn
            onClick={() => { const n = toggleWatch(address); setStarred(n); showToast(n ? "Añadido a favoritos" : "Quitado de favoritos"); }}
            isDark={isDark} bdr={bdr} active={starred} activeColor="#fbbf24"
            aria-label="Favorito"
          >
            <Star size={15} strokeWidth={2.4} fill={starred ? "#fbbf24" : "none"} />
          </IconBtn>
          <IconBtn
            onClick={() => setShowAlertEditor(true)}
            isDark={isDark} bdr={bdr} active={alerts.length > 0} activeColor={acc}
            aria-label="Alertas de precio"
          >
            {alerts.some((a) => !a.triggered) ? <BellRing size={15} strokeWidth={2.4} /> : <Bell size={15} strokeWidth={2.4} />}
          </IconBtn>
          <IconBtn
            onClick={() => loadAll(true)}
            isDark={isDark} bdr={bdr}
            aria-label="Refrescar"
          >
            <RefreshCw size={15} strokeWidth={2.4} />
          </IconBtn>
        </div>
      </header>

      {/* ───────────────────────── BODY SCROLLABLE ─────────────────────── */}
      <div style={{
        flex: 1, overflowY: "auto",
        padding: "0 0 calc(env(safe-area-inset-bottom) + 96px)",
      }}>
        {/* HERO: Precio + cambio */}
        <section style={{ padding: "16px 16px 8px" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
            <div style={{
              fontSize: 40, fontWeight: 900, letterSpacing: -1.2,
              fontVariantNumeric: "tabular-nums", lineHeight: 1.0,
              color: txt,
            }}>
              {fmtPrice(totem.price)}
            </div>
            <div style={{
              fontSize: 11, fontWeight: 800, color: txtMt, letterSpacing: 1.4,
              textTransform: "uppercase",
            }}>
              WLD
            </div>
          </div>
          <div style={{
            marginTop: 6,
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "5px 10px", borderRadius: 10,
            background: change.up ? "rgba(34,197,94,0.10)" : "rgba(248,113,113,0.10)",
            border: `1px solid ${change.up ? "rgba(34,197,94,0.28)" : "rgba(248,113,113,0.28)"}`,
            color: changeColor,
            fontSize: 12, fontWeight: 800, letterSpacing: -0.1,
            fontVariantNumeric: "tabular-nums",
          }}>
            <ChangeIcon size={13} strokeWidth={2.6} />
            {change.hasData
              ? <>{change.up ? "+" : ""}{change.pct.toFixed(2)}% <span style={{ color: txtMt, fontWeight: 700, marginLeft: 4 }}>24h</span></>
              : <span style={{ color: txtMt, fontWeight: 700 }}>Sin datos 24h</span>}
          </div>
        </section>

        {/* STAT GRID */}
        <section style={{ padding: "12px 16px 0" }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
            gap: 8,
          }}>
            <Stat label="MARKET CAP" value={`${fmtCompact(marketCap)} WLD`}      txt={txt} sub={txtMt} bg={surf2} bdr={bdr} />
            <Stat label="SUPPLY"     value={fmtCompact(totem.supply)}            txt={txt} sub={txtMt} bg={surf2} bdr={bdr} />
            <Stat label="HOLDERS"    value={holders ? holders.total_holders.toLocaleString() : "—"} txt={txt} sub={txtMt} bg={surf2} bdr={bdr} />
            <Stat label="VOL 24H"    value={`${totem.volume_24h.toFixed(2)} WLD`} txt={txt} sub={txtMt} bg={surf2} bdr={bdr} />
            <Stat label="SCORE"      value={fmtCompact(totem.score)}             txt={txt} sub={txtMt} bg={surf2} bdr={bdr} />
            <Stat label="INFLUENCE"  value={fmtCompact(totem.influence)}         txt={txt} sub={txtMt} bg={surf2} bdr={bdr} />
          </div>
        </section>

        {/* CHART + TIMEFRAME */}
        <section style={{ padding: "16px 8px 0" }}>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "0 8px", marginBottom: 6,
          }}>
            <div style={{ display: "flex", gap: 4 }}>
              {(["1H", "24H", "7D", "ALL"] as Timeframe[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTf(t)}
                  style={{
                    padding: "5px 10px", borderRadius: 8,
                    background: tf === t
                      ? (isDark ? "rgba(168,139,250,0.16)" : "rgba(99,102,241,0.10)")
                      : "transparent",
                    border: `1px solid ${tf === t ? "rgba(168,139,250,0.40)" : "transparent"}`,
                    color: tf === t ? acc : txtSub,
                    fontSize: 10.5, fontWeight: 800, letterSpacing: 0.6,
                    cursor: "pointer", fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              fontSize: 9, fontWeight: 800, color: txtMt, letterSpacing: 1.2,
              textTransform: "uppercase",
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: "50%", background: accUp,
                boxShadow: `0 0 0 0 rgba(34,197,94,0.5)`,
                animation: "tpfPulse 1.6s ease-out infinite",
              }} />
              LIVE · 15s
            </div>
          </div>

          <div style={{
            background: surf, border: `1px solid ${bdr}`, borderRadius: 16,
            padding: "10px 6px 6px",
          }}>
            <PriceChart data={series} isDark={isDark} height={220} />
          </div>
        </section>

        {/* SUBTABS */}
        <section style={{ padding: "16px 16px 0" }}>
          <div style={{
            display: "flex", gap: 4, padding: 4,
            background: surf2, border: `1px solid ${bdr}`,
            borderRadius: 12,
          }}>
            <SubTabBtn label="Activity" Icon={Activity}  active={subTab === "activity"} onClick={() => setSubTab("activity")} acc={acc} txtSub={txtSub} />
            <SubTabBtn label="Holders"  Icon={Users}     active={subTab === "holders"}  onClick={() => setSubTab("holders")}  acc={acc} txtSub={txtSub} />
            <SubTabBtn label="Stats"    Icon={BarChart3} active={subTab === "stats"}    onClick={() => setSubTab("stats")}    acc={acc} txtSub={txtSub} />
          </div>

          <div style={{ marginTop: 12 }}>
            {subTab === "activity" && (
              <ActivityList trades={trades} isDark={isDark} txt={txt} txtSub={txtSub} txtMt={txtMt} bdr={bdr} surf={surf} accUp={accUp} accDn={accDn} />
            )}
            {subTab === "holders" && (
              <HoldersList holders={holders} isDark={isDark} txt={txt} txtSub={txtSub} txtMt={txtMt} bdr={bdr} surf={surf} acc={acc} />
            )}
            {subTab === "stats" && (
              <StatsBlock totem={totem} marketCap={marketCap} holders={holders} change={change} isDark={isDark} txt={txt} txtSub={txtSub} txtMt={txtMt} bdr={bdr} surf={surf} bdrSt={bdrSt} />
            )}
          </div>
        </section>
      </div>

      {/* ───────────────────────── STICKY BOTTOM CTA ───────────────────── */}
      <footer style={{
        position: "absolute", left: 0, right: 0, bottom: 0,
        padding: "12px 14px calc(env(safe-area-inset-bottom) + 12px)",
        background: isDark
          ? "linear-gradient(180deg, rgba(10,10,12,0.0) 0%, rgba(10,10,12,0.92) 32%)"
          : "linear-gradient(180deg, rgba(255,255,255,0.0) 0%, rgba(255,255,255,0.92) 32%)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
      }}>
        {walletAddress ? (
          canTrade !== false ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <BigCta
                kind="buy" onClick={() => setTradeOpen("buy")}
              />
              <BigCta
                kind="sell" onClick={() => setTradeOpen("sell")}
              />
            </div>
          ) : (
            <button
              onClick={() => onRequestVerify?.()}
              style={{
                width: "100%", padding: "16px 0", borderRadius: 16, border: "none",
                cursor: "pointer", color: "#fff", fontWeight: 900, fontSize: 14,
                letterSpacing: -0.2,
                background: "linear-gradient(135deg, #6366f1, #a855f7)",
                boxShadow: "0 10px 30px rgba(99,102,241,0.35), inset 0 1px 0 rgba(255,255,255,0.22)",
              }}
            >
              Verifícate con Orb para operar
            </button>
          )
        ) : (
          <div style={{
            textAlign: "center", padding: "14px 12px",
            background: surf2, border: `1px solid ${bdr}`, borderRadius: 14,
            color: txtSub, fontSize: 12, fontWeight: 700,
          }}>
            Conecta tu wallet World App para operar
          </div>
        )}
      </footer>

      {/* ───────────────────────── FLOWS OVERLAY ───────────────────────── */}
      {tradeOpen && walletAddress && (
        <BuySellFullscreen
          isDark={isDark}
          totemAddress={totem.address}
          totemName={totem.name}
          totemPrice={totem.price}
          userId={userId}
          walletAddress={walletAddress}
          canTrade={canTrade !== false}
          onRequestVerify={onRequestVerify}
          onClose={() => setTradeOpen(null)}
          onTradeSuccess={(_, newPrice, newSupply) => {
            setTotem((p) => p ? { ...p, price: newPrice, supply: newSupply } : p);
            // refresca activity y holders en background
            loadAll(true);
          }}
          initialSide={tradeOpen}
        />
      )}

      {showAlertEditor && (
        <AlertEditor
          address={address}
          totemName={totem.name}
          currentPrice={totem.price}
          alerts={alerts}
          isDark={isDark}
          onClose={() => setShowAlertEditor(false)}
          onChanged={() => setAlerts(getAlertsFor(address))}
          onToast={showToast}
        />
      )}

      {/* ───────────────────────── TOAST ───────────────────────── */}
      {toast && (
        <div
          key={toast.key}
          style={{
            position: "absolute", left: 16, right: 16,
            bottom: "calc(env(safe-area-inset-bottom) + 110px)",
            background: toast.kind === "ok" ? "rgba(20,40,28,0.96)" : "rgba(40,32,16,0.96)",
            border: `1px solid ${toast.kind === "ok" ? "rgba(34,197,94,0.32)" : "rgba(251,191,36,0.32)"}`,
            backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)",
            borderRadius: 14, padding: "10px 14px",
            color: "#fff", fontSize: 12, fontWeight: 700, lineHeight: 1.4,
            boxShadow: "0 12px 40px rgba(0,0,0,0.55)",
            animation: "tpfToast 220ms cubic-bezier(0.4, 0, 0.2, 1) both",
            zIndex: 100,
          }}
        >
          {toast.text}
        </div>
      )}

      <style>{KEYFRAMES}</style>
    </FullscreenShell>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  SUB-COMPONENTES
// ════════════════════════════════════════════════════════════════════════════

function FullscreenShell({ bg, txt, children }: { bg: string; txt: string; children: React.ReactNode }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9000,
      background: bg, color: txt,
      display: "flex", flexDirection: "column",
      animation: "tpfIn 220ms cubic-bezier(0.4, 0, 0.2, 1) both",
    }}>
      {children}
    </div>
  );
}

function headerStyle(isDark: boolean, bdr: string): React.CSSProperties {
  return {
    flexShrink: 0,
    padding: "calc(env(safe-area-inset-top) + 10px) 14px 10px",
    borderBottom: `1px solid ${bdr}`,
    background: isDark ? "rgba(10,10,12,0.85)" : "rgba(255,255,255,0.85)",
    backdropFilter: "blur(14px) saturate(160%)",
    WebkitBackdropFilter: "blur(14px) saturate(160%)",
    display: "flex", alignItems: "center", gap: 10,
    position: "sticky", top: 0, zIndex: 5,
  };
}

function BackButton({ onClick, isDark, bdr, txt }: { onClick: () => void; isDark: boolean; bdr: string; txt: string }) {
  return (
    <button
      onClick={onClick} aria-label="Volver"
      style={{
        width: 38, height: 38, borderRadius: 12, flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
        border: `1px solid ${bdr}`, color: txt, cursor: "pointer",
      }}
    >
      <ArrowLeft size={16} strokeWidth={2.6} />
    </button>
  );
}

function IconBtn({
  onClick, isDark, bdr, active, activeColor, children, ...rest
}: {
  onClick: () => void; isDark: boolean; bdr: string;
  active?: boolean; activeColor?: string; children: React.ReactNode;
} & React.AriaAttributes) {
  return (
    <button
      onClick={onClick}
      {...rest}
      style={{
        width: 36, height: 36, borderRadius: 12,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: active
          ? (isDark ? "rgba(168,139,250,0.16)" : "rgba(99,102,241,0.10)")
          : (isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)"),
        border: `1px solid ${active && activeColor ? activeColor + "55" : bdr}`,
        color: active && activeColor ? activeColor : (isDark ? "#fff" : "#0b0b0f"),
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

function Stat({
  label, value, txt, sub, bg, bdr,
}: { label: string; value: string; txt: string; sub: string; bg: string; bdr: string }) {
  return (
    <div style={{
      background: bg, border: `1px solid ${bdr}`, borderRadius: 12,
      padding: "8px 10px", minWidth: 0,
    }}>
      <div style={{
        fontSize: 8.5, fontWeight: 800, color: sub, letterSpacing: 1.2,
        textTransform: "uppercase",
      }}>
        {label}
      </div>
      <div style={{
        fontSize: 13, fontWeight: 900, color: txt, letterSpacing: -0.2,
        marginTop: 2, fontVariantNumeric: "tabular-nums",
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      }}>
        {value}
      </div>
    </div>
  );
}

function SubTabBtn({
  label, Icon, active, onClick, acc, txtSub,
}: { label: string; Icon: any; active: boolean; onClick: () => void; acc: string; txtSub: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1, padding: "9px 0", borderRadius: 9,
        background: active ? "rgba(168,139,250,0.16)" : "transparent",
        border: active ? "1px solid rgba(168,139,250,0.40)" : "1px solid transparent",
        color: active ? acc : txtSub,
        cursor: "pointer", fontSize: 11.5, fontWeight: 800, letterSpacing: 0.2,
        display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
      }}
    >
      <Icon size={13} strokeWidth={2.6} /> {label}
    </button>
  );
}

function BigCta({ kind, onClick }: { kind: "buy" | "sell"; onClick: () => void }) {
  const isBuy = kind === "buy";
  return (
    <button
      onClick={onClick}
      style={{
        padding: "16px 0", borderRadius: 16, border: "none",
        cursor: "pointer", color: "#fff",
        fontSize: 15, fontWeight: 900, letterSpacing: -0.3,
        background: isBuy
          ? "linear-gradient(135deg, #16a34a, #22c55e)"
          : "linear-gradient(135deg, #dc2626, #f87171)",
        boxShadow: isBuy
          ? "0 10px 28px rgba(34,197,94,0.40), inset 0 1px 0 rgba(255,255,255,0.22)"
          : "0 10px 28px rgba(248,113,113,0.40), inset 0 1px 0 rgba(255,255,255,0.22)",
      }}
    >
      {isBuy ? "COMPRAR" : "VENDER"}
    </button>
  );
}

function primaryBtn(acc: string): React.CSSProperties {
  return {
    padding: "10px 16px", borderRadius: 12, border: "none",
    background: `linear-gradient(135deg, #6366f1, ${acc})`,
    color: "#fff", fontWeight: 800, fontSize: 12, letterSpacing: 0.2,
    cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6,
  };
}

// ── Activity (trades) ───────────────────────────────────────────────────────
function ActivityList({
  trades, isDark, txt, txtSub, txtMt, bdr, surf, accUp, accDn,
}: {
  trades: TotemTrade[]; isDark: boolean;
  txt: string; txtSub: string; txtMt: string; bdr: string; surf: string;
  accUp: string; accDn: string;
}) {
  if (trades.length === 0) {
    return <Empty txt={txtSub} label="Sin trades aún" />;
  }
  return (
    <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 14, overflow: "hidden" }}>
      {/* Cabecera */}
      <div style={{
        display: "grid", gridTemplateColumns: "60px 1fr 1fr 60px",
        padding: "10px 12px", gap: 8,
        fontSize: 9, fontWeight: 800, color: txtMt, letterSpacing: 1.2,
        textTransform: "uppercase",
        borderBottom: `1px solid ${bdr}`,
      }}>
        <span>TYPE</span>
        <span style={{ textAlign: "right" }}>WLD</span>
        <span style={{ textAlign: "right" }}>TOKENS</span>
        <span style={{ textAlign: "right" }}>HACE</span>
      </div>
      <div>
        {trades.map((t) => (
          <div key={t.id} style={{
            display: "grid", gridTemplateColumns: "60px 1fr 1fr 60px",
            padding: "10px 12px", gap: 8,
            borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"}`,
            alignItems: "center",
          }}>
            <span style={{
              fontSize: 10, fontWeight: 900, letterSpacing: 0.6,
              color: t.type === "buy" ? accUp : accDn,
              textTransform: "uppercase",
            }}>
              {t.type === "buy" ? "BUY" : "SELL"}
            </span>
            <span style={{
              textAlign: "right", fontSize: 12, fontWeight: 800, color: txt,
              fontVariantNumeric: "tabular-nums", letterSpacing: -0.1,
            }}>
              {t.amount.toFixed(4)}
            </span>
            <span style={{
              textAlign: "right", fontSize: 12, fontWeight: 700, color: txtSub,
              fontVariantNumeric: "tabular-nums", letterSpacing: -0.1,
            }}>
              {fmtCompact(t.tokens)}
            </span>
            <span style={{
              textAlign: "right", fontSize: 11, fontWeight: 700, color: txtMt,
              fontVariantNumeric: "tabular-nums",
            }}>
              {ago(t.timestamp)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Holders ─────────────────────────────────────────────────────────────────
function HoldersList({
  holders, isDark, txt, txtSub, txtMt, bdr, surf, acc,
}: {
  holders: TotemHoldersResult | null; isDark: boolean;
  txt: string; txtSub: string; txtMt: string; bdr: string; surf: string; acc: string;
}) {
  if (!holders || holders.holders.length === 0) {
    return <Empty txt={txtSub} label="Sin holders todavía" />;
  }
  return (
    <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 14, overflow: "hidden" }}>
      <div style={{
        display: "grid", gridTemplateColumns: "30px 1fr 90px 60px",
        padding: "10px 12px", gap: 8,
        fontSize: 9, fontWeight: 800, color: txtMt, letterSpacing: 1.2,
        textTransform: "uppercase",
        borderBottom: `1px solid ${bdr}`,
      }}>
        <span>#</span>
        <span>WALLET</span>
        <span style={{ textAlign: "right" }}>TOKENS</span>
        <span style={{ textAlign: "right" }}>%</span>
      </div>
      <div>
        {holders.holders.map((h, i) => (
          <div key={h.user_id} style={{
            display: "grid", gridTemplateColumns: "30px 1fr 90px 60px",
            padding: "10px 12px", gap: 8, alignItems: "center",
            borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"}`,
          }}>
            <span style={{
              fontSize: 11, fontWeight: 800, color: i < 3 ? acc : txtMt,
              fontVariantNumeric: "tabular-nums",
            }}>
              {i + 1}
            </span>
            <span style={{
              fontSize: 11.5, fontWeight: 700, color: txt,
              fontFamily: "ui-monospace, SFMono-Regular, monospace", letterSpacing: 0.1,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {shortAddr(h.user_id)}
            </span>
            <span style={{
              textAlign: "right", fontSize: 12, fontWeight: 800, color: txt,
              fontVariantNumeric: "tabular-nums",
            }}>
              {fmtCompact(h.tokens)}
            </span>
            <span style={{
              textAlign: "right", fontSize: 11.5, fontWeight: 800, color: acc,
              fontVariantNumeric: "tabular-nums",
            }}>
              {h.share_pct.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Stats ──────────────────────────────────────────────────────────────────
function StatsBlock({
  totem, marketCap, holders, change, isDark, txt, txtSub, txtMt, bdr, surf, bdrSt,
}: {
  totem: TotemProfile; marketCap: number; holders: TotemHoldersResult | null;
  change: { pct: number; abs: number; up: boolean; hasData: boolean };
  isDark: boolean; txt: string; txtSub: string; txtMt: string;
  bdr: string; surf: string; bdrSt: string;
}) {
  const rows: Array<[string, string]> = [
    ["Precio actual",      `${fmtPrice(totem.price)} WLD`],
    ["Cambio 24h",         change.hasData ? `${change.up ? "+" : ""}${change.pct.toFixed(2)}% (${change.abs >= 0 ? "+" : ""}${change.abs.toFixed(8)})` : "—"],
    ["Market Cap",         `${fmtCompact(marketCap)} WLD`],
    ["Supply total",       totem.supply.toLocaleString()],
    ["Volumen 24h",        `${totem.volume_24h.toFixed(2)} WLD`],
    ["Holders",            holders ? holders.total_holders.toLocaleString() : "—"],
    ["Score",              totem.score.toLocaleString()],
    ["Influencia",         totem.influence.toLocaleString()],
    ["Nivel · Badge",      `${totem.level} · ${totem.badge}`],
    ["Address",            shortAddr(totem.address)],
    ["Owner",              shortAddr(totem.owner_id ?? null)],
    ["Creado",             new Date(totem.created_at).toLocaleString("es-ES")],
  ];
  return (
    <div style={{
      background: surf, border: `1px solid ${bdr}`, borderRadius: 14,
      overflow: "hidden",
    }}>
      {rows.map(([k, v], i) => (
        <div key={k} style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "11px 14px",
          borderBottom: i < rows.length - 1 ? `1px solid ${isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"}` : "none",
        }}>
          <span style={{ fontSize: 11, color: txtSub, fontWeight: 700 }}>{k}</span>
          <span style={{
            fontSize: 12, color: txt, fontWeight: 800, letterSpacing: -0.1,
            fontVariantNumeric: "tabular-nums",
            maxWidth: "60%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>{v}</span>
        </div>
      ))}
    </div>
  );
}

function Empty({ txt, label }: { txt: string; label: string }) {
  return (
    <div style={{
      padding: "32px 16px", textAlign: "center",
      color: txt, fontSize: 12, fontWeight: 600, letterSpacing: 0.2,
    }}>
      {label}
    </div>
  );
}

// ── Editor de alertas (overlay ligero) ─────────────────────────────────────
function AlertEditor({
  address, totemName, currentPrice, alerts, isDark, onClose, onChanged, onToast,
}: {
  address: string; totemName: string; currentPrice: number; alerts: PriceAlert[];
  isDark: boolean;
  onClose: () => void;
  onChanged: () => void;
  onToast: (t: string, k?: "ok" | "warn") => void;
}) {
  const [side,   setSide]   = useState<"above" | "below">("above");
  const [target, setTarget] = useState<string>(currentPrice ? currentPrice.toFixed(6) : "");

  const txt    = isDark ? "#fff" : "#0b0b0f";
  const txtSub = isDark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.55)";
  const txtMt  = isDark ? "rgba(255,255,255,0.32)" : "rgba(0,0,0,0.40)";
  const bdr    = isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.10)";
  const surf   = isDark ? "#111113" : "#ffffff";
  const bg     = isDark ? "rgba(0,0,0,0.78)" : "rgba(0,0,0,0.45)";

  function handleAdd() {
    const num = Number(target);
    if (!isFinite(num) || num <= 0) {
      onToast("Introduce un precio objetivo válido", "warn");
      return;
    }
    addAlert(address, side, num);
    onChanged();
    onToast(`Alerta creada: ${side === "above" ? "subir a" : "bajar a"} ${fmtPrice(num)} WLD`);
    setTarget("");
  }

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 12000,
        background: bg, backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)",
        display: "flex", alignItems: "flex-end", justifyContent: "center",
        padding: 12,
        animation: "tpfIn 200ms ease-out both",
      }}
    >
      <div style={{
        width: "100%", maxWidth: 480,
        background: surf, color: txt, border: `1px solid ${bdr}`,
        borderRadius: 22, padding: 16,
        animation: "tpfSlideUp 280ms cubic-bezier(0.34, 1.56, 0.64, 1) both",
      }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 1.4, color: txtMt, textTransform: "uppercase" }}>
              ALERTAS DE PRECIO
            </div>
            <div style={{ fontSize: 15, fontWeight: 900, letterSpacing: -0.3, marginTop: 1 }}>
              {totemName}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32, height: 32, borderRadius: 10,
              background: "rgba(255,255,255,0.06)", border: `1px solid ${bdr}`,
              color: txt, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <X size={14} strokeWidth={2.6} />
          </button>
        </div>

        {/* Form */}
        <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
          <button
            onClick={() => setSide("above")}
            style={{
              flex: 1, padding: "10px 0", borderRadius: 10,
              background: side === "above" ? "rgba(34,197,94,0.14)" : "rgba(255,255,255,0.04)",
              border: `1px solid ${side === "above" ? "rgba(34,197,94,0.40)" : bdr}`,
              color: side === "above" ? "#22c55e" : txtSub,
              fontSize: 11.5, fontWeight: 800, letterSpacing: 0.2, cursor: "pointer",
              display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}
          >
            <TrendingUp size={13} strokeWidth={2.6} /> Sube a
          </button>
          <button
            onClick={() => setSide("below")}
            style={{
              flex: 1, padding: "10px 0", borderRadius: 10,
              background: side === "below" ? "rgba(248,113,113,0.14)" : "rgba(255,255,255,0.04)",
              border: `1px solid ${side === "below" ? "rgba(248,113,113,0.40)" : bdr}`,
              color: side === "below" ? "#f87171" : txtSub,
              fontSize: 11.5, fontWeight: 800, letterSpacing: 0.2, cursor: "pointer",
              display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}
          >
            <TrendingDown size={13} strokeWidth={2.6} /> Baja a
          </button>
        </div>

        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          background: "rgba(255,255,255,0.04)", border: `1px solid ${bdr}`,
          borderRadius: 12, padding: "10px 12px", marginBottom: 8,
        }}>
          <input
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="0.000000"
            inputMode="decimal"
            style={{
              flex: 1, background: "transparent", border: "none", outline: "none",
              color: txt, fontSize: 17, fontWeight: 800, letterSpacing: -0.3,
              fontVariantNumeric: "tabular-nums",
            }}
          />
          <span style={{ fontSize: 10, fontWeight: 800, color: txtMt, letterSpacing: 1.2 }}>WLD</span>
        </div>

        <button
          onClick={handleAdd}
          style={{
            width: "100%", padding: "12px 0", borderRadius: 12, border: "none",
            background: "linear-gradient(135deg, #6366f1, #a855f7)",
            color: "#fff", fontSize: 13, fontWeight: 900, letterSpacing: -0.2,
            cursor: "pointer",
            boxShadow: "0 8px 24px rgba(99,102,241,0.35), inset 0 1px 0 rgba(255,255,255,0.22)",
            display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
          }}
        >
          <Plus size={14} strokeWidth={2.8} /> Crear alerta
        </button>

        {/* Alertas activas */}
        {alerts.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div style={{
              fontSize: 9, fontWeight: 800, color: txtMt, letterSpacing: 1.4,
              textTransform: "uppercase", marginBottom: 8,
            }}>
              ACTIVAS · {alerts.filter((a) => !a.triggered).length}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {alerts.map((a) => (
                <div key={a.id} style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "10px 12px", borderRadius: 10,
                  background: "rgba(255,255,255,0.04)", border: `1px solid ${bdr}`,
                  opacity: a.triggered ? 0.5 : 1,
                }}>
                  {a.side === "above"
                    ? <TrendingUp size={13} strokeWidth={2.6} color="#22c55e" />
                    : <TrendingDown size={13} strokeWidth={2.6} color="#f87171" />}
                  <span style={{
                    flex: 1, fontSize: 12, fontWeight: 700, color: txt,
                    letterSpacing: -0.1, fontVariantNumeric: "tabular-nums",
                  }}>
                    {a.side === "above" ? "≥" : "≤"} {fmtPrice(a.target)} WLD
                  </span>
                  {a.triggered && (
                    <span style={{
                      fontSize: 9, fontWeight: 800, color: txtMt, letterSpacing: 1,
                    }}>DISPARADA</span>
                  )}
                  <button
                    onClick={() => { removeAlert(a.id); onChanged(); }}
                    style={{
                      width: 26, height: 26, borderRadius: 8,
                      background: "rgba(248,113,113,0.10)",
                      border: "1px solid rgba(248,113,113,0.24)",
                      color: "#f87171", cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                  >
                    <X size={12} strokeWidth={2.8} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <p style={{
          marginTop: 12, fontSize: 10.5, color: txtMt, lineHeight: 1.5, textAlign: "center",
        }}>
          Las alertas se almacenan en este dispositivo. Suenan al cumplirse el umbral.
        </p>
      </div>
    </div>
  );
}

// ── Keyframes ───────────────────────────────────────────────────────────────
const KEYFRAMES = `
  @keyframes tpfIn  { from { opacity: 0; } to { opacity: 1; } }
  @keyframes tpfSlideUp {
    from { transform: translateY(110%); opacity: 0; }
    to   { transform: translateY(0);    opacity: 1; }
  }
  @keyframes tpfSpin { to { transform: rotate(360deg); } }
  @keyframes tpfPulse {
    0%   { box-shadow: 0 0 0 0 rgba(34,197,94,0.55); }
    70%  { box-shadow: 0 0 0 7px rgba(34,197,94,0);  }
    100% { box-shadow: 0 0 0 0 rgba(34,197,94,0);    }
  }
  @keyframes tpfToast {
    from { transform: translateY(8px); opacity: 0; }
    to   { transform: translateY(0);   opacity: 1; }
  }
`;
