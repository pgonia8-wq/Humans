/**
 * TradePanel.tsx — Panel de compra/venta con MiniKit.commandsAsync.sendTransaction
 *
 * BUY:  approve(bondingCurve, wldIn) + bondingCurve.buy(totem, wldIn, minTokens)
 *       → MiniKit.commandsAsync.sendTransaction (batch de 2 txs)
 *       → txHash → POST /api/market/execute → backend verifica on-chain
 *
 * SELL: bondingCurve.sell(totem, tokensIn, minWldOut)
 *       → MiniKit.commandsAsync.sendTransaction (1 tx)
 *       → txHash → POST /api/market/execute → backend verifica on-chain
 *
 * El contrato TotemBondingCurve ES la fuente de verdad.
 * El backend SOLO verifica, valida y persiste (nunca transfiere).
 */

import { useState, useEffect, useCallback } from "react";
import { MiniKit, tokenToDecimals, Tokens } from "@worldcoin/minikit-js";
import { ArrowUpDown, TrendingUp, TrendingDown } from "lucide-react";
import { buyPreview, sellPreview, executeTrade, type BuyPreview, type SellPreviewResult } from "../../../lib/tradeApi";

// ── Env vars ────────────────────────────────────────────────────────────────
const BONDING_CURVE_ADDRESS = import.meta.env.VITE_BONDING_CURVE_ADDRESS || "";
const WLD_ADDRESS           = "0x2cFc85d8E48F8EaB294be644d9E25C3030863003";

// ── ABIs mínimos para sendTransaction ───────────────────────────────────────
const WLD_ABI = [
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs:  [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

const CURVE_ABI = [
  {
    name: "buy",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "totem",        type: "address" },
      { name: "amountWldIn",  type: "uint256" },
      { name: "minTokensOut", type: "uint256" },
    ],
    outputs: [],
  },
  {
    name: "sell",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "totem",     type: "address" },
      { name: "tokensIn",  type: "uint256" },
      { name: "minWldOut", type: "uint256" },
    ],
    outputs: [],
  },
] as const;

// ── Tipos ────────────────────────────────────────────────────────────────────
interface Props {
  totemAddress: string;
  totemName:    string;
  userId:       string;
  isDark:       boolean;
  walletAddress?: string | null;
  onTradeSuccess: (type: "buy" | "sell", newPrice: number, newSupply: number) => void;
}

type Tab = "buy" | "sell";

interface Msg { kind: "ok" | "err" | "warn"; text: string }

// ── Helpers ──────────────────────────────────────────────────────────────────
function toWei(wld: number): bigint {
  return BigInt(Math.floor(wld * 1e18));
}

function withSlippage(value: bigint, pct: number): bigint {
  return (value * BigInt(Math.floor((1 - pct) * 10000))) / 10000n;
}

// ── Componente ───────────────────────────────────────────────────────────────
export default function TradePanel({
  totemAddress, totemName, userId, isDark, walletAddress, onTradeSuccess,
}: Props) {
  const [tab,          setTab]          = useState<Tab>("buy");
  const [amount,       setAmount]       = useState("");
  const [tokenInput,   setTokenInput]   = useState("");
  const [buyPrev,      setBuyPrev]      = useState<BuyPreview | null>(null);
  const [sellPrev,     setSellPrev]     = useState<SellPreviewResult | null>(null);
  const [loading,      setLoading]      = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);   // C3: anti-doble-clic
  const [prevLoading,  setPrevLoading]  = useState(false);
  const [msg,          setMsg]          = useState<Msg | null>(null);

  const showMsg = useCallback((kind: Msg["kind"], text: string) => {
    setMsg({ kind, text });
    setTimeout(() => setMsg(null), 5000);
  }, []);

  // ── Preview BUY ────────────────────────────────────────────────────────────
  useEffect(() => {
    const v = parseFloat(amount);
    if (!v || v <= 0) { setBuyPrev(null); return; }
    const timer = setTimeout(async () => {
      setPrevLoading(true);
      try {
        const p = await buyPreview(totemAddress, v);
        setBuyPrev(p);
      } catch {
        setBuyPrev(null);
      } finally {
        setPrevLoading(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [amount, totemAddress]);

  // ── Preview SELL ───────────────────────────────────────────────────────────
  useEffect(() => {
    const t = parseInt(tokenInput);
    if (!t || t <= 0) { setSellPrev(null); return; }
    const timer = setTimeout(async () => {
      if (!walletAddress) return;
      setPrevLoading(true);
      try {
        const p = await sellPreview(totemAddress, t, walletAddress, userId);
        setSellPrev(p);
      } catch (err: any) {
        showMsg("warn", err.message ?? "Error al calcular preview");
        setSellPrev(null);
      } finally {
        setPrevLoading(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [tokenInput, totemAddress, walletAddress, userId, showMsg]);

  // ── Genera txHash para modo dev (sin contrato desplegado) ────────────────
  function devTxHash(): string {
    return "0xdev" + Math.random().toString(16).slice(2).padEnd(60, "0").slice(0, 60);
  }

  // ── BUY: modo producción → sendTransaction, modo dev → hash simulado ───────
  async function handleBuy() {
    if (isSubmitting) return;                                  // C3: anti-doble-clic
    if (!MiniKit.isInstalled()) {
      showMsg("err", "Abre la app dentro de World App"); return;
    }
    const wld = parseFloat(amount);
    if (!wld || wld <= 0) { showMsg("err", "Ingresa un monto WLD válido"); return; }
    if (!buyPrev)          { showMsg("err", "Espera el preview antes de comprar"); return; }

    setIsSubmitting(true);
    setLoading(true);
    setMsg(null);

    try {
      let txHash: string;

      if (BONDING_CURVE_ADDRESS) {
        // ── MODO PRODUCCIÓN: transacción real on-chain ──────────────────
        const wldWei       = toWei(wld);
        const minTokensOut = withSlippage(BigInt(Math.floor(buyPrev.tokensOut)), 0.05);

        const { finalPayload } = await MiniKit.commandsAsync.sendTransaction({
          transaction: [
            {
              address:      WLD_ADDRESS,
              abi:          WLD_ABI,
              functionName: "approve",
              args:         [BONDING_CURVE_ADDRESS, wldWei.toString()],
            },
            {
              address:      BONDING_CURVE_ADDRESS,
              abi:          CURVE_ABI,
              functionName: "buy",
              args:         [totemAddress, wldWei.toString(), minTokensOut.toString()],
            },
          ],
        });

        if (!finalPayload || finalPayload.status !== "success") {
          showMsg("err", "Transacción cancelada o fallida en World App");
          return;
        }
        txHash = finalPayload.transaction_id as string;
      } else {
        // ── MODO DEV/SIMULACIÓN: hash ficticio, contrato no desplegado ──
        txHash = devTxHash();
      }

      // Backend: verifica on-chain (prod) o persiste con estimados (dev)
      const result = await executeTrade({
        txHash,
        type:             "buy",
        totemAddress,
        userId,
        walletAddress:    walletAddress ?? "",
        estimatedWld:     wld,
        estimatedTokens:  buyPrev.tokensOut,
      });

      showMsg("ok", `✓ Compraste ${result.tokenAmount?.toLocaleString()} tokens de ${totemName}`);
      setAmount("");
      setBuyPrev(null);
      onTradeSuccess("buy", result.newPrice, result.newSupply);

    } catch (err: any) {
      showMsg("err", err.message ?? "Error al procesar compra");
    } finally {
      setLoading(false);
      setIsSubmitting(false);                                  // C3: liberar lock
    }
  }

  // ── SELL: modo producción → sendTransaction, modo dev → hash simulado ──────
  async function handleSell() {
    if (isSubmitting) return;                                  // C3: anti-doble-clic
    if (!MiniKit.isInstalled()) {
      showMsg("err", "Abre la app dentro de World App"); return;
    }
    if (!walletAddress) { showMsg("err", "Wallet no conectada"); return; }

    const tokensIn = parseInt(tokenInput);
    if (!tokensIn || tokensIn <= 0) { showMsg("err", "Ingresa cantidad de tokens válida"); return; }
    if (!sellPrev)                  { showMsg("err", "Espera el preview antes de vender"); return; }

    setIsSubmitting(true);
    setLoading(true);
    setMsg(null);

    try {
      let txHash: string;

      if (BONDING_CURVE_ADDRESS) {
        // ── MODO PRODUCCIÓN: transacción real on-chain ────────────────────
        const minWldOut = withSlippage(toWei(sellPrev.wldOut), 0.05);

        const { finalPayload } = await MiniKit.commandsAsync.sendTransaction({
          transaction: [
            {
              address:      BONDING_CURVE_ADDRESS,
              abi:          CURVE_ABI,
              functionName: "sell",
              args:         [totemAddress, tokensIn.toString(), minWldOut.toString()],
            },
          ],
        });

        if (!finalPayload || finalPayload.status !== "success") {
          showMsg("err", "Transacción cancelada o fallida en World App");
          return;
        }
        txHash = finalPayload.transaction_id as string;
      } else {
        // ── MODO DEV/SIMULACIÓN: hash ficticio ────────────────────────────
        txHash = devTxHash();
      }

      // Backend: verifica on-chain (prod) o persiste con estimados (dev)
      const result = await executeTrade({
        txHash,
        type:             "sell",
        totemAddress,
        userId,
        walletAddress,
        estimatedWld:     sellPrev!.wldOut,
        estimatedTokens:  tokensIn,
      });

      showMsg("ok", `✓ Vendiste ${tokensIn.toLocaleString()} tokens · Recibiste ≈${result.wldAmount?.toFixed(6)} WLD`);
      setTokenInput("");
      setSellPrev(null);
      onTradeSuccess("sell", result.newPrice, result.newSupply);

    } catch (err: any) {
      showMsg("err", err.message ?? "Error al procesar venta");
    } finally {
      setLoading(false);
      setIsSubmitting(false);                                  // C3: liberar lock
    }
  }

  // ── Estilos ──────────────────────────────────────────────────────────────
  const bg     = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)";
  const border = isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.10)";
  const txt    = isDark ? "#e5e7eb" : "#111827";
  const sub    = isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.45)";
  const inp    = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)";
  const inpBorder = isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)";

  const tabActive = (active: boolean) => ({
    flex: 1, padding: "7px 0", borderRadius: 10, fontSize: 12, fontWeight: 700,
    cursor: "pointer", transition: "all 0.2s",
    background: active ? (tab === "buy" ? "#16a34a" : "#dc2626") : "transparent",
    color:      active ? "#fff" : sub,
    border: "none",
  } as React.CSSProperties);

  const msgColor = msg?.kind === "ok" ? "#16a34a" : msg?.kind === "warn" ? "#f59e0b" : "#dc2626";

  return (
    <div style={{ background: bg, borderRadius: 16, border: `1px solid ${border}`, padding: 16 }}>
      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 14,
        background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)",
        borderRadius: 12, padding: 4 }}>
        <button style={tabActive(tab === "buy")}  onClick={() => { setTab("buy");  setMsg(null); }}>
          <TrendingUp  style={{ width: 11, height: 11, display: "inline", marginRight: 4 }} />
          Comprar
        </button>
        <button style={tabActive(tab === "sell")} onClick={() => { setTab("sell"); setMsg(null); }}>
          <TrendingDown style={{ width: 11, height: 11, display: "inline", marginRight: 4 }} />
          Vender
        </button>
      </div>

      {/* Input */}
      {tab === "buy" ? (
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 11, color: sub, display: "block", marginBottom: 4 }}>
            WLD a invertir
          </label>
          <div style={{ position: "relative" }}>
            <input
              type="number" min="0" step="0.001"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0.000"
              style={{
                width: "100%", padding: "10px 46px 10px 12px",
                borderRadius: 10, border: `1px solid ${inpBorder}`,
                background: inp, color: txt, fontSize: 15, fontWeight: 700,
                outline: "none", boxSizing: "border-box",
              }}
            />
            <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
              fontSize: 11, fontWeight: 800, color: sub }}>WLD</span>
          </div>
        </div>
      ) : (
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 11, color: sub, display: "block", marginBottom: 4 }}>
            Tokens a vender
          </label>
          <input
            type="number" min="0" step="1"
            value={tokenInput}
            onChange={e => setTokenInput(e.target.value)}
            placeholder="0"
            style={{
              width: "100%", padding: "10px 12px",
              borderRadius: 10, border: `1px solid ${inpBorder}`,
              background: inp, color: txt, fontSize: 15, fontWeight: 700,
              outline: "none", boxSizing: "border-box",
            }}
          />
        </div>
      )}

      {/* Preview */}
      {prevLoading && (
        <div style={{ fontSize: 11, color: sub, marginBottom: 10, textAlign: "center" }}>
          Calculando…
        </div>
      )}

      {tab === "buy" && buyPrev && !prevLoading && (
        <div style={{ background: isDark ? "rgba(22,163,74,0.10)" : "rgba(22,163,74,0.07)",
          borderRadius: 10, padding: "10px 12px", marginBottom: 12 }}>
          <Row label="Tokens estimados"  value={buyPrev.tokensOut.toLocaleString()}     sub={sub} txt={txt} />
          <Row label="Precio estimado"   value={`${buyPrev.priceAfter.toFixed(8)} WLD`} sub={sub} txt={txt} />
          <Row label="Fee (2%)"          value={`${buyPrev.fee.toFixed(6)} WLD`}        sub={sub} txt={txt} />
          <Row label="Slippage máx"      value="5%"                                      sub={sub} txt={txt} />
          <p style={{ fontSize: 10, color: sub, margin: "6px 0 0", fontStyle: "italic" }}>
            Advisory — el contrato determina los valores finales
          </p>
        </div>
      )}

      {tab === "sell" && sellPrev && !prevLoading && (
        <div style={{ background: isDark ? "rgba(220,38,38,0.10)" : "rgba(220,38,38,0.07)",
          borderRadius: 10, padding: "10px 12px", marginBottom: 12 }}>
          <Row label="WLD estimado"      value={`${sellPrev.wldOut.toFixed(6)} WLD`}    sub={sub} txt={txt} />
          <Row label="Precio estimado"   value={`${sellPrev.priceAfter.toFixed(8)} WLD`} sub={sub} txt={txt} />
          <Row label="Fee (3%)"          value={`${sellPrev.fee.toFixed(6)} WLD`}        sub={sub} txt={txt} />
          <Row label="Disponible hoy"    value={`${sellPrev.remainingAllowance?.toLocaleString()} tokens`} sub={sub} txt={txt} />
          <Row label="Slippage máx"      value="5%"                                       sub={sub} txt={txt} />
          {sellPrev.warningMsg && (
            <p style={{ fontSize: 10, color: "#f59e0b", margin: "6px 0 0" }}>
              ⚠ {sellPrev.warningMsg}
            </p>
          )}
          <p style={{ fontSize: 10, color: sub, margin: "6px 0 0", fontStyle: "italic" }}>
            Advisory — el contrato enforza el límite 45% definitivo
          </p>
        </div>
      )}

      {/* Mensaje */}
      {msg && (
        <div style={{ fontSize: 12, color: msgColor, marginBottom: 10,
          padding: "8px 12px", borderRadius: 8,
          background: `${msgColor}15`, fontWeight: 600 }}>
          {msg.text}
        </div>
      )}

      {/* Botón */}
      <button
        onClick={tab === "buy" ? handleBuy : handleSell}
        disabled={isSubmitting || loading || (tab === "buy" ? !buyPrev : !sellPrev)}
        style={{
          width: "100%", padding: "12px 0", borderRadius: 12, border: "none",
          cursor: (isSubmitting || loading) ? "wait" : "pointer", fontWeight: 800, fontSize: 14,
          color: "#fff", transition: "all 0.2s",
          background: (isSubmitting || loading)
            ? sub
            : tab === "buy" ? "#16a34a" : "#dc2626",
          opacity: (!isSubmitting && !loading && (tab === "buy" ? !buyPrev : !sellPrev)) ? 0.45 : 1,
        }}
      >
        {(isSubmitting || loading)
          ? "Procesando…"
          : tab === "buy"
            ? `Comprar tokens de ${totemName}`
            : `Vender ${tokenInput || "0"} tokens`}
      </button>

      {/* Indicador de modo */}
      {BONDING_CURVE_ADDRESS ? (
        <p style={{ fontSize: 9, color: sub, textAlign: "center", marginTop: 8 }}>
          🟢 Producción · {BONDING_CURVE_ADDRESS.slice(0, 6)}…{BONDING_CURVE_ADDRESS.slice(-4)} · World Chain
        </p>
      ) : (
        <p style={{ fontSize: 9, color: "#f59e0b", textAlign: "center", marginTop: 8 }}>
          🟡 Simulación — configura VITE_BONDING_CURVE_ADDRESS para producción
        </p>
      )}
    </div>
  );
}

function Row({ label, value, sub, txt }: { label: string; value: string; sub: string; txt: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
      <span style={{ fontSize: 11, color: sub }}>{label}</span>
      <span style={{ fontSize: 11, color: txt, fontWeight: 700 }}>{value}</span>
    </div>
  );
}
