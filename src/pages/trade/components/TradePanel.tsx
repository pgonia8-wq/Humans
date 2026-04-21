/**
 * TradePanel.tsx — FASE 4: Panel de trading premium
 *
 * UI rebuild — la lógica on-chain (MiniKit.commandsAsync.sendTransaction +
 * executeTrade backend verify) se preserva idéntica al panel previo.
 *
 *  BUY:  approve(curve, wld) + curve.buy(totem, wld, minTokensOut)  → 1 batch
 *  SELL: curve.sell(totem, tokensIn, minWldOut)                     → 1 tx
 *  → backend POST /api/market/execute(txHash) verifica on-chain y persiste.
 *
 * El contrato TotemBondingCurve es la fuente de verdad. Backend nunca transfiere.
 *
 * Sistema visual:
 *  - bg #111113 + border white/8% + rounded-3xl
 *  - switch BUY/SELL pill animado (verde #22c55e / rojo #f87171)
 *  - input glass amplio + tipografía 24px
 *  - preview rows con jerarquía y tabular-nums
 *  - botón ejecutar con 4 estados visuales
 *  - toast premium reemplazando texto rojo
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { MiniKit } from "@worldcoin/minikit-js";
import { ArrowDownToLine, ArrowUpFromLine, CheckCircle2, AlertCircle, Loader2, ShieldCheck } from "lucide-react";
import {
  buyPreview, sellPreview, executeTrade,
  type BuyPreview, type SellPreviewResult,
} from "../../../lib/tradeApi";

// ── Env vars ────────────────────────────────────────────────────────────────
const BONDING_CURVE_ADDRESS = import.meta.env.VITE_BONDING_CURVE_ADDRESS || "";
const WLD_ADDRESS           = "0x2cFc85d8E48F8EaB294be644d9E25C3030863003";

// ── ABIs mínimos ────────────────────────────────────────────────────────────
const WLD_ABI = [
  { name: "approve", type: "function", stateMutability: "nonpayable",
    inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }],
    outputs: [{ name: "", type: "bool" }] },
] as const;

const CURVE_ABI = [
  { name: "buy", type: "function", stateMutability: "nonpayable",
    inputs: [
      { name: "totem",        type: "address" },
      { name: "amountWldIn",  type: "uint256" },
      { name: "minTokensOut", type: "uint256" },
    ], outputs: [] },
  { name: "sell", type: "function", stateMutability: "nonpayable",
    inputs: [
      { name: "totem",     type: "address" },
      { name: "tokensIn",  type: "uint256" },
      { name: "minWldOut", type: "uint256" },
    ], outputs: [] },
] as const;

// ── Tipos ───────────────────────────────────────────────────────────────────
interface Props {
  totemAddress:    string;
  totemName:       string;
  userId:          string;
  isDark:          boolean;
  walletAddress?:  string | null;
  userBalanceWld?: number;
  onTradeSuccess:  (type: "buy" | "sell", newPrice: number, newSupply: number) => void;
  /** Gate Orb: false → modo lectura, botones de ejecución reemplazados por CTA de verificación. */
  canTrade?:        boolean;
  onRequestVerify?: () => void;
}

type Tab     = "buy" | "sell";
type BtnFx   = "idle" | "loading" | "success" | "error";
interface Toast { kind: "ok" | "err" | "warn"; text: string; key: number }

// ── Helpers ─────────────────────────────────────────────────────────────────
function toWei(wld: number): bigint        { return BigInt(Math.floor(wld * 1e18)); }
function withSlippage(v: bigint, p: number): bigint {
  return (v * BigInt(Math.floor((1 - p) * 10000))) / 10000n;
}
function fmtWld(n: number): string {
  if (!isFinite(n)) return "0";
  if (n >= 1)      return n.toFixed(4);
  if (n >= 0.0001) return n.toFixed(6);
  return n.toExponential(3);
}

// ════════════════════════════════════════════════════════════════════════════
//  COMPONENTE
// ════════════════════════════════════════════════════════════════════════════
export default function TradePanel({
  totemAddress, totemName, userId, isDark, walletAddress, userBalanceWld,
  onTradeSuccess,
  canTrade = true,
  onRequestVerify,
}: Props) {
  const [tab,         setTab]         = useState<Tab>("buy");
  const [amount,      setAmount]      = useState("");
  const [tokenInput,  setTokenInput]  = useState("");
  const [buyPrev,     setBuyPrev]     = useState<BuyPreview | null>(null);
  const [sellPrev,    setSellPrev]    = useState<SellPreviewResult | null>(null);
  const [prevLoading, setPrevLoading] = useState(false);
  const [btnFx,       setBtnFx]       = useState<BtnFx>("idle");
  const [submitting,  setSubmitting]  = useState(false);
  const [toast,       setToast]       = useState<Toast | null>(null);
  const reqIdRef = useRef(0);

  // ── Toast helper ──────────────────────────────────────────────────────
  const fireToast = useCallback((kind: Toast["kind"], text: string, ttl = 4500) => {
    const key = Date.now() + Math.random();
    setToast({ kind, text, key });
    setTimeout(() => setToast((t) => (t?.key === key ? null : t)), ttl);
  }, []);

  // ── Reset previews al cambiar de tab ──────────────────────────────────
  useEffect(() => { setBuyPrev(null); setSellPrev(null); setBtnFx("idle"); }, [tab]);

  // ── Preview BUY (debounce + token anti-stale) ────────────────────────
  useEffect(() => {
    if (tab !== "buy") return;
    const v = parseFloat(amount);
    if (!v || v <= 0) { setBuyPrev(null); return; }
    const id = ++reqIdRef.current;
    const t  = setTimeout(async () => {
      setPrevLoading(true);
      try {
        const p = await buyPreview(totemAddress, v);
        if (id !== reqIdRef.current) return;
        setBuyPrev(p);
      } catch {
        if (id !== reqIdRef.current) return;
        setBuyPrev(null);
      } finally { if (id === reqIdRef.current) setPrevLoading(false); }
    }, 350);
    return () => clearTimeout(t);
  }, [amount, totemAddress, tab]);

  // ── Preview SELL ──────────────────────────────────────────────────────
  useEffect(() => {
    if (tab !== "sell") return;
    const tk = parseInt(tokenInput);
    if (!tk || tk <= 0) { setSellPrev(null); return; }
    if (!walletAddress) return;
    const id = ++reqIdRef.current;
    const t  = setTimeout(async () => {
      setPrevLoading(true);
      try {
        const p = await sellPreview(totemAddress, tk, walletAddress, userId);
        if (id !== reqIdRef.current) return;
        setSellPrev(p);
      } catch (err: any) {
        if (id !== reqIdRef.current) return;
        fireToast("warn", err?.message ?? "Error al calcular preview");
        setSellPrev(null);
      } finally { if (id === reqIdRef.current) setPrevLoading(false); }
    }, 350);
    return () => clearTimeout(t);
  }, [tokenInput, totemAddress, walletAddress, userId, tab, fireToast]);

  // ── devTxHash (modo simulación, sin contrato) ─────────────────────────
  function devTxHash(): string {
    return "0xdev" + Math.random().toString(16).slice(2).padEnd(60, "0").slice(0, 60);
  }

  // ── Validaciones previas a ejecutar ───────────────────────────────────
  function validateBeforeExecute(): string | null {
    if (!canTrade) return "Verifícate con Orb para poder operar";
    if (!MiniKit.isInstalled()) return "Abre la app dentro de World App";
    if (tab === "buy") {
      const wld = parseFloat(amount);
      if (!wld || wld <= 0)              return "Ingresa un monto WLD válido";
      if (!buyPrev)                      return "Espera el preview antes de comprar";
      if (userBalanceWld != null && wld > userBalanceWld)
        return `Balance insuficiente · tienes ${userBalanceWld.toFixed(4)} WLD`;
    } else {
      if (!walletAddress)                return "Wallet no conectada";
      const tk = parseInt(tokenInput);
      if (!tk || tk <= 0)                return "Ingresa cantidad de tokens válida";
      if (!sellPrev)                     return "Espera el preview antes de vender";
      if (sellPrev.userBalance != null && tk > sellPrev.userBalance)
        return `Solo tienes ${sellPrev.userBalance.toLocaleString()} tokens`;
      if (sellPrev.remainingAllowance != null && tk > sellPrev.remainingAllowance)
        return `Excede 45% diario · disponible ${sellPrev.remainingAllowance.toLocaleString()}`;
    }
    return null;
  }

  // ── BUY ───────────────────────────────────────────────────────────────
  async function handleBuy() {
    if (submitting) return;
    const err = validateBeforeExecute();
    if (err) { fireToast("err", err); setBtnFx("error"); setTimeout(() => setBtnFx("idle"), 1400); return; }

    setSubmitting(true); setBtnFx("loading");
    try {
      const wld = parseFloat(amount);
      let txHash: string;

      if (BONDING_CURVE_ADDRESS) {
        const wldWei       = toWei(wld);
        const minTokensOut = withSlippage(BigInt(Math.floor(buyPrev!.tokensOut)), 0.05);
        const { finalPayload } = await MiniKit.commandsAsync.sendTransaction({
          transaction: [
            { address: WLD_ADDRESS,            abi: WLD_ABI,   functionName: "approve",
              args: [BONDING_CURVE_ADDRESS, wldWei.toString()] },
            { address: BONDING_CURVE_ADDRESS,  abi: CURVE_ABI, functionName: "buy",
              args: [totemAddress, wldWei.toString(), minTokensOut.toString()] },
          ],
        });
        if (!finalPayload || finalPayload.status !== "success") {
          fireToast("err", "Transacción cancelada o fallida en World App");
          setBtnFx("error"); setTimeout(() => setBtnFx("idle"), 1400); return;
        }
        txHash = finalPayload.transaction_id as string;
      } else {
        txHash = devTxHash();
      }

      // identidad va en el session token (Authorization Bearer), no en el body
      const result = await executeTrade({
        txHash, type: "buy", totemAddress,
        estimatedWld:     wld,
        estimatedTokens:  buyPrev!.tokensOut,
      });

      setBtnFx("success");
      fireToast("ok", `✓ Compraste ${result.tokenAmount?.toLocaleString()} tokens de ${totemName}`);
      setAmount(""); setBuyPrev(null);
      onTradeSuccess("buy", result.newPrice, result.newSupply);
      setTimeout(() => setBtnFx("idle"), 1600);
    } catch (e: any) {
      fireToast("err", e?.message ?? "Error al procesar compra");
      setBtnFx("error"); setTimeout(() => setBtnFx("idle"), 1400);
    } finally { setSubmitting(false); }
  }

  // ── SELL ──────────────────────────────────────────────────────────────
  async function handleSell() {
    if (submitting) return;
    const err = validateBeforeExecute();
    if (err) { fireToast("err", err); setBtnFx("error"); setTimeout(() => setBtnFx("idle"), 1400); return; }

    setSubmitting(true); setBtnFx("loading");
    try {
      const tokensIn = parseInt(tokenInput);
      let txHash: string;

      if (BONDING_CURVE_ADDRESS) {
        const minWldOut = withSlippage(toWei(sellPrev!.wldOut), 0.05);
        const { finalPayload } = await MiniKit.commandsAsync.sendTransaction({
          transaction: [
            { address: BONDING_CURVE_ADDRESS, abi: CURVE_ABI, functionName: "sell",
              args: [totemAddress, tokensIn.toString(), minWldOut.toString()] },
          ],
        });
        if (!finalPayload || finalPayload.status !== "success") {
          fireToast("err", "Transacción cancelada o fallida en World App");
          setBtnFx("error"); setTimeout(() => setBtnFx("idle"), 1400); return;
        }
        txHash = finalPayload.transaction_id as string;
      } else {
        txHash = devTxHash();
      }

      // identidad va en el session token (Authorization Bearer), no en el body
      const result = await executeTrade({
        txHash, type: "sell", totemAddress,
        estimatedWld:    sellPrev!.wldOut,
        estimatedTokens: tokensIn,
      });

      setBtnFx("success");
      fireToast("ok", `✓ Vendiste ${tokensIn.toLocaleString()} tokens · Recibes ≈${result.wldAmount?.toFixed(6)} WLD`);
      setTokenInput(""); setSellPrev(null);
      onTradeSuccess("sell", result.newPrice, result.newSupply);
      setTimeout(() => setBtnFx("idle"), 1600);
    } catch (e: any) {
      fireToast("err", e?.message ?? "Error al procesar venta");
      setBtnFx("error"); setTimeout(() => setBtnFx("idle"), 1400);
    } finally { setSubmitting(false); }
  }

  // ════════════════════════════════════════════════════════════════════════
  //  TOKENS VISUALES
  // ════════════════════════════════════════════════════════════════════════
  const isBuy        = tab === "buy";
  const accent       = isBuy ? "#22c55e" : "#f87171";
  const accentDeep   = isBuy ? "#16a34a" : "#dc2626";
  const accentBg10   = isBuy ? "rgba(34,197,94,0.10)"  : "rgba(248,113,113,0.10)";
  const accentBg20   = isBuy ? "rgba(34,197,94,0.20)"  : "rgba(248,113,113,0.20)";

  const cardBg     = isDark ? "#111113" : "#ffffff";
  const cardBorder = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
  const txt        = isDark ? "#ffffff" : "#111827";
  const txtSub     = isDark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.55)";
  const txtMuted   = isDark ? "rgba(255,255,255,0.32)" : "rgba(0,0,0,0.40)";
  const inpBg      = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)";
  const inpBorder  = isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.10)";
  const divider    = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";

  // ── Botón principal: estados visuales ────────────────────────────────
  const btnLabel =
    btnFx === "loading" ? "Procesando…"
  : btnFx === "success" ? "✓ Confirmado"
  : btnFx === "error"   ? "Reintenta"
  : isBuy               ? "Comprar"
  :                       "Vender";

  const btnBg =
    btnFx === "loading" ? "rgba(255,255,255,0.10)"
  : btnFx === "success" ? "linear-gradient(135deg, #22c55e, #16a34a)"
  : btnFx === "error"   ? "linear-gradient(135deg, #f87171, #dc2626)"
  :                       `linear-gradient(135deg, ${accent}, ${accentDeep})`;

  const btnDisabled = submitting || (isBuy ? !buyPrev : !sellPrev);

  return (
    <div style={{
      background:    cardBg,
      border:        `1px solid ${cardBorder}`,
      borderRadius:  24,
      padding:       16,
      boxShadow:     isDark
        ? "0 8px 32px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.04)"
        : "0 4px 18px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.80)",
      position:      "relative",
      overflow:      "hidden",
    }}>
      <style>{TP_KEYFRAMES}</style>

      {/* ── HEADER: switch BUY / SELL ─────────────────────────────────── */}
      <div style={{
        position: "relative",
        display: "flex",
        background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
        border: `1px solid ${divider}`,
        borderRadius: 999,
        padding: 4,
        marginBottom: 16,
      }}>
        {/* indicador deslizante */}
        <div style={{
          position: "absolute",
          top: 4, bottom: 4,
          left: isBuy ? 4 : "calc(50% + 0px)",
          width: "calc(50% - 4px)",
          background: `linear-gradient(135deg, ${accent}, ${accentDeep})`,
          borderRadius: 999,
          boxShadow: `0 4px 14px ${accentBg20}, inset 0 1px 0 rgba(255,255,255,0.22)`,
          transition: "left 280ms cubic-bezier(0.4, 0, 0.2, 1), background 240ms ease",
        }} />
        <button
          onClick={() => setTab("buy")}
          style={{
            position: "relative", flex: 1, padding: "8px 0",
            background: "transparent", border: "none", cursor: "pointer",
            color: isBuy ? "#fff" : txtSub,
            fontWeight: 800, fontSize: 13, letterSpacing: -0.1,
            display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
            transition: "color 180ms ease",
          }}
        >
          <ArrowDownToLine size={13} strokeWidth={2.6} /> Comprar
        </button>
        <button
          onClick={() => setTab("sell")}
          style={{
            position: "relative", flex: 1, padding: "8px 0",
            background: "transparent", border: "none", cursor: "pointer",
            color: !isBuy ? "#fff" : txtSub,
            fontWeight: 800, fontSize: 13, letterSpacing: -0.1,
            display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
            transition: "color 180ms ease",
          }}
        >
          <ArrowUpFromLine size={13} strokeWidth={2.6} /> Vender
        </button>
      </div>

      {/* ── INPUT PRINCIPAL ─────────────────────────────────────────── */}
      <div style={{ marginBottom: 14 }}>
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          marginBottom: 6,
        }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: txtSub, letterSpacing: 0.2 }}>
            {isBuy ? "Cantidad en WLD" : "Cantidad de tokens"}
          </label>
          {isBuy && userBalanceWld != null && (
            <button
              type="button"
              onClick={() => setAmount((userBalanceWld * 0.99).toFixed(4))}
              style={{
                fontSize: 10, fontWeight: 700,
                background: "transparent", border: "none",
                color: accent, cursor: "pointer",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              MAX · {userBalanceWld.toFixed(4)}
            </button>
          )}
          {!isBuy && sellPrev?.userBalance != null && (
            <button
              type="button"
              onClick={() => setTokenInput(String(Math.min(sellPrev.userBalance, sellPrev.remainingAllowance)))}
              style={{
                fontSize: 10, fontWeight: 700,
                background: "transparent", border: "none",
                color: accent, cursor: "pointer",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              MAX · {Math.min(sellPrev.userBalance, sellPrev.remainingAllowance).toLocaleString()}
            </button>
          )}
        </div>

        <div style={{
          position: "relative",
          background: inpBg,
          border: `1px solid ${inpBorder}`,
          borderRadius: 16,
          padding: "14px 16px",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          transition: "border-color 180ms ease",
        }}>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step={isBuy ? "0.0001" : "1"}
            value={isBuy ? amount : tokenInput}
            onChange={(e) => isBuy ? setAmount(e.target.value) : setTokenInput(e.target.value)}
            placeholder={isBuy ? "0.000" : "0"}
            style={{
              width: "100%", background: "transparent", border: "none", outline: "none",
              color: txt, fontSize: 24, fontWeight: 800, letterSpacing: -0.5,
              fontVariantNumeric: "tabular-nums",
              paddingRight: 56,
            }}
          />
          <span style={{
            position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)",
            fontSize: 11, fontWeight: 800, color: txtMuted, letterSpacing: 1.2,
          }}>
            {isBuy ? "WLD" : "TKN"}
          </span>
        </div>
      </div>

      {/* ── PREVIEW BLOCK ─────────────────────────────────────────────── */}
      <div style={{
        background: accentBg10,
        border: `1px solid ${accentBg20}`,
        borderRadius: 16,
        padding: "12px 14px",
        marginBottom: 14,
        minHeight: 96,
        position: "relative",
        opacity: prevLoading ? 0.55 : 1,
        transition: "opacity 200ms ease",
      }}>
        {prevLoading && (
          <div style={{
            position: "absolute", top: 10, right: 12,
            display: "inline-flex", alignItems: "center", gap: 5,
            fontSize: 10, fontWeight: 700, color: txtSub,
          }}>
            <Loader2 size={11} className="tp-spin" /> Calculando
          </div>
        )}

        {isBuy && buyPrev ? (
          <>
            <Row label="Recibes (estimado)"
                 value={`${buyPrev.tokensOut.toLocaleString()} TKN`}
                 emphasize accent={accent} txtSub={txtSub} txt={txt} />
            <Row label="Precio después"
                 value={`${fmtWld(buyPrev.priceAfter)} WLD`}
                 txtSub={txtSub} txt={txt} />
            <Row label="Fee (2%)"
                 value={`${fmtWld(buyPrev.fee)} WLD`}
                 txtSub={txtSub} txt={txt} />
            <Row label="Slippage máx" value="5%" txtSub={txtSub} txt={txt} />
          </>
        ) : !isBuy && sellPrev ? (
          <>
            <Row label="Recibes (estimado)"
                 value={`${fmtWld(sellPrev.wldOut)} WLD`}
                 emphasize accent={accent} txtSub={txtSub} txt={txt} />
            <Row label="Precio después"
                 value={`${fmtWld(sellPrev.priceAfter)} WLD`}
                 txtSub={txtSub} txt={txt} />
            <Row label="Fee (3%)"
                 value={`${fmtWld(sellPrev.fee)} WLD`}
                 txtSub={txtSub} txt={txt} />
            <Row label="Disponible hoy"
                 value={`${sellPrev.remainingAllowance?.toLocaleString() ?? "—"} TKN`}
                 txtSub={txtSub} txt={txt} />
            {sellPrev.warningMsg && (
              <div style={{
                marginTop: 6, fontSize: 10.5, color: "#fbbf24", fontWeight: 600,
              }}>
                ⚠ {sellPrev.warningMsg}
              </div>
            )}
          </>
        ) : (
          <div style={{
            fontSize: 11, color: txtMuted, lineHeight: 1.55,
            textAlign: "center", paddingTop: 24,
          }}>
            Ingresa una cantidad para ver el preview
          </div>
        )}
        {(buyPrev || sellPrev) && (
          <div style={{
            marginTop: 8, paddingTop: 8,
            borderTop: `1px solid ${divider}`,
            fontSize: 9.5, color: txtMuted, fontStyle: "italic",
          }}>
            Advisory · el contrato es la fuente de verdad
          </div>
        )}
      </div>

      {/* ── BOTÓN EJECUTAR ────────────────────────────────────────────── */}
      {canTrade ? (
        <button
          onClick={isBuy ? handleBuy : handleSell}
          disabled={btnDisabled}
          style={{
            width: "100%", padding: "14px 0",
            borderRadius: 14, border: "none",
            cursor: btnDisabled ? (submitting ? "wait" : "not-allowed") : "pointer",
            color: "#fff", fontWeight: 900, fontSize: 14, letterSpacing: -0.2,
            background: btnBg as string,
            boxShadow: btnFx === "idle" && !btnDisabled
              ? `0 8px 24px ${accentBg20}, inset 0 1px 0 rgba(255,255,255,0.22)`
              : "none",
            opacity: btnDisabled && btnFx === "idle" ? 0.45 : 1,
            transition: "all 220ms cubic-bezier(0.4, 0, 0.2, 1)",
            display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}
        >
          {btnFx === "loading" && <Loader2 size={15} className="tp-spin" />}
          {btnFx === "success" && <CheckCircle2 size={15} />}
          {btnFx === "error"   && <AlertCircle size={15} />}
          {btnLabel}
        </button>
      ) : (
        <button
          onClick={() => onRequestVerify?.()}
          style={{
            width: "100%", padding: "14px 0",
            borderRadius: 14, border: "none", cursor: "pointer",
            color: "#fff", fontWeight: 900, fontSize: 14, letterSpacing: -0.2,
            background: "linear-gradient(135deg, #6366f1, #a855f7)",
            boxShadow: "0 8px 24px rgba(99,102,241,0.35), inset 0 1px 0 rgba(255,255,255,0.22)",
            transition: "all 220ms cubic-bezier(0.4, 0, 0.2, 1)",
            display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}
        >
          <ShieldCheck size={15} strokeWidth={2.6} />
          Verifícate con Orb para operar
        </button>
      )}

      {/* ── INDICADOR DE MODO ─────────────────────────────────────────── */}
      <div style={{
        marginTop: 10, textAlign: "center",
        fontSize: 9.5, color: txtMuted, fontWeight: 600, letterSpacing: 0.4,
      }}>
        {BONDING_CURVE_ADDRESS
          ? <>● Producción · {BONDING_CURVE_ADDRESS.slice(0,6)}…{BONDING_CURVE_ADDRESS.slice(-4)} · World Chain</>
          : <>● Simulación · configura VITE_BONDING_CURVE_ADDRESS</>}
      </div>

      {/* ── SUCCESS OVERLAY (cubre el panel ~1.4s tras éxito) ─────────── */}
      {btnFx === "success" && (
        <div
          aria-live="polite"
          style={{
            position: "absolute", inset: 0, zIndex: 40,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            background: isDark
              ? "linear-gradient(160deg, rgba(20,40,28,0.96), rgba(10,20,14,0.98))"
              : "linear-gradient(160deg, rgba(220,252,231,0.97), rgba(187,247,208,0.98))",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            borderRadius: 24,
            animation: "tpSuccessIn 220ms cubic-bezier(0.34, 1.56, 0.64, 1) both",
          }}
        >
          {/* halo */}
          <div style={{
            position: "absolute", width: 220, height: 220, borderRadius: "50%",
            background: "radial-gradient(circle, rgba(34,197,94,0.45), transparent 65%)",
            filter: "blur(28px)",
            animation: "tpSuccessHalo 1.4s ease-out both",
          }} />
          <div style={{
            position: "relative",
            width: 76, height: 76, borderRadius: 22,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "linear-gradient(135deg, #22c55e, #16a34a)",
            boxShadow: "0 14px 44px rgba(34,197,94,0.55), inset 0 1px 0 rgba(255,255,255,0.32), inset 0 -2px 0 rgba(0,0,0,0.18)",
            border: "1px solid rgba(255,255,255,0.22)",
            animation: "tpSuccessCheck 480ms cubic-bezier(0.34, 1.56, 0.64, 1) both",
          }}>
            <CheckCircle2 size={42} color="#fff" strokeWidth={2.6} />
          </div>
          <div style={{
            marginTop: 16,
            fontSize: 17, fontWeight: 900, letterSpacing: -0.4,
            color: isDark ? "#ffffff" : "#14532d",
          }}>
            {isBuy ? "¡Compra ejecutada!" : "¡Venta ejecutada!"}
          </div>
          <div style={{
            marginTop: 4, fontSize: 11.5, fontWeight: 700,
            color: isDark ? "rgba(255,255,255,0.65)" : "rgba(20,83,45,0.75)",
            letterSpacing: 0.2,
          }}>
            {totemName} · confirmada on-chain
          </div>
        </div>
      )}

      {/* ── TOAST PREMIUM (overlay flotante en bottom) ────────────────── */}
      {toast && (
        <div
          key={toast.key}
          style={{
            position: "absolute", left: 12, right: 12, bottom: 12,
            zIndex: 30,
            background: toast.kind === "ok"   ? "rgba(20,40,28,0.95)"
                       : toast.kind === "warn" ? "rgba(40,32,16,0.95)"
                       :                         "rgba(40,16,16,0.95)",
            border: `1px solid ${toast.kind === "ok" ? "rgba(34,197,94,0.32)"
                                : toast.kind === "warn" ? "rgba(251,191,36,0.32)"
                                :                          "rgba(248,113,113,0.32)"}`,
            backdropFilter: "blur(14px)",
            WebkitBackdropFilter: "blur(14px)",
            borderRadius: 14,
            padding: "10px 14px",
            display: "flex", alignItems: "center", gap: 10,
            boxShadow: "0 12px 40px rgba(0,0,0,0.55)",
            animation: "tpToastIn 280ms cubic-bezier(0.4, 0, 0.2, 1) both",
          }}
        >
          {toast.kind === "ok"
            ? <CheckCircle2 size={16} color="#22c55e" />
            : toast.kind === "warn"
              ? <AlertCircle size={16} color="#fbbf24" />
              : <AlertCircle size={16} color="#f87171" />}
          <span style={{
            fontSize: 12, fontWeight: 700, color: "#ffffff",
            lineHeight: 1.35, flex: 1,
          }}>
            {toast.text}
          </span>
        </div>
      )}
    </div>
  );
}

// ── Row helper ──────────────────────────────────────────────────────────────
function Row({
  label, value, txtSub, txt, emphasize, accent,
}: { label: string; value: string; txtSub: string; txt: string; emphasize?: boolean; accent?: string }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      marginBottom: 5,
    }}>
      <span style={{ fontSize: 11, color: txtSub, fontWeight: 600 }}>{label}</span>
      <span style={{
        fontSize: emphasize ? 13.5 : 11.5,
        fontWeight: emphasize ? 900 : 700,
        color: emphasize && accent ? accent : txt,
        fontVariantNumeric: "tabular-nums", letterSpacing: -0.1,
      }}>
        {value}
      </span>
    </div>
  );
}

// ── Keyframes ───────────────────────────────────────────────────────────────
const TP_KEYFRAMES = `
  @keyframes tpToastIn {
    from { transform: translateY(8px); opacity: 0; }
    to   { transform: translateY(0);   opacity: 1; }
  }
  @keyframes tpSpin { to { transform: rotate(360deg); } }
  .tp-spin { animation: tpSpin 0.9s linear infinite; }
  @keyframes tpSuccessIn {
    from { opacity: 0; transform: scale(0.96); }
    to   { opacity: 1; transform: scale(1); }
  }
  @keyframes tpSuccessCheck {
    0%   { transform: scale(0.4); opacity: 0; }
    60%  { transform: scale(1.12); opacity: 1; }
    100% { transform: scale(1); opacity: 1; }
  }
  @keyframes tpSuccessHalo {
    0%   { opacity: 0; transform: scale(0.6); }
    50%  { opacity: 1; transform: scale(1.1); }
    100% { opacity: 0.4; transform: scale(1.2); }
  }
`;
