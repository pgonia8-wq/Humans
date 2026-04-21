/**
 * BuySellFullscreen.tsx — overlay fullscreen estilo Bloomberg para Buy/Sell.
 *
 * REUSA TradePanel sin modificarlo (props intactas). Solo lo envuelve en un
 * overlay fixed inset 0 con header/cierre y un cuerpo scrolleable. El resto
 * (preview, sendTransaction, executeTrade, success overlay, toast) lo
 * controla TradePanel internamente — esa lógica NO se toca.
 */

import { X } from "lucide-react";
import TradePanel from "./TradePanel";

interface Props {
  isDark:        boolean;
  totemAddress:  string;
  totemName:     string;
  totemPrice:    number;
  userId:        string;
  walletAddress: string;
  canTrade:      boolean;
  onRequestVerify?: () => void;
  onClose:       () => void;
  onTradeSuccess?: (kind: "buy" | "sell", newPrice: number, newSupply: number) => void;
  initialSide?:  "buy" | "sell";
}

export default function BuySellFullscreen({
  isDark, totemAddress, totemName, totemPrice, userId, walletAddress,
  canTrade, onRequestVerify, onClose, onTradeSuccess,
}: Props) {
  const bg     = isDark
    ? "linear-gradient(180deg, #0a0a0c 0%, #111113 100%)"
    : "linear-gradient(180deg, #fafafa 0%, #ffffff 100%)";
  const txt    = isDark ? "#ffffff" : "#0b0b0f";
  const txtSub = isDark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.55)";
  const txtMt  = isDark ? "rgba(255,255,255,0.32)" : "rgba(0,0,0,0.40)";
  const bdr    = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";

  return (
    <div
      role="dialog" aria-modal="true" aria-label={`Operar ${totemName}`}
      style={{
        position: "fixed", inset: 0, zIndex: 11000,
        background: bg, color: txt,
        display: "flex", flexDirection: "column",
        animation: "bsfIn 220ms cubic-bezier(0.4, 0, 0.2, 1) both",
      }}
    >
      {/* ── HEADER STICKY ───────────────────────────────────────────────── */}
      <header
        style={{
          flexShrink: 0,
          padding: "calc(env(safe-area-inset-top) + 10px) 16px 12px",
          borderBottom: `1px solid ${bdr}`,
          background: isDark ? "rgba(10,10,12,0.85)" : "rgba(255,255,255,0.85)",
          backdropFilter: "blur(14px) saturate(160%)",
          WebkitBackdropFilter: "blur(14px) saturate(160%)",
          display: "flex", alignItems: "center", gap: 12,
        }}
      >
        <button
          onClick={onClose}
          aria-label="Cerrar"
          style={{
            width: 38, height: 38, borderRadius: 12,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
            border: `1px solid ${bdr}`,
            color: txt, cursor: "pointer", flexShrink: 0,
          }}
        >
          <X size={16} strokeWidth={2.6} />
        </button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 9, fontWeight: 800, color: txtMt, letterSpacing: 1.6,
            textTransform: "uppercase",
          }}>
            OPERAR · MARKET ORDER
          </div>
          <div style={{
            fontSize: 16, fontWeight: 900, letterSpacing: -0.3,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            marginTop: 1,
          }}>
            {totemName}
          </div>
        </div>

        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{
            fontSize: 9, fontWeight: 800, color: txtMt, letterSpacing: 1.4,
          }}>
            LAST · WLD
          </div>
          <div style={{
            fontSize: 15, fontWeight: 900, letterSpacing: -0.4,
            fontVariantNumeric: "tabular-nums",
          }}>
            {fmtPrice(totemPrice)}
          </div>
        </div>
      </header>

      {/* ── BODY SCROLLABLE ──────────────────────────────────────────────── */}
      <div
        style={{
          flex: 1, overflowY: "auto",
          padding: "16px 14px calc(env(safe-area-inset-bottom) + 24px)",
        }}
      >
        <div style={{
          maxWidth: 520, margin: "0 auto",
        }}>
          <TradePanel
            totemAddress={totemAddress}
            totemName={totemName}
            userId={userId}
            isDark={isDark}
            walletAddress={walletAddress}
            canTrade={canTrade}
            onRequestVerify={onRequestVerify}
            onTradeSuccess={(kind, newPrice, newSupply) => {
              onTradeSuccess?.(kind, newPrice, newSupply);
            }}
            currentPriceWld={totemPrice}
            // prevEmaWei + lastUpdateUnix se cablean cuando ANTI_MANIP_ADDRESS
            // esté deployado (lectura RPC). Por ahora "0" → cold-start advisory.
          />

          <div style={{
            marginTop: 14, padding: "10px 12px",
            background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)",
            border: `1px solid ${bdr}`,
            borderRadius: 12,
            fontSize: 10.5, color: txtSub, lineHeight: 1.5, letterSpacing: 0.1,
          }}>
            Las previews son advisory. El contrato on-chain (World Chain) es la
            fuente de verdad final. Tu wallet firmará la transacción y el backend
            validará el txHash antes de persistir.
          </div>
        </div>
      </div>

      <style>{`
        @keyframes bsfIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
      `}</style>
    </div>
  );
}

function fmtPrice(p: number): string {
  if (!isFinite(p) || p === 0) return "0.0000";
  if (p >= 1)      return p.toFixed(4);
  if (p >= 0.0001) return p.toFixed(6);
  return p.toExponential(3);
}
