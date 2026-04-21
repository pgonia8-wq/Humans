/**
 * TradeCenterPage — Trade Center premium FULL
 *
 *  Sistema visual: idéntico a HomePage / FeedPage
 *   - Surfaces oscuras: linear-gradient(160deg, #2c2c2c, #1a1a1a, #0f0f0f)
 *   - Brand CTA:        linear-gradient(135deg, #6366f1, #a855f7)
 *   - Cards:            #111113 + border white/[0.06] + rounded-3xl
 *   - Glass:            rgba(255,255,255,0.04) + blur(10px) + border white/[0.08]
 *
 *  Arquitectura:
 *   - Estado global: selectedTotem (Market default → click TotemCard → TotemDashboard)
 *   - Sin rutas nuevas. Todo dentro del modal.
 *   - Header dinámico: muestra precio/delta del totem seleccionado.
 *   - Botón Settings funcional → SettingsModal (modo DEV/PROD + sistema).
 *   - "Crear mi Totem" funcional → CreateTotemModal.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  X, Sparkles, Plus, ArrowRight, Store, Settings2,
  CheckCircle2, AlertCircle, AlertTriangle, Loader2, Activity, Server, Heart, Flame, ShieldAlert,
  RefreshCw, ShieldCheck, Eye,
} from "lucide-react";
import { useTheme } from "../../lib/ThemeContext";
import MarketPage from "./MarketPage";
import TotemDashboard from "./TotemDashboard";
import {
  createTotem, getStabilityStatus, getSystemMetrics,
  type TotemProfile, type SystemMetrics,
} from "../../lib/tradeApi";
// Estado de Orb proviene de App.tsx via prop (single source of truth).

// ── Tabs ────────────────────────────────────────────────────────────────────
type Tab = "totem" | "market";

interface Props {
  isOpen:        boolean;
  onClose:       () => void;
  userId:        string;
  walletAddress?: string | null;
  userBalanceWld?: number;
  /** Dispara el flujo MiniKit verify nivel Orb. Inyectado desde App vía HomePage. */
  verifyOrb?: () => Promise<{ success: boolean; proof?: any }>;
  /** Estado global de Orb desde App.tsx — single source of truth. */
  isOrbVerified: boolean;
  /** Sincroniza el estado global tras una verificación Orb exitosa. */
  onOrbVerifiedChange: (ok: boolean) => void;
}

const IS_PRODUCTION = !!import.meta.env.VITE_BONDING_CURVE_ADDRESS;

// Salud derivada del nº de warnings del sistema
type SysHealth = "stable" | "volatile" | "stress";
function deriveSysHealth(stab: { stable: boolean; warnings: string[] } | null): SysHealth {
  if (!stab) return "stable";
  if (!stab.stable && stab.warnings.length >= 2) return "stress";
  if (!stab.stable || stab.warnings.length > 0)  return "volatile";
  return "stable";
}
const HEALTH_PALETTE: Record<SysHealth, { color: string; bg: string; border: string; label: string; Icon: typeof Heart }> = {
  stable:   { color: "#22c55e", bg: "rgba(34,197,94,0.12)",  border: "rgba(34,197,94,0.32)",  label: "STABLE",   Icon: Heart },
  volatile: { color: "#fbbf24", bg: "rgba(251,191,36,0.12)", border: "rgba(251,191,36,0.32)", label: "VOLATILE", Icon: Flame },
  stress:   { color: "#f87171", bg: "rgba(248,113,113,0.12)",border: "rgba(248,113,113,0.32)",label: "STRESS",   Icon: ShieldAlert },
};

// ════════════════════════════════════════════════════════════════════════════
//  COMPONENTE
// ════════════════════════════════════════════════════════════════════════════
export default function TradeCenterPage({
  isOpen, onClose, userId, walletAddress, userBalanceWld, verifyOrb,
  isOrbVerified, onOrbVerifiedChange,
}: Props) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [tab,             setTab]             = useState<Tab>("market");
  const [selectedTotem,   setSelectedTotem]   = useState<TotemProfile | null>(null);
  // Ownership: SIEMPRE viene de backend (TotemProfile.isOwner), nunca de memoria.
  // El único caso de "modo explícito" es justo después de createTotem (path creator),
  // donde el response ya incluye isOwner=true del backend.
  const [showSettings,    setShowSettings]    = useState(false);
  const [showCreate,      setShowCreate]      = useState(false);
  const [creationSplash,  setCreationSplash]  = useState<TotemProfile | null>(null);

  // ── Gate Orb: solo cuentas Orb-verificadas pueden crear / operar ────────
  // Estado global desde App (props) → cero hooks duplicados, cero fetches
  // paralelos. Tras éxito notificamos a App para refrescar todo.
  const [orbGate, setOrbGate] = useState<null | "create" | "trade">(null);
  const requestVerify = useCallback((intent: "create" | "trade") => {
    setOrbGate(intent);
  }, []);
  const handleOrbSuccess = useCallback(() => {
    const wanted = orbGate;
    onOrbVerifiedChange(true);
    setOrbGate(null);
    if (wanted === "create") setShowCreate(true);
  }, [orbGate, onOrbVerifiedChange]);

  // Stability global del sistema — compartida entre header dot + MarketStatusBar
  const [systemStab, setSystemStab] = useState<{ stable: boolean; warnings: string[]; frozen: string[] } | null>(null);
  const [systemMet,  setSystemMet]  = useState<SystemMetrics | null>(null);

  const refreshSystem = useCallback(async () => {
    try {
      const [s, m] = await Promise.all([
        getStabilityStatus().catch(() => null),
        getSystemMetrics().catch(() => null),
      ]);
      setSystemStab(s);
      setSystemMet(m);
    } catch { /* silencioso */ }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    refreshSystem();
    const id = window.setInterval(refreshSystem, 60_000);
    return () => window.clearInterval(id);
  }, [isOpen, refreshSystem]);

  const sysHealth = deriveSysHealth(systemStab);

  // Bloquear scroll del body cuando overlay abierto
  useEffect(() => {
    if (!isOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = original; };
  }, [isOpen]);

  // Cerrar con Escape — prioriza modales internos antes del cierre global
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (showSettings) { setShowSettings(false); return; }
      if (showCreate)   { setShowCreate(false);   return; }
      if (selectedTotem){ setSelectedTotem(null); return; }
      onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose, showSettings, showCreate, selectedTotem]);

  if (!isOpen) return null;

  // ── Tokens del sistema ────────────────────────────────────────────────────
  const txt        = isDark ? "#ffffff"   : "#111827";
  const txtMuted   = isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.40)";

  // Modal premium con gradient OFICIAL del sistema (HomePage feed)
  const modalStyle: React.CSSProperties = isDark ? {
    background: "linear-gradient(160deg, #2c2c2c 0%, #1a1a1a 45%, #0f0f0f 100%)",
    border:     "1px solid rgba(255,255,255,0.13)",
    boxShadow:  "0 -8px 40px rgba(0,0,0,0.85), inset 0 1px 0 rgba(255,255,255,0.22), inset 0 -1px 0 rgba(0,0,0,0.45)",
  } : {
    background: "#ffffff",
    border:     "1px solid rgba(0,0,0,0.06)",
    boxShadow:  "0 -8px 40px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.80)",
  };

  // Header dinámico
  const headerTitle = selectedTotem ? selectedTotem.name : (tab === "totem" ? "Mi Totem" : "Mercado");
  const headerPrice = selectedTotem ? selectedTotem.price : 0;
  const showHeaderPrice = !!selectedTotem;
  const hPal = HEALTH_PALETTE[sysHealth];

  return (
    <>
      <style>{KEYFRAMES}</style>

      {/* ─── BACKDROP ──────────────────────────────────────────────────── */}
      <div
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        style={{
          position: "fixed", inset: 0, zIndex: 9998,
          background: "rgba(0,0,0,0.78)",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          animation: "tcFadeIn 240ms ease-out both",
        }}
      />

      {/* ─── MODAL ──────────────────────────────────────────────────────── */}
      <div
        role="dialog"
        aria-modal="true"
        style={{
          position: "fixed",
          left: 0, right: 0, bottom: 0,
          top: 24,
          zIndex: 9999,
          borderTopLeftRadius:  28,
          borderTopRightRadius: 28,
          overflow: "hidden",
          display: "flex", flexDirection: "column",
          color: txt,
          animation: "tcSlideUp 480ms cubic-bezier(0.34, 1.56, 0.64, 1) both",
          ...modalStyle,
        }}
      >
        {/* Hairline top accent */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 1,
          background: isDark
            ? "linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent)"
            : "linear-gradient(90deg, transparent, rgba(0,0,0,0.10), transparent)",
        }} />

        {/* Drag handle */}
        <div
          style={{ display: "flex", justifyContent: "center", paddingTop: 10 }}
          onMouseEnter={(e) => ((e.currentTarget.firstChild as HTMLElement).style.opacity = "1")}
          onMouseLeave={(e) => ((e.currentTarget.firstChild as HTMLElement).style.opacity = "0.6")}
        >
          <div style={{
            width: 38, height: 4, borderRadius: 2,
            background: isDark ? "rgba(255,255,255,0.16)" : "rgba(0,0,0,0.14)",
            opacity: 0.6,
            transition: "opacity 220ms cubic-bezier(0.4, 0, 0.2, 1)",
          }} />
        </div>

        {/* ─── HEADER ─────────────────────────────────────────────────── */}
        <header style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 18px 8px", gap: 10,
        }}>
          {/* IZQUIERDA: cerrar — usa el gradient oficial del feed */}
          <button
            onClick={onClose}
            aria-label="Cerrar"
            onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.94)")}
            onMouseUp={(e)   => (e.currentTarget.style.transform = "scale(1)")}
            onMouseLeave={(e)=> (e.currentTarget.style.transform = "scale(1)")}
            style={feedButtonStyle()}
          >
            <X size={17} strokeWidth={2.4} color="#fff" />
          </button>

          {/* CENTRO: título + (precio si hay totem) + system pill SIEMPRE visible */}
          <div style={{
            flex: 1, display: "flex", flexDirection: "column",
            alignItems: "center", lineHeight: 1.05, minWidth: 0, gap: 3,
          }}>
            <span style={{
              fontSize: 10, fontWeight: 800, letterSpacing: 1.5,
              color: txtMuted, textTransform: "uppercase",
              maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {headerTitle}
            </span>
            {showHeaderPrice ? (
              <span style={{
                fontSize: 22, fontWeight: 900, color: txt, marginTop: 1,
                letterSpacing: -0.5, fontVariantNumeric: "tabular-nums", lineHeight: 1.05,
              }}>
                {headerPrice >= 1 ? headerPrice.toFixed(4)
                  : headerPrice >= 0.0001 ? headerPrice.toFixed(6)
                  : headerPrice === 0 ? "0.0000" : headerPrice.toExponential(3)}
                <span style={{
                  fontSize: 9.5, fontWeight: 800, color: txtMuted, letterSpacing: 1.2, marginLeft: 4,
                }}>WLD</span>
              </span>
            ) : null}
            {/* System Health Pill — siempre visible, refleja estabilidad */}
            <span
              title={systemStab?.warnings?.length ? systemStab.warnings.join(" · ") : "Sistema operando con normalidad"}
              style={{
                display: "inline-flex", alignItems: "center", gap: 4,
                padding: "3px 8px", borderRadius: 999,
                background: hPal.bg, border: `1px solid ${hPal.border}`,
                color: hPal.color, fontSize: 9.5, fontWeight: 900, letterSpacing: 1, marginTop: 2,
              }}>
              <span style={{
                width: 6, height: 6, borderRadius: "50%",
                background: hPal.color,
                boxShadow: `0 0 0 0 ${hPal.color}66`,
                animation: sysHealth === "stress" ? "tcDotPulse 1.6s ease-out infinite" : "tcDotPulseSoft 2.4s ease-out infinite",
              }} />
              {hPal.label}
            </span>
          </div>

          {/* DERECHA: settings — funcional, abre SettingsModal */}
          <button
            onClick={() => setShowSettings(true)}
            aria-label="Ajustes del sistema"
            onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.94)")}
            onMouseUp={(e)   => (e.currentTarget.style.transform = "scale(1)")}
            onMouseLeave={(e)=> (e.currentTarget.style.transform = "scale(1)")}
            style={feedButtonStyle()}
          >
            <Settings2 size={16} strokeWidth={2.4} color="#fff" />
          </button>
        </header>

        {/* ─── TABS PILL (oculto si hay totem seleccionado) ───────────── */}
        {!selectedTotem && (
          <div style={{
            padding: "10px 18px 14px",
            display: "flex", justifyContent: "center",
          }}>
            <div style={{
              display: "inline-flex", padding: 4, borderRadius: 999,
              background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
              border:     isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.06)",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
              boxShadow: isDark
                ? "inset 0 1px 0 rgba(255,255,255,0.05), 0 2px 10px rgba(0,0,0,0.30)"
                : "inset 0 1px 0 rgba(255,255,255,0.80), 0 2px 10px rgba(0,0,0,0.04)",
            }}>
              <PillTab label="Mi Totem" icon={<Sparkles size={14} strokeWidth={2.4} />}
                       active={tab === "totem"}  onClick={() => setTab("totem")}  isDark={isDark} />
              <PillTab label="Mercado"  icon={<Store    size={14} strokeWidth={2.4} />}
                       active={tab === "market"} onClick={() => setTab("market")} isDark={isDark} />
            </div>
          </div>
        )}

        {/* ─── CONTENIDO ─────────────────────────────────────────────── */}
        <main style={{
          flex: 1, overflowY: "auto", overflowX: "hidden",
          WebkitOverflowScrolling: "touch",
          padding: selectedTotem ? "12px 18px 32px" : "8px 18px 32px",
        }}>
          {selectedTotem ? (
            <div key={selectedTotem.address} style={{ animation: "tcSlideRight 320ms cubic-bezier(0.4, 0, 0.2, 1) both" }}>
              <TotemDashboard
                totemAddress={selectedTotem.address}
                isDark={isDark}
                userId={userId}
                walletAddress={walletAddress}
                userBalanceWld={userBalanceWld}
                onBack={() => setSelectedTotem(null)}
                canTrade={isOrbVerified}
                onRequestVerify={() => requestVerify("trade")}
                /* Mode lo deduce el dashboard de profile.isOwner (server-derived).
                   Si el selectedTotem ya trae isOwner (response de create), pasamos
                   "owner" para evitar pestañeo de "vista pública" en el primer frame. */
                mode={selectedTotem.isOwner ? "owner" : undefined}
                onProfileRefreshed={(p) => {
                  // Mantener el header del modal (precio, nombre) sincronizado tras
                  // cada trade / refetch del dashboard. SIN crear render loop:
                  // sólo actualiza si hay diff numérico real.
                  setSelectedTotem((prev) =>
                    prev && prev.address === p.address &&
                    (prev.price !== p.price || prev.supply !== p.supply || prev.score !== p.score || prev.isOwner !== p.isOwner)
                      ? p : prev
                  );
                  // métricas globales también pueden haber cambiado
                  refreshSystem();
                }}
              />
            </div>
          ) : (
            <div key={tab} style={{ animation: "tcFadeUp 320ms cubic-bezier(0.4, 0, 0.2, 1) both" }}>
              {tab === "totem"
                ? <TotemEmptyState
                    isDark={isDark}
                    onCreate={() => isOrbVerified ? setShowCreate(true) : requestVerify("create")}
                    onGoToMarket={() => setTab("market")}
                    isOrbVerified={isOrbVerified}
                  />
                : <>
                    {/* Market Status Bar — contexto de mercado SIEMPRE visible */}
                    <MarketStatusBar
                      isDark={isDark}
                      health={sysHealth}
                      stab={systemStab}
                      met={systemMet}
                    />
                    <MarketPage
                      isDark={isDark}
                      userId={userId}
                      onSelectTotem={(addr, totem) => {
                        if (totem) setSelectedTotem(totem);
                        else setSelectedTotem({
                          address: addr, name: addr.slice(0,6),
                          score: 0, influence: 0, level: 1, badge: "",
                          price: 0, supply: 0, volume_24h: 0,
                          created_at: new Date().toISOString(),
                        });
                      }}
                    />
                  </>}
            </div>
          )}
        </main>

        {/* Footer hairline */}
        <div style={{
          height: 1,
          background: isDark
            ? "linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)"
            : "linear-gradient(90deg, transparent, rgba(0,0,0,0.05), transparent)",
        }} />
      </div>

      {/* ─── MODALES INTERNOS ──────────────────────────────────────────── */}
      {showSettings && (
        <SettingsModal
          isDark={isDark}
          stab={systemStab}
          met={systemMet}
          health={sysHealth}
          onRefresh={refreshSystem}
          onClose={() => setShowSettings(false)}
        />
      )}
      {showCreate && (
        <CreateTotemModal
          isDark={isDark}
          userId={userId}
          walletAddress={walletAddress ?? null}
          onClose={() => setShowCreate(false)}
          onCreated={(t) => {
            setShowCreate(false);
            // El response ya trae isOwner=true del backend (creator path).
            const ownedTotem: TotemProfile = { ...t, isOwner: true };
            setCreationSplash(ownedTotem);
            window.setTimeout(() => {
              setSelectedTotem(ownedTotem);
              setCreationSplash(null);
              refreshSystem();
            }, 1700);
          }}
        />
      )}

      {/* ─── CREATION SPLASH ─────────────────────────────────────────── */}
      {creationSplash && (
        <CreationSplash totem={creationSplash} isDark={isDark} />
      )}

      {/* ─── ORB GATE MODAL (verificación) ───────────────────────────── */}
      {orbGate && (
        <OrbGateModal
          isDark={isDark}
          intent={orbGate}
          verifyOrb={verifyOrb}
          userId={userId}
          onClose={() => setOrbGate(null)}
          onSuccess={handleOrbSuccess}
          onMaybeNeedRefresh={() => { void refetchOrb(); }}
        />
      )}
    </>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  PILL TAB
// ════════════════════════════════════════════════════════════════════════════
function PillTab({
  label, icon, active, onClick, isDark,
}: {
  label: string; icon: React.ReactNode; active: boolean;
  onClick: () => void; isDark: boolean;
}) {
  return (
    <button
      onClick={onClick}
      onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.97)")}
      onMouseUp={(e)   => (e.currentTarget.style.transform = "scale(1)")}
      onMouseLeave={(e)=> (e.currentTarget.style.transform = "scale(1)")}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "9px 16px",
        borderRadius: 999,
        border: "none", cursor: "pointer",
        fontSize: 13, fontWeight: 700, letterSpacing: -0.1,
        transition: "all 220ms cubic-bezier(0.4, 0, 0.2, 1)",
        background: active
          ? "linear-gradient(135deg, #6366f1, #a855f7)"
          : "transparent",
        boxShadow: active
          ? "0 4px 20px rgba(99,102,241,0.40), inset 0 1px 0 rgba(255,255,255,0.20)"
          : "none",
        color: active
          ? "#ffffff"
          : isDark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.55)",
      }}
    >
      {icon}
      {label}
    </button>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  TOTEM EMPTY STATE
// ════════════════════════════════════════════════════════════════════════════
function TotemEmptyState({
  isDark, onCreate, onGoToMarket, isOrbVerified,
}: { isDark: boolean; onCreate: () => void; onGoToMarket: () => void; isOrbVerified?: boolean }) {
  const txt    = isDark ? "#ffffff" : "#111827";
  const txtSub = isDark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.55)";

  return (
    <div style={{
      minHeight: "60vh",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      textAlign: "center", padding: "20px 24px",
    }}>
      {/* Icono con halo vivo */}
      <div style={{
        position: "relative", width: 112, height: 112, marginBottom: 28,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <div style={{
          position: "absolute", inset: -20, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(99,102,241,0.30), transparent 65%)",
          filter: "blur(20px)",
          animation: "tcPulse 3.2s ease-in-out infinite",
        }} />
        <div style={{
          width: 96, height: 96, borderRadius: 28,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "linear-gradient(135deg, #6366f1, #a855f7)",
          boxShadow: "0 12px 40px rgba(99,102,241,0.50), inset 0 1px 0 rgba(255,255,255,0.30), inset 0 -2px 0 rgba(0,0,0,0.18)",
          border: "1px solid rgba(255,255,255,0.18)",
        }}>
          <Sparkles size={42} color="#fff" strokeWidth={2.2} />
        </div>
      </div>

      <h2 style={{
        fontSize: 26, fontWeight: 900, letterSpacing: -0.6, color: txt, marginBottom: 10,
      }}>
        Sin Totem aún
      </h2>

      <p style={{
        fontSize: 14, color: txtSub, lineHeight: 1.55, maxWidth: 320, marginBottom: 32,
      }}>
        {isOrbVerified
          ? "Crea tu Totem para participar en el mercado y empezar a operar tu propia economía."
          : "Crear un Totem y operar requiere verificación con Orb desde World App. Sin verificar puedes explorar el mercado en modo lectura."}
      </p>

      {/* CTA principal — Crear (si Orb) | Verificar (si no Orb) */}
      <button
        onClick={onCreate}
        onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.97)")}
        onMouseUp={(e)   => (e.currentTarget.style.transform = "scale(1)")}
        onMouseLeave={(e)=> (e.currentTarget.style.transform = "scale(1)")}
        style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          padding: "14px 24px",
          borderRadius: 16,
          border: "1px solid rgba(255,255,255,0.18)",
          background:  "linear-gradient(135deg, #6366f1, #a855f7)",
          boxShadow:   "0 6px 28px rgba(99,102,241,0.50), inset 0 1px 0 rgba(255,255,255,0.22), inset 0 -1px 0 rgba(0,0,0,0.18)",
          color: "#ffffff",
          fontSize: 14, fontWeight: 800, letterSpacing: -0.1,
          cursor: "pointer",
          transition: "transform 160ms cubic-bezier(0.4, 0, 0.2, 1)",
          marginBottom: 14,
        }}
      >
        {isOrbVerified
          ? <><Plus size={16} strokeWidth={2.6} /> Crear mi Totem</>
          : <><ShieldCheck size={16} strokeWidth={2.6} /> Verifícate con Orb para crear</>}
      </button>

      {/* Botón ghost: Ver Mercado */}
      <button
        onClick={onGoToMarket}
        onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.97)")}
        onMouseUp={(e)   => (e.currentTarget.style.transform = "scale(1)")}
        onMouseLeave={(e)=> (e.currentTarget.style.transform = "scale(1)")}
        style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "11px 18px",
          borderRadius: 14,
          background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)",
          border:     isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.08)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          color: txt,
          fontSize: 13, fontWeight: 700,
          cursor: "pointer",
          transition: "transform 160ms cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        Ver Mercado
        <ArrowRight size={15} strokeWidth={2.4} />
      </button>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  SETTINGS MODAL — modo DEV/PROD + info del sistema
// ════════════════════════════════════════════════════════════════════════════
function SettingsModal({
  isDark, onClose, stab: stabProp, met: metProp, health, onRefresh,
}: {
  isDark: boolean; onClose: () => void;
  stab:   { stable: boolean; frozen: string[]; warnings: string[] } | null;
  met:    SystemMetrics | null;
  health: SysHealth;
  onRefresh?: () => void;
}) {
  const [refreshing, setRefreshing] = useState(false);
  // Si el padre ya tiene los datos los usamos sin esperar; si no, hacemos fetch local.
  const [stab,    setStab]    = useState<{ stable: boolean; frozen: string[]; warnings: string[] } | null>(stabProp);
  const [metrics, setMetrics] = useState<SystemMetrics | null>(metProp);
  const [loading, setLoading] = useState(!stabProp || !metProp);
  const [error,   setError]   = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(false);
    try {
      const [s, m] = await Promise.all([
        getStabilityStatus().catch(() => null),
        getSystemMetrics().catch(() => null),
      ]);
      setStab(s);
      setMetrics(m);
    } catch { setError(true); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (stabProp && metProp) { setStab(stabProp); setMetrics(metProp); setLoading(false); }
    else load();
  }, [stabProp, metProp, load]);

  const hPal = HEALTH_PALETTE[health];

  const txt      = isDark ? "#ffffff" : "#111827";
  const txtSub   = isDark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.55)";
  const cardBg   = isDark ? "#111113" : "#ffffff";
  const cardBdr  = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";

  return (
    <>
      <div
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        style={{
          position: "fixed", inset: 0, zIndex: 10000,
          background: "rgba(0,0,0,0.78)", backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          display: "flex", alignItems: "flex-end", justifyContent: "center",
          padding: 12,
          animation: "tcFadeIn 200ms ease-out both",
        }}
      >
        <div
          role="dialog" aria-modal="true" aria-label="Ajustes del sistema"
          style={{
            width: "100%", maxWidth: 460,
            background: isDark ? "linear-gradient(160deg, #2c2c2c 0%, #1a1a1a 45%, #0f0f0f 100%)" : "#ffffff",
            border: isDark ? "1px solid rgba(255,255,255,0.13)" : "1px solid rgba(0,0,0,0.06)",
            borderRadius: 28, padding: 18,
            boxShadow: isDark
              ? "0 24px 80px rgba(0,0,0,0.85), inset 0 1px 0 rgba(255,255,255,0.18)"
              : "0 24px 80px rgba(0,0,0,0.20), inset 0 1px 0 rgba(255,255,255,0.80)",
            color: txt,
            animation: "tcSlideUp 360ms cubic-bezier(0.34, 1.56, 0.64, 1) both",
            maxHeight: "90vh", overflowY: "auto",
          }}
        >
          {/* Header */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            marginBottom: 14,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 12,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: "linear-gradient(160deg, #2c2c2c 0%, #1a1a1a 45%, #0f0f0f 100%)",
                border: "1px solid rgba(255,255,255,0.13)",
                boxShadow: "0 4px 14px rgba(0,0,0,0.50), inset 0 1px 0 rgba(255,255,255,0.18)",
              }}>
                <Settings2 size={16} color="#fff" strokeWidth={2.4} />
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 900, letterSpacing: -0.3, lineHeight: 1.1 }}>Ajustes</div>
                <div style={{ fontSize: 10.5, color: txtSub, marginTop: 1 }}>Sistema · Producción · Estado</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {onRefresh && (
                <button
                  onClick={async () => {
                    if (refreshing) return;
                    setRefreshing(true);
                    try { await Promise.resolve(onRefresh()); await load(); }
                    finally { window.setTimeout(() => setRefreshing(false), 500); }
                  }}
                  aria-label="Refrescar datos del sistema"
                  disabled={refreshing}
                  style={{
                    ...feedButtonStyle(), width: 32, height: 32, borderRadius: 10,
                    opacity: refreshing ? 0.6 : 1, cursor: refreshing ? "default" : "pointer",
                  }}
                >
                  <RefreshCw size={14} color="#fff" strokeWidth={2.6}
                    className={refreshing ? "tc-spin" : undefined} />
                </button>
              )}
              <button
                onClick={onClose} aria-label="Cerrar ajustes"
                style={{
                  ...feedButtonStyle(), width: 32, height: 32, borderRadius: 10,
                }}
              >
                <X size={14} color="#fff" strokeWidth={2.6} />
              </button>
            </div>
          </div>

          {/* Modo */}
          <div style={{
            background: cardBg, border: `1px solid ${cardBdr}`,
            borderRadius: 18, padding: "12px 14px", marginBottom: 10,
          }}>
            <div style={{
              fontSize: 9.5, fontWeight: 800, letterSpacing: 1.3,
              color: txtSub, textTransform: "uppercase", marginBottom: 8,
            }}>
              Modo de operación
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "6px 12px", borderRadius: 999,
                background: IS_PRODUCTION ? "rgba(34,197,94,0.12)" : "rgba(251,191,36,0.12)",
                border: `1px solid ${IS_PRODUCTION ? "rgba(34,197,94,0.30)" : "rgba(251,191,36,0.30)"}`,
                color: IS_PRODUCTION ? "#22c55e" : "#fbbf24",
                fontSize: 11.5, fontWeight: 800, letterSpacing: 0.2,
              }}>
                {IS_PRODUCTION ? <CheckCircle2 size={12} strokeWidth={2.6} /> : <AlertCircle size={12} strokeWidth={2.6} />}
                {IS_PRODUCTION ? "PRODUCCIÓN" : "DESARROLLO"}
              </div>
              <div style={{ fontSize: 11, color: txtSub, lineHeight: 1.4, flex: 1 }}>
                {IS_PRODUCTION
                  ? "Trades on-chain vía TotemBondingCurve."
                  : "Sin contrato. Trades simulados (txHash dev)."}
              </div>
            </div>
          </div>

          {/* Métricas */}
          <div style={{
            background: cardBg, border: `1px solid ${cardBdr}`,
            borderRadius: 18, padding: "12px 14px", marginBottom: 10,
          }}>
            <div style={{
              fontSize: 9.5, fontWeight: 800, letterSpacing: 1.3,
              color: txtSub, textTransform: "uppercase", marginBottom: 8,
              display: "flex", alignItems: "center", gap: 5,
            }}>
              <Activity size={11} strokeWidth={2.6} color={txtSub} /> Métricas globales
            </div>
            {loading ? (
              <SettingsSkeletonRow isDark={isDark} />
            ) : error || !metrics ? (
              <div style={{ fontSize: 11.5, color: txtSub }}>No se pudo cargar.</div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <Stat label="Totems"     value={String(metrics.totalTotems)} isDark={isDark} />
                <Stat label="Vol total"  value={fmtCompact(metrics.totalVolume)} suffix="WLD" isDark={isDark} />
                <Stat label="Precio promedio" value={fmtPriceShort(metrics.avgPrice)} suffix="WLD" isDark={isDark} />
                <Stat label="Top totem"  value={metrics.topTotem?.name?.slice(0, 12) ?? "—"} isDark={isDark} />
              </div>
            )}
          </div>

          {/* Salud del sistema */}
          <div style={{
            background: cardBg, border: `1px solid ${cardBdr}`,
            borderRadius: 18, padding: "12px 14px", marginBottom: 10,
          }}>
            <div style={{
              fontSize: 9.5, fontWeight: 800, letterSpacing: 1.3,
              color: txtSub, textTransform: "uppercase", marginBottom: 8,
              display: "flex", alignItems: "center", gap: 5,
            }}>
              <Server size={11} strokeWidth={2.6} color={txtSub} /> Salud del sistema
            </div>
            {loading ? (
              <SettingsSkeletonRow isDark={isDark} />
            ) : error || !stab ? (
              <div style={{ fontSize: 11.5, color: txtSub }}>No se pudo cargar.</div>
            ) : (
              <>
                <div style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "5px 10px", borderRadius: 999,
                  background: hPal.bg, border: `1px solid ${hPal.border}`,
                  color: hPal.color,
                  fontSize: 11, fontWeight: 800, marginBottom: 8,
                }}>
                  <hPal.Icon size={11} strokeWidth={2.6} />
                  {hPal.label}
                </div>
                <div style={{ fontSize: 11.5, color: txtSub, lineHeight: 1.5 }}>
                  {stab.stable
                    ? "Sistema operando con normalidad. No se detectaron anomalías."
                    : `${stab.warnings.length} aviso(s) activos. Revisa las alertas a continuación.`}
                </div>
              </>
            )}
          </div>

          {/* Alertas — solo si hay warnings o frozen */}
          {!loading && stab && (stab.warnings.length > 0 || stab.frozen.length > 0) && (
            <div style={{
              background: "rgba(251,191,36,0.06)",
              border: "1px solid rgba(251,191,36,0.30)",
              borderRadius: 18, padding: "12px 14px",
            }}>
              <div style={{
                fontSize: 9.5, fontWeight: 800, letterSpacing: 1.3,
                color: "#fbbf24", textTransform: "uppercase", marginBottom: 8,
                display: "flex", alignItems: "center", gap: 5,
              }}>
                <AlertTriangle size={11} strokeWidth={2.6} color="#fbbf24" /> Alertas activas
              </div>
              {stab.warnings.length > 0 && (
                <ul style={{ margin: 0, paddingLeft: 18, color: txt, fontSize: 11.5, lineHeight: 1.6, marginBottom: stab.frozen.length ? 8 : 0 }}>
                  {stab.warnings.map((w, i) => <li key={i}>{w}</li>)}
                </ul>
              )}
              {stab.frozen.length > 0 && (
                <div style={{
                  fontSize: 10.5, color: "#f87171", fontWeight: 700,
                  padding: "6px 8px", borderRadius: 8,
                  background: "rgba(248,113,113,0.08)",
                  border: "1px solid rgba(248,113,113,0.22)",
                }}>
                  {stab.frozen.length} totem(s) congelado(s) por el sistema
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  MARKET STATUS BAR — contexto de mercado en la parte superior del Market
// ════════════════════════════════════════════════════════════════════════════
function MarketStatusBar({
  isDark, health, stab, met,
}: {
  isDark: boolean; health: SysHealth;
  stab: { stable: boolean; warnings: string[]; frozen: string[] } | null;
  met:  SystemMetrics | null;
}) {
  const txt      = isDark ? "#ffffff" : "#111827";
  const txtSub   = isDark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.55)";
  const txtMuted = isDark ? "rgba(255,255,255,0.32)" : "rgba(0,0,0,0.40)";
  const cardBg   = isDark ? "#111113" : "#ffffff";
  const cardBdr  = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
  const hPal     = HEALTH_PALETTE[health];

  // Severidad visual: STRESS = glow rojo intenso + borde + vibración micro;
  // VOLATILE = halo ámbar suave; STABLE = neutro.
  const stressMode   = health === "stress";
  const volatileMode = health === "volatile";

  return (
    <div style={{
      background: stressMode
        ? "linear-gradient(160deg, rgba(248,113,113,0.10), rgba(220,38,38,0.04))"
        : volatileMode
          ? "linear-gradient(160deg, rgba(251,191,36,0.08), rgba(217,119,6,0.03))"
          : cardBg,
      border: `1px solid ${stressMode ? "rgba(248,113,113,0.42)" : volatileMode ? "rgba(251,191,36,0.36)" : cardBdr}`,
      borderRadius: 20, padding: "10px 14px", marginBottom: 14,
      boxShadow: stressMode
        ? "0 0 0 1px rgba(248,113,113,0.18), 0 8px 28px rgba(248,113,113,0.20), inset 0 1px 0 rgba(255,255,255,0.04)"
        : volatileMode
          ? "0 6px 22px rgba(251,191,36,0.14), inset 0 1px 0 rgba(255,255,255,0.04)"
          : isDark
            ? "0 4px 18px rgba(0,0,0,0.40), inset 0 1px 0 rgba(255,255,255,0.04)"
            : "0 2px 12px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.80)",
      display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
      animation: stressMode ? "tcStressShake 4s ease-in-out infinite" : undefined,
      transition: "background 280ms ease, border-color 280ms ease, box-shadow 280ms ease",
    }}>
      {/* Health pill */}
      <div style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "5px 10px", borderRadius: 999,
        background: hPal.bg, border: `1px solid ${hPal.border}`,
        color: hPal.color, fontSize: 11, fontWeight: 900, letterSpacing: 0.6,
      }}>
        <span style={{
          width: 7, height: 7, borderRadius: "50%", background: hPal.color,
          animation: stressMode ? "tcDotPulse 1.1s ease-out infinite"
                  : volatileMode ? "tcDotPulseAmber 1.8s ease-out infinite"
                                 : "tcDotPulseSoft 2.4s ease-out infinite",
        }} />
        {hPal.label}
      </div>
      {/* Mini métricas */}
      <div style={{ display: "flex", gap: 14, marginLeft: "auto", flexWrap: "wrap" }}>
        <MiniStat label="Totems" value={met ? String(met.totalTotems) : "—"} txt={txt} txtSub={txtSub} txtMuted={txtMuted} />
        <MiniStat label="Volumen" value={met ? fmtCompact(met.totalVolume) : "—"} suffix="WLD" txt={txt} txtSub={txtSub} txtMuted={txtMuted} />
        <MiniStat label="Precio prom." value={met ? fmtPriceShort(met.avgPrice) : "—"} suffix="WLD" txt={txt} txtSub={txtSub} txtMuted={txtMuted} />
      </div>
      {/* STRESS → banner DECISIVO full width.   VOLATILE → línea inline ámbar. */}
      {stressMode && stab && stab.warnings.length > 0 && (
        <div style={{
          width: "100%", marginTop: 6,
          padding: "8px 10px", borderRadius: 12,
          background: "rgba(248,113,113,0.14)",
          border: "1px solid rgba(248,113,113,0.42)",
          color: "#fecaca",
          fontSize: 11.5, fontWeight: 800, letterSpacing: 0.1,
          display: "inline-flex", alignItems: "center", gap: 7, lineHeight: 1.35,
        }}>
          <AlertTriangle size={13} strokeWidth={2.8} color="#f87171" style={{ flexShrink: 0 }} />
          <span>
            <strong style={{ color: "#fff", marginRight: 4 }}>Sistema bajo presión.</strong>
            {stab.warnings[0]}{stab.warnings.length > 1 && ` · +${stab.warnings.length - 1} aviso(s)`}
          </span>
        </div>
      )}
      {volatileMode && stab && stab.warnings.length > 0 && (
        <div style={{
          width: "100%", marginTop: 4,
          fontSize: 10.5, color: "#fbbf24", fontWeight: 800,
          display: "inline-flex", alignItems: "center", gap: 5,
        }}>
          <AlertTriangle size={11} strokeWidth={2.6} />
          {stab.warnings[0]}{stab.warnings.length > 1 && ` · +${stab.warnings.length - 1} más`}
        </div>
      )}
    </div>
  );
}

function MiniStat({
  label, value, suffix, txt, txtSub, txtMuted,
}: { label: string; value: string; suffix?: string; txt: string; txtSub: string; txtMuted: string }) {
  return (
    <div style={{ lineHeight: 1.05 }}>
      <div style={{ fontSize: 8.5, fontWeight: 800, color: txtSub, letterSpacing: 0.8, textTransform: "uppercase" }}>{label}</div>
      <div style={{
        fontSize: 12.5, fontWeight: 900, color: txt, marginTop: 2,
        letterSpacing: -0.2, fontVariantNumeric: "tabular-nums",
      }}>
        {value}{suffix && <span style={{ fontSize: 8, fontWeight: 700, color: txtMuted, marginLeft: 3, letterSpacing: 0.8 }}>{suffix}</span>}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  CREATION SPLASH — momento épico post-creación
// ════════════════════════════════════════════════════════════════════════════
function CreationSplash({ totem, isDark }: { totem: TotemProfile; isDark: boolean }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 10001,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: isDark
        ? "linear-gradient(160deg, rgba(20,15,40,0.96), rgba(8,6,20,0.98))"
        : "linear-gradient(160deg, rgba(238,242,255,0.97), rgba(245,243,255,0.99))",
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      animation: "tcFadeIn 220ms ease-out both",
    }}>
      {/* halo radial */}
      <div style={{
        position: "absolute", width: 420, height: 420, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(99,102,241,0.55), transparent 65%)",
        filter: "blur(40px)",
        animation: "tcSplashHalo 1.7s ease-out both",
      }} />
      {/* sparkles flotantes */}
      {[0,1,2,3,4,5].map((i) => (
        <div key={i} style={{
          position: "absolute",
          left:  `${30 + (i*11) % 40}%`,
          top:   `${28 + (i*17) % 44}%`,
          width: 6, height: 6, borderRadius: "50%",
          background: i % 2 ? "#a855f7" : "#6366f1",
          boxShadow: `0 0 12px ${i % 2 ? "#a855f7" : "#6366f1"}`,
          animation: `tcSparkle 1.6s ${i*0.12}s ease-out both`,
        }} />
      ))}
      <div style={{ position: "relative", textAlign: "center", padding: 24 }}>
        <div style={{
          width: 112, height: 112, borderRadius: 32,
          margin: "0 auto 22px",
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "linear-gradient(135deg, #6366f1, #a855f7)",
          boxShadow: "0 18px 60px rgba(99,102,241,0.55), inset 0 1px 0 rgba(255,255,255,0.32), inset 0 -2px 0 rgba(0,0,0,0.20)",
          border: "1px solid rgba(255,255,255,0.22)",
          animation: "tcSplashIcon 600ms cubic-bezier(0.34, 1.56, 0.64, 1) both",
          fontSize: 50, fontWeight: 900, color: "#fff", letterSpacing: -1,
        }}>
          {totem.name.trim().charAt(0).toUpperCase()}
        </div>
        <div style={{
          fontSize: 11, fontWeight: 800, letterSpacing: 2,
          color: isDark ? "#a78bfa" : "#6366f1", marginBottom: 8,
        }}>
          ¡TOTEM CREADO!
        </div>
        <div style={{
          fontSize: 28, fontWeight: 900, letterSpacing: -0.6, marginBottom: 6,
          color: isDark ? "#fff" : "#1e1b4b",
          animation: "tcSplashText 700ms 120ms cubic-bezier(0.34, 1.56, 0.64, 1) both",
        }}>
          {totem.name}
        </div>
        <div style={{
          fontSize: 12, fontWeight: 700,
          color: isDark ? "rgba(255,255,255,0.55)" : "rgba(30,27,75,0.65)",
          fontFamily: "ui-monospace, SFMono-Regular, monospace",
          letterSpacing: 0.3,
        }}>
          {totem.address.slice(0, 8)}…{totem.address.slice(-6)}
        </div>
      </div>
    </div>
  );
}

function SettingsSkeletonRow({ isDark }: { isDark: boolean }) {
  const bg = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)";
  return (
    <div style={{ display: "flex", gap: 6 }}>
      <div style={{ flex: 1, height: 14, borderRadius: 6, background: bg }} />
      <div style={{ flex: 1, height: 14, borderRadius: 6, background: bg }} />
    </div>
  );
}

function Stat({
  label, value, suffix, isDark,
}: { label: string; value: string; suffix?: string; isDark: boolean }) {
  const txt    = isDark ? "#ffffff" : "#111827";
  const txtSub = isDark ? "rgba(255,255,255,0.50)" : "rgba(0,0,0,0.50)";
  const txtMt  = isDark ? "rgba(255,255,255,0.30)" : "rgba(0,0,0,0.40)";
  return (
    <div>
      <div style={{ fontSize: 9.5, color: txtSub, fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase" }}>
        {label}
      </div>
      <div style={{
        fontSize: 14, fontWeight: 900, color: txt, letterSpacing: -0.2,
        fontVariantNumeric: "tabular-nums", marginTop: 2,
      }}>
        {value}{suffix && <span style={{ fontSize: 9, fontWeight: 700, color: txtMt, marginLeft: 4, letterSpacing: 1 }}>{suffix}</span>}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  CREATE TOTEM MODAL — flujo claro y funcional
// ════════════════════════════════════════════════════════════════════════════
function CreateTotemModal({
  isDark, userId, walletAddress, onClose, onCreated,
}: {
  isDark: boolean; userId: string; walletAddress: string | null;
  onClose: () => void; onCreated: (t: TotemProfile) => void;
}) {
  const [name,       setName]       = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg,   setErrorMsg]   = useState<string | null>(null);

  // Address determinista por usuario+nombre — igual entrada → igual address
  const derivedAddress = useMemo(() => {
    const seedSrc = (walletAddress ?? userId ?? "anon") + ":" + name.trim().toLowerCase();
    let h1 = 0xdeadbeef ^ seedSrc.length;
    let h2 = 0x41c6ce57 ^ seedSrc.length;
    for (let i = 0; i < seedSrc.length; i++) {
      const ch = seedSrc.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = (h1 ^ (h1 >>> 16)) >>> 0;
    h2 = (h2 ^ (h2 >>> 13)) >>> 0;
    const hex = (h1.toString(16).padStart(8, "0") + h2.toString(16).padStart(8, "0")).repeat(3).slice(0, 40);
    return "0x" + hex;
  }, [name, walletAddress, userId]);

  const validName = name.trim().length >= 2 && name.trim().length <= 32;

  async function handleCreate() {
    if (submitting) return;
    if (!validName) { setErrorMsg("El nombre debe tener entre 2 y 32 caracteres."); return; }
    setSubmitting(true); setErrorMsg(null);
    try {
      // userId va en el session token, no en el body
      const created = await createTotem(derivedAddress, name.trim());
      onCreated(created);
    } catch (e: any) {
      setErrorMsg(e?.message ?? "No se pudo crear el Totem.");
      setSubmitting(false);
    }
  }

  const txt      = isDark ? "#ffffff" : "#111827";
  const txtSub   = isDark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.55)";
  const txtMuted = isDark ? "rgba(255,255,255,0.32)" : "rgba(0,0,0,0.40)";
  const cardBdr  = isDark ? "rgba(255,255,255,0.13)" : "rgba(0,0,0,0.06)";
  const inpBg    = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)";
  const inpBdr   = isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.10)";

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 10000,
        background: "rgba(0,0,0,0.78)", backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        display: "flex", alignItems: "flex-end", justifyContent: "center",
        padding: 12,
        animation: "tcFadeIn 200ms ease-out both",
      }}
    >
      <div
        role="dialog" aria-modal="true" aria-label="Crear mi Totem"
        style={{
          width: "100%", maxWidth: 460,
          background: isDark ? "linear-gradient(160deg, #2c2c2c 0%, #1a1a1a 45%, #0f0f0f 100%)" : "#ffffff",
          border: `1px solid ${cardBdr}`,
          borderRadius: 28, padding: 18,
          boxShadow: isDark
            ? "0 24px 80px rgba(0,0,0,0.85), inset 0 1px 0 rgba(255,255,255,0.18)"
            : "0 24px 80px rgba(0,0,0,0.20), inset 0 1px 0 rgba(255,255,255,0.80)",
          color: txt,
          animation: "tcSlideUp 360ms cubic-bezier(0.34, 1.56, 0.64, 1) both",
        }}
      >
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          marginBottom: 14,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 12,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "linear-gradient(135deg, #6366f1, #a855f7)",
              border: "1px solid rgba(255,255,255,0.18)",
              boxShadow: "0 6px 20px rgba(99,102,241,0.45), inset 0 1px 0 rgba(255,255,255,0.22)",
            }}>
              <Sparkles size={16} color="#fff" strokeWidth={2.4} />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 900, letterSpacing: -0.3, lineHeight: 1.1 }}>Crear mi Totem</div>
              <div style={{ fontSize: 10.5, color: txtSub, marginTop: 1 }}>Tu propia economía en un par de toques</div>
            </div>
          </div>
          <button
            onClick={onClose} aria-label="Cerrar"
            style={{ ...feedButtonStyle(), width: 32, height: 32, borderRadius: 10 }}
          >
            <X size={14} color="#fff" strokeWidth={2.6} />
          </button>
        </div>

        {/* Input nombre */}
        <label style={{
          display: "block", fontSize: 11, fontWeight: 700, color: txtSub,
          letterSpacing: 0.2, marginBottom: 6,
        }}>
          Nombre del Totem
        </label>
        <div style={{
          background: inpBg, border: `1px solid ${inpBdr}`,
          borderRadius: 16, padding: "12px 14px",
          backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
          marginBottom: 10,
        }}>
          <input
            value={name}
            onChange={(e) => { setName(e.target.value); setErrorMsg(null); }}
            placeholder="Ej. Sol Poniente"
            maxLength={32}
            disabled={submitting}
            style={{
              width: "100%", background: "transparent", border: "none", outline: "none",
              color: txt, fontSize: 18, fontWeight: 800, letterSpacing: -0.3,
            }}
          />
        </div>

        {/* PREVIEW CARD — vista del Totem antes de crear */}
        <div style={{
          background: validName
            ? "linear-gradient(160deg, rgba(99,102,241,0.10), rgba(168,85,247,0.06))"
            : isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)",
          border: `1px solid ${validName ? "rgba(99,102,241,0.32)" : inpBdr}`,
          borderRadius: 18, padding: "14px 14px", marginBottom: 12,
          transition: "all 220ms cubic-bezier(0.4, 0, 0.2, 1)",
        }}>
          <div style={{
            fontSize: 9, fontWeight: 800, letterSpacing: 1.4,
            color: validName ? (isDark ? "#a78bfa" : "#6366f1") : txtMuted,
            textTransform: "uppercase", marginBottom: 10,
          }}>
            Vista previa
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {/* Avatar inicial con gradient brand */}
            <div style={{
              width: 52, height: 52, borderRadius: 16, flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: validName
                ? "linear-gradient(135deg, #6366f1, #a855f7)"
                : isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
              boxShadow: validName
                ? "0 8px 22px rgba(99,102,241,0.40), inset 0 1px 0 rgba(255,255,255,0.22)"
                : "none",
              border: validName ? "1px solid rgba(255,255,255,0.18)" : `1px solid ${inpBdr}`,
              fontSize: 22, fontWeight: 900, color: validName ? "#fff" : txtMuted,
              letterSpacing: -0.5,
            }}>
              {validName ? name.trim().charAt(0).toUpperCase() : "?"}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 16, fontWeight: 900, color: txt,
                letterSpacing: -0.3, lineHeight: 1.15,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {name.trim() || "Tu Totem"}
              </div>
              <div style={{
                fontSize: 10.5, color: txtMuted, marginTop: 2,
                fontFamily: "ui-monospace, SFMono-Regular, monospace", letterSpacing: 0.2,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {validName ? `${derivedAddress.slice(0, 10)}…${derivedAddress.slice(-6)}` : "0x — — —"}
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                <PreviewBadge label="Score" value="0" txtSub={txtSub} txtMuted={txtMuted} />
                <PreviewBadge label="Lvl"   value="1" txtSub={txtSub} txtMuted={txtMuted} />
                <PreviewBadge label="Vol"   value="0 WLD" txtSub={txtSub} txtMuted={txtMuted} />
              </div>
            </div>
          </div>
        </div>

        {/* Mensaje de error */}
        {errorMsg && (
          <div style={{
            display: "flex", alignItems: "flex-start", gap: 6,
            background: "rgba(248,113,113,0.10)",
            border: "1px solid rgba(248,113,113,0.28)",
            color: "#f87171",
            borderRadius: 12, padding: "9px 12px",
            fontSize: 12, fontWeight: 600, marginBottom: 12,
          }}>
            <AlertCircle size={14} strokeWidth={2.6} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Acciones */}
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={onClose}
            disabled={submitting}
            style={{
              flex: 1, padding: "12px 16px",
              background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)",
              border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.08)",
              borderRadius: 14, color: txt,
              fontSize: 13, fontWeight: 700, cursor: submitting ? "not-allowed" : "pointer",
              backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)",
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleCreate}
            disabled={!validName || submitting}
            onMouseDown={(e) => { if (!submitting && validName) e.currentTarget.style.transform = "scale(0.97)"; }}
            onMouseUp={(e)   => (e.currentTarget.style.transform = "scale(1)")}
            onMouseLeave={(e)=> (e.currentTarget.style.transform = "scale(1)")}
            style={{
              flex: 1.4, padding: "12px 16px",
              background: !validName || submitting
                ? "rgba(99,102,241,0.35)"
                : "linear-gradient(135deg, #6366f1, #a855f7)",
              border: "1px solid rgba(255,255,255,0.18)",
              borderRadius: 14, color: "#fff",
              fontSize: 13, fontWeight: 800, letterSpacing: -0.1,
              cursor: !validName || submitting ? "not-allowed" : "pointer",
              boxShadow: !validName || submitting
                ? "none"
                : "0 6px 24px rgba(99,102,241,0.45), inset 0 1px 0 rgba(255,255,255,0.22)",
              transition: "all 180ms cubic-bezier(0.4, 0, 0.2, 1)",
              display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}
          >
            {submitting ? (<><Loader2 size={13} className="tc-spin" /> Creando…</>)
              : (<><Sparkles size={13} strokeWidth={2.6} /> Crear Totem</>)}
          </button>
        </div>

        <p style={{
          marginTop: 10, fontSize: 10.5, color: txtMuted, lineHeight: 1.5, textAlign: "center",
        }}>
          {IS_PRODUCTION
            ? "Modo producción · esto registrará tu Totem en el contrato."
            : "Modo desarrollo · creación simulada para pruebas."}
        </p>
      </div>
    </div>
  );
}

function PreviewBadge({
  label, value, txtSub, txtMuted,
}: { label: string; value: string; txtSub: string; txtMuted: string }) {
  return (
    <div style={{
      display: "inline-flex", alignItems: "baseline", gap: 3,
      padding: "3px 7px", borderRadius: 8,
      background: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(255,255,255,0.08)",
    }}>
      <span style={{ fontSize: 8.5, fontWeight: 800, color: txtMuted, letterSpacing: 0.7, textTransform: "uppercase" }}>{label}</span>
      <span style={{ fontSize: 10, fontWeight: 800, color: txtSub, fontVariantNumeric: "tabular-nums" }}>{value}</span>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  HELPERS DE FORMATO + ESTILOS
// ════════════════════════════════════════════════════════════════════════════
function fmtCompact(n: number): string {
  if (!isFinite(n)) return "0";
  const abs = Math.abs(n);
  if (abs >= 1e9) return (n / 1e9).toFixed(2) + "B";
  if (abs >= 1e6) return (n / 1e6).toFixed(2) + "M";
  if (abs >= 1e3) return (n / 1e3).toFixed(2) + "K";
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}
function fmtPriceShort(p: number): string {
  if (!isFinite(p) || p === 0) return "0.0000";
  if (p >= 1)      return p.toFixed(4);
  if (p >= 0.0001) return p.toFixed(6);
  return p.toExponential(2);
}

/** Botón estilo header del feed (gradient oscuro + inset shadows) */
function feedButtonStyle(): React.CSSProperties {
  return {
    width: 38, height: 38, borderRadius: 12,
    display: "flex", alignItems: "center", justifyContent: "center",
    background: "linear-gradient(160deg, #2c2c2c 0%, #1a1a1a 45%, #0f0f0f 100%)",
    border: "1px solid rgba(255,255,255,0.14)",
    boxShadow: "0 4px 14px rgba(0,0,0,0.70), inset 0 1px 0 rgba(255,255,255,0.22), inset 0 -1px 0 rgba(0,0,0,0.45)",
    color: "#ffffff",
    cursor: "pointer", flexShrink: 0,
    transition: "transform 160ms cubic-bezier(0.4, 0, 0.2, 1)",
  };
}

const KEYFRAMES = `
  @keyframes tcFadeIn  { from { opacity: 0 } to { opacity: 1 } }
  @keyframes tcSlideUp {
    from { transform: translateY(110%); opacity: 0; }
    to   { transform: translateY(0);    opacity: 1; }
  }
  @keyframes tcSlideRight {
    from { transform: translateX(28px); opacity: 0; }
    to   { transform: translateX(0);    opacity: 1; }
  }
  @keyframes tcFadeUp {
    from { transform: translateY(12px); opacity: 0; }
    to   { transform: translateY(0);    opacity: 1; }
  }
  @keyframes tcPulse {
    0%, 100% { opacity: 0.60; transform: scale(1); }
    50%      { opacity: 1.00; transform: scale(1.04); }
  }
  @keyframes tcSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  .tc-spin { animation: tcSpin 0.9s linear infinite; }
  @keyframes tcDotPulse {
    0%   { box-shadow: 0 0 0 0 rgba(248,113,113,0.55); }
    70%  { box-shadow: 0 0 0 9px rgba(248,113,113,0);  }
    100% { box-shadow: 0 0 0 0 rgba(248,113,113,0);    }
  }
  @keyframes tcDotPulseSoft {
    0%   { box-shadow: 0 0 0 0 rgba(34,197,94,0.45); }
    70%  { box-shadow: 0 0 0 7px rgba(34,197,94,0);  }
    100% { box-shadow: 0 0 0 0 rgba(34,197,94,0);    }
  }
  @keyframes tcDotPulseAmber {
    0%   { box-shadow: 0 0 0 0 rgba(251,191,36,0.50); }
    70%  { box-shadow: 0 0 0 8px rgba(251,191,36,0);  }
    100% { box-shadow: 0 0 0 0 rgba(251,191,36,0);    }
  }
  @keyframes tcStressShake {
    0%, 92%, 100% { transform: translate3d(0, 0, 0); }
    93% { transform: translate3d(-1px, 0, 0); }
    95% { transform: translate3d(1px, 0, 0); }
    97% { transform: translate3d(-1px, 0, 0); }
    99% { transform: translate3d(1px, 0, 0); }
  }
  @keyframes tcSplashHalo {
    0%   { opacity: 0; transform: scale(0.5); }
    40%  { opacity: 1; transform: scale(1.05); }
    100% { opacity: 0.5; transform: scale(1.18); }
  }
  @keyframes tcSplashIcon {
    0%   { transform: scale(0.4) rotate(-12deg); opacity: 0; }
    60%  { transform: scale(1.10) rotate(4deg);  opacity: 1; }
    100% { transform: scale(1) rotate(0);        opacity: 1; }
  }
  @keyframes tcSplashText {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes tcSparkle {
    0%   { opacity: 0; transform: translate(0, 0) scale(0.4); }
    40%  { opacity: 1; transform: translate(var(--dx, 14px), var(--dy, -18px)) scale(1.2); }
    100% { opacity: 0; transform: translate(calc(var(--dx, 14px) * 1.6), calc(var(--dy, -18px) * 1.6)) scale(0.6); }
  }
`;

// ════════════════════════════════════════════════════════════════════════════
//  ORB GATE MODAL — Pide verificación Orb antes de crear / operar
// ════════════════════════════════════════════════════════════════════════════
function OrbGateModal({
  isDark, intent, verifyOrb, userId, onClose, onSuccess, onMaybeNeedRefresh,
}: {
  isDark: boolean;
  intent: "create" | "trade";
  verifyOrb?: () => Promise<{ success: boolean; proof?: any }>;
  userId: string;
  onClose: () => void;
  onSuccess: () => void;
  onMaybeNeedRefresh: () => void;
}) {
  const [phase, setPhase] = useState<"idle" | "verifying" | "saving" | "error">("idle");
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const txt    = isDark ? "#ffffff" : "#111827";
  const txtSub = isDark ? "rgba(255,255,255,0.65)" : "rgba(0,0,0,0.62)";
  const bg     = isDark ? "#111113" : "#ffffff";
  const border = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";

  const titleByIntent = intent === "create"
    ? "Verifica con Orb para crear tu Totem"
    : "Verifica con Orb para operar";
  const subByIntent = intent === "create"
    ? "Solo cuentas verificadas con Orb pueden crear tótems. Esto garantiza un humano por economía."
    : "Solo cuentas verificadas con Orb pueden comprar y vender. Sin verificar puedes ver el mercado en modo lectura.";

  async function handleVerify() {
    if (!verifyOrb) {
      setErrMsg("Verificación no disponible en este contexto.");
      setPhase("error");
      return;
    }
    if (!userId) {
      setErrMsg("Sesión no detectada. Reabre la app.");
      setPhase("error");
      return;
    }
    setErrMsg(null);
    setPhase("verifying");
    try {
      const { success, proof } = await verifyOrb();
      if (!success || !proof) {
        setErrMsg("Verificación cancelada o no completada.");
        setPhase("error");
        return;
      }
      setPhase("saving");
      // userId va en el session token (Authorization Bearer), no en el body
      const sessionToken = (() => {
        try { return localStorage.getItem("h_session_token"); } catch { return null; }
      })();
      const res = await fetch("/api/verifyOrbStatus", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
        },
        body: JSON.stringify({ proof }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.success) {
        setErrMsg(json?.error || "El servidor no pudo confirmar la verificación.");
        setPhase("error");
        onMaybeNeedRefresh();
        return;
      }
      onSuccess();
    } catch (e: any) {
      setErrMsg(e?.message || "Error inesperado durante la verificación.");
      setPhase("error");
    }
  }

  const busy = phase === "verifying" || phase === "saving";

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={busy ? undefined : onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 1100,
        background: "rgba(0,0,0,0.62)",
        backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 18,
        animation: "tcFadeUp 220ms cubic-bezier(0.4, 0, 0.2, 1) both",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 420,
          background: bg, color: txt,
          border: `1px solid ${border}`, borderRadius: 24,
          padding: 24,
          boxShadow: "0 24px 60px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.05)",
          position: "relative",
        }}
      >
        {/* Cerrar */}
        {!busy && (
          <button
            onClick={onClose}
            aria-label="Cerrar"
            style={{
              position: "absolute", top: 12, right: 12,
              width: 32, height: 32, borderRadius: 999,
              background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
              border: "none", cursor: "pointer",
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              color: txt,
            }}
          >
            <X size={16} />
          </button>
        )}

        {/* Icono Orb halo */}
        <div style={{
          width: 84, height: 84, margin: "8px auto 16px",
          position: "relative",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{
            position: "absolute", inset: -14, borderRadius: "50%",
            background: "radial-gradient(circle, rgba(99,102,241,0.40), transparent 65%)",
            filter: "blur(14px)",
            animation: "tcPulse 2.6s ease-in-out infinite",
          }} />
          <div style={{
            width: 72, height: 72, borderRadius: 22,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "linear-gradient(135deg, #6366f1, #a855f7)",
            boxShadow: "0 12px 36px rgba(99,102,241,0.50), inset 0 1px 0 rgba(255,255,255,0.30)",
            border: "1px solid rgba(255,255,255,0.18)",
          }}>
            <ShieldCheck size={34} color="#fff" strokeWidth={2.4} />
          </div>
        </div>

        <h3 style={{
          textAlign: "center", fontSize: 19, fontWeight: 900, letterSpacing: -0.4,
          color: txt, marginBottom: 8,
        }}>
          {titleByIntent}
        </h3>
        <p style={{
          textAlign: "center", fontSize: 13.5, lineHeight: 1.55,
          color: txtSub, marginBottom: 20,
        }}>
          {subByIntent}
        </p>

        {/* Bullets de qué puedes seguir haciendo en modo lectura */}
        <div style={{
          background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
          border: `1px solid ${border}`, borderRadius: 14,
          padding: 12, marginBottom: 20,
          display: "flex", gap: 10, alignItems: "flex-start",
        }}>
          <Eye size={15} strokeWidth={2.4} style={{ marginTop: 2, color: txtSub, flexShrink: 0 }} />
          <div style={{ fontSize: 12.5, color: txtSub, lineHeight: 1.55 }}>
            <strong style={{ color: txt }}>Modo lectura:</strong> puedes ver el mercado, precios, gráficas y trades de cualquier Totem sin verificarte.
          </div>
        </div>

        {/* Error */}
        {phase === "error" && errMsg && (
          <div style={{
            background: "rgba(248,113,113,0.10)",
            border: "1px solid rgba(248,113,113,0.30)",
            color: "#fca5a5",
            borderRadius: 12, padding: "10px 12px", fontSize: 12.5,
            marginBottom: 14, display: "flex", gap: 8, alignItems: "flex-start",
          }}>
            <AlertCircle size={14} style={{ marginTop: 1, flexShrink: 0 }} />
            <span>{errMsg}</span>
          </div>
        )}

        {/* CTA */}
        <button
          onClick={handleVerify}
          disabled={busy}
          style={{
            width: "100%", padding: "14px 0",
            borderRadius: 14, border: "none",
            cursor: busy ? "wait" : "pointer",
            color: "#fff", fontWeight: 900, fontSize: 14, letterSpacing: -0.2,
            background: "linear-gradient(135deg, #6366f1, #a855f7)",
            boxShadow: busy ? "none" : "0 8px 24px rgba(99,102,241,0.40), inset 0 1px 0 rgba(255,255,255,0.22)",
            opacity: busy ? 0.75 : 1,
            transition: "all 220ms cubic-bezier(0.4, 0, 0.2, 1)",
            display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
            marginBottom: 8,
          }}
        >
          {phase === "verifying" && <><Loader2 size={15} className="tp-spin" /> Abriendo World App…</>}
          {phase === "saving"    && <><Loader2 size={15} className="tp-spin" /> Confirmando…</>}
          {(phase === "idle" || phase === "error") && <><ShieldCheck size={15} strokeWidth={2.6} /> {phase === "error" ? "Reintentar verificación" : "Verificar con Orb"}</>}
        </button>

        {/* Cancelar / seguir en modo lectura */}
        {!busy && (
          <button
            onClick={onClose}
            style={{
              width: "100%", padding: "10px 0",
              background: "transparent", border: "none",
              color: txtSub, fontSize: 12.5, fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Seguir en modo lectura
          </button>
        )}
      </div>
    </div>
  );
}

