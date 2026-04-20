/**
 * TradeCenterPage — FASE 1: Shell premium fullscreen + 8 patches
 *
 * Sistema visual: idéntico a FeedPage / HomePage
 * - Backdrop: blur(14px) + rgba(0,0,0,0.78)
 * - Modal: gradient 160deg #2c2c2c → #1a1a1a → #0f0f0f + inset shadows del sistema
 * - Tabs pill: gradient indigo→purple en activo
 * - Animación spring-out via cubic-bezier(0.34, 1.56, 0.64, 1)
 *
 * Sin lógica de trading. Sin charts. Solo estructura + identidad visual.
 */

import { useState, useEffect } from "react";
import { X, Sparkles, Plus, ArrowRight, Store } from "lucide-react";
import { useTheme } from "../../lib/ThemeContext";
import MarketPage from "./MarketPage";

// ── Tabs ────────────────────────────────────────────────────────────────────
type Tab = "totem" | "market";

interface Props {
  isOpen:        boolean;
  onClose:       () => void;
  userId:        string;
  walletAddress?: string | null;
}

// ════════════════════════════════════════════════════════════════════════════
//  COMPONENTE
// ════════════════════════════════════════════════════════════════════════════
export default function TradeCenterPage({ isOpen, onClose, userId, walletAddress }: Props) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [tab, setTab] = useState<Tab>("totem");

  // Bloquear scroll del body cuando overlay abierto
  useEffect(() => {
    if (!isOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = original; };
  }, [isOpen]);

  // Cerrar con Escape
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // ── Tokens del sistema ────────────────────────────────────────────────────
  const txt        = isDark ? "#ffffff"   : "#111827";
  const txtMuted   = isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.40)";

  // FIX 1 — Modal premium con gradient OFICIAL del sistema
  const modalStyle: React.CSSProperties = isDark ? {
    background: "linear-gradient(160deg, #2c2c2c 0%, #1a1a1a 45%, #0f0f0f 100%)",
    border:     "1px solid rgba(255,255,255,0.13)",
    boxShadow:  "0 -8px 40px rgba(0,0,0,0.85), inset 0 1px 0 rgba(255,255,255,0.22), inset 0 -1px 0 rgba(0,0,0,0.45)",
  } : {
    background: "#ffffff",
    border:     "1px solid rgba(0,0,0,0.06)",
    boxShadow:  "0 -8px 40px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.80)",
  };

  return (
    <>
      <style>{KEYFRAMES}</style>

      {/* ─── BACKDROP (FIX 6: target===currentTarget guard) ─────────────── */}
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

        {/* FIX 8 — Drag handle con hover opacity 0.6 → 1.0 */}
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
          padding: "14px 18px 8px",
        }}>
          {/* IZQUIERDA: cerrar (FIX 3 — glass real con hover de brillo) */}
          <button
            onClick={onClose}
            aria-label="Cerrar"
            onMouseEnter={(e) => applyGlassHover(e, isDark, true)}
            onMouseLeave={(e) => applyGlassHover(e, isDark, false)}
            onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.94)")}
            onMouseUp={(e)   => (e.currentTarget.style.transform = "scale(1)")}
            style={{
              ...glassButtonStyle(isDark),
              width: 38, height: 38, borderRadius: 12,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <X size={18} strokeWidth={2.4} color={txt} />
          </button>

          {/* CENTRO (FIX 2 — header con peso financiero) */}
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center", lineHeight: 1.05,
          }}>
            <span style={{
              fontSize: 10, fontWeight: 600, letterSpacing: 1.5,
              color: txtMuted, textTransform: "uppercase",
            }}>
              {tab === "totem" ? "Mi Totem" : "Mercado"}
            </span>
            <span style={{
              fontSize: 20, fontWeight: 900, color: txt, marginTop: 3,
              letterSpacing: -0.4, fontVariantNumeric: "tabular-nums",
            }}>
              $0.0000
            </span>
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 3,
              fontSize: 11, fontWeight: 700, marginTop: 2,
              color: "#22c55e", opacity: 0.85,
              fontVariantNumeric: "tabular-nums",
            }}>
              ↑ 0.00%
            </span>
          </div>

          {/* DERECHA: spacer para mantener título centrado (38px = ancho del botón close) */}
          <div style={{ width: 38, height: 38 }} aria-hidden="true" />
        </header>

        {/* ─── TABS PILL (FIX 4 — wrapper glass real) ─────────────────── */}
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

        {/* ─── CONTENIDO (scroll) ─────────────────────────────────────── */}
        <main style={{
          flex: 1, overflowY: "auto", overflowX: "hidden",
          WebkitOverflowScrolling: "touch",
          padding: "8px 18px 32px",
        }}>
          {tab === "totem"
            ? <TotemEmptyState isDark={isDark} onGoToMarket={() => setTab("market")} />
            : <MarketPage
                isDark={isDark}
                onSelectTotem={(addr) => {
                  // Phase 4: abrirá TotemDashboard. Por ahora log + no-op.
                  // eslint-disable-next-line no-console
                  console.log("[TradeCenter] select totem:", addr);
                }}
              />}
        </main>

        {/* Footer hairline */}
        <div style={{
          height: 1,
          background: isDark
            ? "linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)"
            : "linear-gradient(90deg, transparent, rgba(0,0,0,0.05), transparent)",
        }} />

        {/* userId/walletAddress disponibles para fases siguientes */}
        <span style={{ display: "none" }} data-uid={userId} data-wallet={walletAddress ?? ""} />
      </div>
    </>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  SUBCOMPONENTES
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

function TotemEmptyState({ isDark, onGoToMarket }: { isDark: boolean; onGoToMarket: () => void }) {
  const txt    = isDark ? "#ffffff" : "#111827";
  const txtSub = isDark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.55)";

  return (
    <div style={{
      minHeight: "60vh",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      textAlign: "center", padding: "20px 24px",
      animation: "tcFadeUp 420ms cubic-bezier(0.4, 0, 0.2, 1) both",
    }}>
      {/* Icono con halo (FIX 5 — vivo: scale 1 → 1.04) */}
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
        Crea tu Totem para participar en el mercado y empezar a operar tu propia economía.
      </p>

      {/* CTA principal */}
      <button
        onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.97)")}
        onMouseUp={(e)   => (e.currentTarget.style.transform = "scale(1)")}
        onMouseLeave={(e)=> (e.currentTarget.style.transform = "scale(1)")}
        style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          padding: "14px 24px",
          borderRadius: 16,
          border: "1px solid rgba(255,255,255,0.18)",
          background:  "linear-gradient(135deg, #6366f1, #a855f7)",
          boxShadow:   "0 4px 20px rgba(99,102,241,0.40), inset 0 1px 0 rgba(255,255,255,0.22), inset 0 -1px 0 rgba(0,0,0,0.18)",
          color: "#ffffff",
          fontSize: 14, fontWeight: 800, letterSpacing: -0.1,
          cursor: "pointer",
          transition: "transform 160ms cubic-bezier(0.4, 0, 0.2, 1)",
          marginBottom: 14,
        }}
      >
        <Plus size={16} strokeWidth={2.6} />
        Crear mi Totem
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
          background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
          border:     isDark ? "1px solid rgba(255,255,255,0.10)" : "1px solid rgba(0,0,0,0.08)",
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

function MarketPlaceholder({ isDark }: { isDark: boolean }) {
  const txt    = isDark ? "#ffffff" : "#111827";
  const txtSub = isDark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.55)";

  return (
    <div style={{
      minHeight: "60vh",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      textAlign: "center", padding: "20px 24px",
      animation: "tcFadeUp 420ms cubic-bezier(0.4, 0, 0.2, 1) both",
    }}>
      <div style={{
        width: 96, height: 96, borderRadius: 28, marginBottom: 24,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "linear-gradient(160deg, #2c2c2c 0%, #1a1a1a 45%, #0f0f0f 100%)",
        boxShadow: "0 12px 40px rgba(0,0,0,0.50), inset 0 1px 0 rgba(255,255,255,0.18)",
        border: "1px solid rgba(255,255,255,0.10)",
      }}>
        <Store size={40} color="#fff" strokeWidth={2.2} />
      </div>

      <h2 style={{ fontSize: 22, fontWeight: 900, letterSpacing: -0.4, color: txt, marginBottom: 8 }}>
        Mercado
      </h2>
      <p style={{ fontSize: 13, color: txtSub, lineHeight: 1.55, maxWidth: 280 }}>
        El listado de Totems aparecerá aquí.
      </p>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  HELPERS
// ════════════════════════════════════════════════════════════════════════════

function glassButtonStyle(isDark: boolean): React.CSSProperties {
  return {
    background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)",
    border:     isDark ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(0,0,0,0.08)",
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
    boxShadow: isDark
      ? "inset 0 1px 0 rgba(255,255,255,0.10), 0 2px 8px rgba(0,0,0,0.30)"
      : "inset 0 1px 0 rgba(255,255,255,0.80), 0 2px 8px rgba(0,0,0,0.06)",
    cursor: "pointer",
    transition: "all 180ms cubic-bezier(0.4, 0, 0.2, 1)",
  };
}

function applyGlassHover(e: React.MouseEvent<HTMLButtonElement>, isDark: boolean, on: boolean) {
  const el = e.currentTarget;
  el.style.background = on
    ? (isDark ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.07)")
    : (isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)");
  el.style.boxShadow = on
    ? (isDark
        ? "inset 0 1px 0 rgba(255,255,255,0.18), 0 4px 16px rgba(255,255,255,0.08), 0 2px 8px rgba(0,0,0,0.40)"
        : "inset 0 1px 0 rgba(255,255,255,0.90), 0 4px 16px rgba(0,0,0,0.10)")
    : (isDark
        ? "inset 0 1px 0 rgba(255,255,255,0.10), 0 2px 8px rgba(0,0,0,0.30)"
        : "inset 0 1px 0 rgba(255,255,255,0.80), 0 2px 8px rgba(0,0,0,0.06)");
}

const KEYFRAMES = `
  @keyframes tcFadeIn  { from { opacity: 0 } to { opacity: 1 } }
  @keyframes tcSlideUp {
    from { transform: translateY(110%); opacity: 0; }
    to   { transform: translateY(0);    opacity: 1; }
  }
  @keyframes tcFadeUp {
    from { transform: translateY(12px); opacity: 0; }
    to   { transform: translateY(0);    opacity: 1; }
  }
  @keyframes tcPulse {
    0%, 100% { opacity: 0.60; transform: scale(1); }
    50%      { opacity: 1.00; transform: scale(1.04); }
  }
`;
