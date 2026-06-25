/**
 * TradeShell — Nuevo shell fullscreen del centro de trading.
 *
 * Drop-in replacement de TradeCenterPage.tsx (API idéntica de props).
 * Estética clonada del referente `Humans/token/`: dark pleno, framer-motion
 * AnimatePresence, bottom tabs, transiciones suaves. Montado encima del
 * backend existente (mirrors C1–C20 + endpoints INTOCABLES).
 *
 * REGLAS:
 *   • ONCHAIN WINS: este shell SOLO lee del backend y dispara
 *     MiniKit.sendTransaction (vía TradePanel/BuySellFullscreen existentes).
 *   • Solo Orb-verified escribe (create/trade) — gate centralizado aquí.
 *   • Session token (HMAC) se envía automático por tradeApi.authHeaders.
 */
import { lazy, Suspense, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ShellProvider, useShell } from "./context/ShellContext";
import BottomTabBar from "./components/BottomTabBar";
import SystemOverlay from "./components/SystemOverlay";

// Cada pantalla se descarga bajo demanda — al abrir el shell solo viaja el
// core + Discovery. Token/Creator/Profile viajan cuando el usuario navega.
const DiscoveryPage    = lazy(() => import("./pages/DiscoveryPage"));
const TokenPage        = lazy(() => import("./pages/TokenPage"));
const CreatorDashboard = lazy(() => import("./pages/CreatorDashboard"));
const ProfilePage      = lazy(() => import("./pages/ProfilePage"));

function ScreenFallback() {
  return (
    <div className="absolute inset-0 flex items-center justify-center"
      style={{ color: "rgba(255,255,255,0.35)" }}>
      <span className="text-xs">Cargando…</span>
    </div>
  );
}

interface Props {
  isOpen:        boolean;
  onClose:       () => void;
  userId:        string;
  walletAddress: string | null;
  verifyOrb:     () => Promise<void>;
  isOrbVerified: boolean;
  onOrbVerifiedChange: (v: boolean) => void;
  // Campos opcionales aceptados por compatibilidad (no usados aquí).
  userBalanceWld?: number;
}

export default function TradeShell(props: Props) {
  const {
    isOpen, onClose, userId, walletAddress, verifyOrb,
    isOrbVerified, onOrbVerifiedChange,
  } = props;

  // Bloquear scroll del body cuando el shell está abierto.
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <ShellProvider
      userId={userId}
      walletAddress={walletAddress}
      isOrbVerified={isOrbVerified}
      verifyOrb={verifyOrb}
      onOrbVerifiedChange={onOrbVerifiedChange}
      onClose={onClose}
    >
      <ShellBody />
    </ShellProvider>
  );
}

function ShellBody() {
    const { screen, onClose } = useShell();

    // System Overlay (Cmd/Ctrl+K). Permanece dentro del shell para no
    // afectar el contrato de props del componente.
    const [sysOpen, setSysOpen] = useState(false);
    useEffect(() => {
      function onKey(e: KeyboardEvent) {
        if (e.key === "Escape") setSysOpen(false);
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
          e.preventDefault();
          setSysOpen((v) => !v);
        }
      }
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }, []);

    return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9990]"
        style={{ background: "rgba(0,0,0,0.78)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      />
      {/* Shell */}
      <motion.div
        initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 24 }}
        className="fixed inset-0 z-[9991] flex items-stretch justify-center"
        style={{ pointerEvents: "none" }}
      >
        <div
          className="w-full max-w-md h-[100dvh] relative overflow-hidden"
          style={{
            pointerEvents: "auto",
            background: "linear-gradient(180deg, #0a0a0c 0%, #0f0f12 60%, #0a0a0c 100%)",
            borderLeft:  "1px solid rgba(255,255,255,0.06)",
            borderRight: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          {/* ── Botón volver al feed ── */}
            <button
              onClick={onClose}
              aria-label="Volver al feed"
              className="absolute top-3 left-3 z-[9100] flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-bold backdrop-blur-md transition active:scale-95"
              style={{
                letterSpacing: "0.06em",
                color: "rgba(255,255,255,0.85)",
                background: "linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)",
                border: "1px solid rgba(255,255,255,0.12)",
                boxShadow: "0 8px 24px -10px rgba(0,0,0,0.6)",
              }}
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Volver
            </button>

          {/* Floating "Sistema ⌘K" trigger */}
            <button
              onClick={() => setSysOpen(true)}
              aria-label="Abrir estado del sistema"
              className="absolute top-3 right-3 z-[9100] flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-bold uppercase backdrop-blur-md transition active:scale-95"
              style={{
                letterSpacing: "0.12em",
                color: "rgba(255,255,255,0.85)",
                background: "linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)",
                border: "1px solid rgba(255,255,255,0.12)",
                boxShadow: "0 8px 24px -10px rgba(0,0,0,0.6)",
              }}
            >
              <span style={{
                display: "inline-block", width: 6, height: 6, borderRadius: 999,
                background: "#a78bfa", boxShadow: "0 0 8px #a78bfa",
              }} />
              Sistema
              <span className="opacity-50">⌘K</span>
            </button>

            {/* System Overlay (Cmd/Ctrl+K) */}
            <SystemOverlay open={sysOpen} onClose={() => setSysOpen(false)} />

            <Suspense fallback={<ScreenFallback />}>
            <AnimatePresence mode="wait">
              {screen === "discovery" && (
                <motion.div key="discovery"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="absolute inset-0">
                  <DiscoveryPage />
                </motion.div>
              )}
              {screen === "token" && (
                <motion.div key="token"
                  initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 30 }}
                  transition={{ duration: 0.22 }}
                  className="absolute inset-0">
                  <TokenPage />
                </motion.div>
              )}
              {screen === "creator" && (
                <motion.div key="creator"
                  initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 30 }}
                  className="absolute inset-0">
                  <CreatorDashboard />
                </motion.div>
              )}
              {screen === "profile" && (
                <motion.div key="profile"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="absolute inset-0">
                  <ProfilePage />
                </motion.div>
              )}
            </AnimatePresence>
          </Suspense>

          <BottomTabBar />
        </div>
      </motion.div>
    </>
  );
}
