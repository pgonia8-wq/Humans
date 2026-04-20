/**
 * TradeCenterPage.tsx — Overlay principal del Trade Center
 * 3 tabs: Mi Totem (dashboard), Mercado, Perfil de otro Totem
 */

import { useState, useContext } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, BarChart2, Globe } from "lucide-react";
import { ThemeContext } from "../../lib/ThemeContext";
import TotemDashboard from "./TotemDashboard";
import MarketPage from "./MarketPage";
import TotemProfilePage from "./TotemProfilePage";

interface Props {
  isOpen:        boolean;
  onClose:       () => void;
  userId:        string;
  walletAddress: string | null;
}

type Tab = "dashboard" | "market";

export default function TradeCenterPage({ isOpen, onClose, userId, walletAddress }: Props) {
  const { isDark } = useContext(ThemeContext);
  const [tab, setTab] = useState<Tab>("dashboard");
  const [viewingTotem, setViewingTotem] = useState<string | null>(null);

  const bg     = isDark ? "#0f0f0f" : "#f8f8f8";
  const border = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
  const txt    = isDark ? "#e5e7eb" : "#111827";
  const sub    = isDark ? "rgba(255,255,255,0.40)" : "rgba(0,0,0,0.40)";

  const tabBtn = (active: boolean) => ({
    display: "flex", alignItems: "center", gap: 5,
    padding: "6px 14px", borderRadius: 10, fontSize: 12, fontWeight: 700,
    cursor: "pointer", transition: "all 0.2s", border: "none",
    background: active ? (isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.08)") : "transparent",
    color: active ? txt : sub,
  } as React.CSSProperties);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="trade-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: "fixed", inset: 0, zIndex: 9000,
            background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)",
            display: "flex", alignItems: "flex-end", justifyContent: "center",
          }}
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            style={{
              width: "100%", maxWidth: 480,
              height: "92vh",
              background: bg,
              borderRadius: "24px 24px 0 0",
              border: `1px solid ${border}`,
              display: "flex", flexDirection: "column",
              overflow: "hidden",
            }}
          >
            {/* Header */}
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "14px 16px 10px",
              borderBottom: `1px solid ${border}`,
              flexShrink: 0,
            }}>
              <BarChart2 style={{ width: 16, height: 16, color: "#6366f1", flexShrink: 0 }} />

              {/* Tabs */}
              <div style={{ display: "flex", gap: 2, flex: 1 }}>
                <button style={tabBtn(tab === "dashboard" && !viewingTotem)}
                  onClick={() => { setTab("dashboard"); setViewingTotem(null); }}>
                  <BarChart2 style={{ width: 12, height: 12 }} />
                  Mi Totem
                </button>
                <button style={tabBtn(tab === "market" && !viewingTotem)}
                  onClick={() => { setTab("market"); setViewingTotem(null); }}>
                  <Globe style={{ width: 12, height: 12 }} />
                  Mercado
                </button>
              </div>

              {viewingTotem && (
                <span style={{ fontSize: 11, fontWeight: 800, color: sub }}>
                  Perfil Totem
                </span>
              )}

              <button onClick={onClose}
                style={{ padding: "6px", borderRadius: 10, cursor: "pointer",
                  color: sub, background: "transparent", border: "none", flexShrink: 0 }}>
                <X style={{ width: 16, height: 16 }} />
              </button>
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
              <AnimatePresence mode="wait">
                {viewingTotem ? (
                  <motion.div key="profile"
                    initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                    <TotemProfilePage
                      address={viewingTotem}
                      userId={userId}
                      isDark={isDark}
                      walletAddress={walletAddress}
                      onBack={() => setViewingTotem(null)}
                    />
                  </motion.div>
                ) : tab === "dashboard" ? (
                  <motion.div key="dashboard"
                    initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
                    <TotemDashboard
                      userId={userId}
                      walletAddress={walletAddress}
                      isDark={isDark}
                      onViewMarket={() => setTab("market")}
                    />
                  </motion.div>
                ) : (
                  <motion.div key="market"
                    initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
                    <MarketPage
                      isDark={isDark}
                      onSelectTotem={addr => setViewingTotem(addr)}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
