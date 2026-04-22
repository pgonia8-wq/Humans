/**
 * TokenPage — Bloomberg fullscreen de un totem.
 * Render PURO del viewModel canonico (Ley P1). Cero derivacion aqui.
 * Incluye 3 capas visuales nuevas:
 *   A. Oracle Narrative Panel
 *   B. Curve Reaction Indicator
 *   C. Risk / Trust Field
 */
import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ShoppingCart, DollarSign, Users, Clock } from "lucide-react";
import {
  getTotemHistory, getTotemTrades, getTotemHolders,
} from "../../lib/tradeApi";
import type {
  TotemHistory, TotemTrade, TotemHoldersResult,
} from "../../lib/tradeApi";
import {
  getTotemViewModel, fmtWld, fmtCount, fmtBps, fmtDelta, fmtAge,
  shortAddr, STATUS_COLORS, STATUS_LABELS,
} from "../services/viewModel";
import type { TotemViewModel } from "../services/viewModel";
import { deriveEmoji, loadTotemImage } from "../services/derive";
import { isMockAddress, buildMockViewModel } from "../services/mockTotems";
import Sparkline from "../components/Sparkline";
import Stat from "../components/Stat";
import { useShell } from "../context/ShellContext";
import OrbGateModal from "../components/OrbGateModal";
import TokenInsightsPanel from "../components/TokenInsightsPanel";

const BuySellFullscreen = lazy(() => import("../../pages/trade/components/BuySellFullscreen"));

type Tab = "trades" | "holders";

export default function TokenPage() {
  const {
    selectedAddress, userId, walletAddress, isOrbVerified, verifyOrb, onOrbVerifiedChange, closeToken,
  } = useShell();

  const [vm,       setVm]       = useState<TotemViewModel | null>(null);
  const [history,  setHistory]  = useState<TotemHistory[]>([]);
  const [trades,   setTrades]   = useState<TotemTrade[]>([]);
  const [holders,  setHolders]  = useState<TotemHoldersResult | null>(null);
  const [tab,      setTab]      = useState<Tab>("trades");
  const [side,     setSide]     = useState<"buy" | "sell" | null>(null);
  const [orbGate,  setOrbGate]  = useState(false);
  const [loading,  setLoading]  = useState(true);
  const [err,      setErr]      = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!selectedAddress) return;
    setLoading(true); setErr(null);
    try {
        const [v, h, tr, ho] = await Promise.all([
          getTotemViewModel(selectedAddress, userId || undefined),
          getTotemHistory(selectedAddress, 48).catch(() => []),
          getTotemTrades(selectedAddress, 40).catch(() => []),
          getTotemHolders(selectedAddress, 20).catch(() => null),
        ]);
        setVm(v); setHistory(h); setTrades(tr); setHolders(ho);
      } catch (e: any) {
        // Fallback: tótem demo (mock) — mostramos VM sintético, sin tradear.
        if (isMockAddress(selectedAddress)) {
          const mockVm = buildMockViewModel(selectedAddress);
          if (mockVm) {
            setVm(mockVm);
            setHistory([]); setTrades([]); setHolders(null);
            setErr(null);
            return;
          }
        }
        setErr(e?.message ?? "No se pudo cargar el totem.");
      } catch (e: any) {
      setErr(e?.message ?? "No se pudo cargar el totem.");
    } finally { setLoading(false); }
  }, [selectedAddress, userId]);

  useEffect(() => { load(); }, [load]);

  const emoji = useMemo(() => selectedAddress ? deriveEmoji(selectedAddress) : "", [selectedAddress]);

  if (!selectedAddress) return null;

  function requestTrade(s: "buy" | "sell") {
    if (!isOrbVerified) { setOrbGate(true); return; }
    if (vm?.status.overall !== "OK") return;
    setSide(s);
  }

  const canTrade   = vm?.status.overall === "OK";
  const price      = vm ? Number(vm.market.price.value ?? 0) : 0;
  const name       = vm?.identity.name.value ?? "…";
  const symbol     = vm?.identity.symbol.value ?? "";
  const statusColor = vm ? STATUS_COLORS[vm.status.overall] : "#666";
  const statusLabel = vm ? STATUS_LABELS[vm.status.overall] : "";
  const grad       = vm?.progression.graduation.value;
  const scoreDelta = vm?.oracle.scoreDelta.value;
  const infDelta   = vm?.oracle.influenceDelta.value;

  return (
    <div className="h-full w-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 pt-3 pb-2 shrink-0">
        <button onClick={closeToken} className="p-2 -ml-2 rounded-lg hover:bg-white/5" aria-label="Volver">
          <ArrowLeft size={20} color="#ffffff" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="text-xs" style={{ color: "rgba(255,255,255,0.50)" }}>
            {shortAddr(selectedAddress)}
          </div>
          <div className="text-white font-semibold truncate">{name}</div>
        </div>
        {vm && (
          <span className="text-[10px] uppercase tracking-wider px-2 py-1 rounded-md font-semibold"
            style={{ background: `${statusColor}22`, color: statusColor, border: `1px solid ${statusColor}55` }}>
            {statusLabel}
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto pb-32 scrollbar-hide">
        {loading && (
          <div className="text-center text-sm py-10" style={{ color: "rgba(255,255,255,0.50)" }}>
            Cargando totem…
          </div>
        )}
        {err && (
          <div className="mx-4 text-sm rounded-xl px-3 py-2"
            style={{ background: "rgba(248,113,113,0.10)", border: "1px solid rgba(248,113,113,0.3)", color: "#fca5a5" }}>
            {err}
          </div>
        )}

        {vm && (
          <>
            {/* Hero price */}
            <div className="px-4 mt-2">
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-4xl overflow-hidden"
                    style={{
                      background: "linear-gradient(135deg, rgba(34,197,94,0.22), rgba(167,139,250,0.22))",
                      border: "1px solid rgba(255,255,255,0.10)",
                      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.10), 0 12px 24px -12px rgba(0,0,0,0.55)",
                    }}>
                    {(() => {
                      const av = loadTotemImage(selectedAddress);
                      return av
                        ? <img src={av} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        : <span>{emoji}</span>;
                    })()}
                  </div>
                  <div className="flex-1">
                  <div className="text-[11px] uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.50)" }}>
                    {symbol} · L{vm.progression.level.value ?? "—"} · Badge {vm.progression.badge.value ?? "—"}
                  </div>
                  <div className="text-3xl font-bold text-white tabular-nums mt-0.5">
                    {fmtWld(price, 6)}
                  </div>
                </div>
              </div>
            </div>

            {/* Chart */}
            <div className="mx-4 mt-4 rounded-2xl p-3"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <Sparkline data={history} height={150} width={340} />
            </div>

            {/* === Oracle + Curve + Risk (render-only, datos del backend) === */}
            <TokenInsightsPanel vm={vm} />

            {/* Stats grid */}
            <div className="px-4 mt-4 grid grid-cols-2 gap-2">
              <Stat label="Supply" value={fmtCount(Number(vm.market.supply.value ?? 0))}
                    hint={grad ? `${(grad.overallBps / 100).toFixed(1)}% a graduacion` : undefined} color="#22c55e" />
              <Stat label="Vol 24h (verif.)" value={fmtWld(Number(vm.market.volumeShown.value ?? 0), 2)}
                    hint={vm.market.verifiedVolume.stale ? "raw (indexer)" : "on-chain verified"} />
              <Stat label="Score delta"    value={fmtDelta(scoreDelta)} color={Number(scoreDelta ?? 0) >= 0 ? "#22c55e" : "#f87171"} />
              <Stat label="Influence delta" value={fmtDelta(infDelta)} />
              <Stat label="Holders"        value={holders ? fmtCount(holders.total_holders) : "—"} />
              <Stat label="Edad"           value={fmtAge(vm.market.ageSec.value)} />
            </div>

            {/* Graduation progress */}
            {grad && (
              <div className="mx-4 mt-4 rounded-2xl p-3"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.50)" }}>
                    Camino a graduacion
                  </span>
                  <span className="text-xs font-semibold tabular-nums" style={{ color: "#22c55e" }}>
                    {(grad.overallBps / 100).toFixed(1)}%
                  </span>
                </div>
                {[
                  { k: "level",  label: "Nivel",      r: grad.gates.level.ratioBps  },
                  { k: "supply", label: "Supply",      r: grad.gates.supply.ratioBps },
                  { k: "volume", label: "Vol verif.",  r: grad.gates.volume.ratioBps },
                  { k: "age",    label: "Edad",        r: grad.gates.age.ratioBps    },
                ].map(g => (
                  <div key={g.k} className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] w-20" style={{ color: "rgba(255,255,255,0.55)" }}>{g.label}</span>
                    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, g.r / 100)}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        style={{ height: "100%", background: grad.bottleneckGate === g.k ? "#f59e0b" : "#22c55e" }}
                      />
                    </div>
                    <span className="text-[10px] w-10 text-right tabular-nums" style={{ color: "rgba(255,255,255,0.50)" }}>
                      {(g.r / 100).toFixed(0)}%
                    </span>
                  </div>
                ))}
                <div className="text-[10px] mt-1" style={{ color: "rgba(255,255,255,0.40)" }}>
                  Cuello: <span style={{ color: "#f59e0b" }}>{grad.bottleneckGate}</span>
                </div>
              </div>
            )}

            {/* Trading info */}
            <div className="mx-4 mt-4 rounded-2xl p-3 grid grid-cols-2 gap-2 text-[11px]"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div><span style={{ color: "rgba(255,255,255,0.50)" }}>Buy fee:</span> <span className="text-white">{fmtBps(vm.trading.buyFeeBps.value)}</span></div>
              <div><span style={{ color: "rgba(255,255,255,0.50)" }}>Sell fee:</span> <span className="text-white">{fmtBps(vm.trading.sellFeeBps.value)}</span></div>
              <div><span style={{ color: "rgba(255,255,255,0.50)" }}>User cap:</span> <span className="text-white">{fmtBps(vm.trading.userCapBps.value)}</span></div>
              <div><span style={{ color: "rgba(255,255,255,0.50)" }}>Owner cap:</span> <span className="text-white">{fmtBps(vm.trading.ownerCapBps.value)}</span></div>
            </div>

            {/* Tabs trades/holders */}
            <div className="px-4 mt-5 flex gap-2">
              {[
                { id: "trades" as Tab,  label: "Trades",  Icon: Clock },
                { id: "holders" as Tab, label: "Holders", Icon: Users },
              ].map(({ id, label, Icon }) => {
                const a = tab === id;
                return (
                  <button key={id} onClick={() => setTab(id)}
                    className="flex-1 py-2 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5"
                    style={{
                      background: a ? "rgba(34,197,94,0.18)" : "rgba(255,255,255,0.04)",
                      border:     `1px solid ${a ? "rgba(34,197,94,0.4)" : "rgba(255,255,255,0.08)"}`,
                      color:      a ? "#22c55e" : "rgba(255,255,255,0.60)",
                    }}>
                    <Icon size={13} /> {label}
                  </button>
                );
              })}
            </div>

            <div className="mx-4 mt-3 rounded-xl overflow-hidden"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              {tab === "trades" && (
                trades.length === 0
                  ? <div className="text-center text-xs py-6" style={{ color: "rgba(255,255,255,0.40)" }}>Sin trades aun.</div>
                  : trades.slice(0, 20).map((t) => (
                      <div key={t.id} className="flex items-center justify-between px-3 py-2 text-xs"
                        style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold"
                            style={{ color: t.type === "buy" ? "#22c55e" : "#f87171" }}>
                            {t.type === "buy" ? "Buy" : "Sell"}
                          </span>
                          <span style={{ color: "rgba(255,255,255,0.45)" }}>{shortAddr(t.user)}</span>
                        </div>
                        <div className="text-right">
                          <div className="text-white tabular-nums">{fmtWld(t.amount, 3)}</div>
                          <div className="tabular-nums" style={{ color: "rgba(255,255,255,0.40)" }}>
                            {new Date(t.timestamp).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    ))
              )}
              {tab === "holders" && (
                !holders || holders.holders.length === 0
                  ? <div className="text-center text-xs py-6" style={{ color: "rgba(255,255,255,0.40)" }}>Sin holders aun.</div>
                  : holders.holders.map((h) => (
                      <div key={h.user_id} className="flex items-center justify-between px-3 py-2 text-xs"
                        style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                        <span style={{ color: "rgba(255,255,255,0.65)" }}>{shortAddr(h.user_id)}</span>
                        <div className="text-right">
                          <div className="text-white tabular-nums">{fmtCount(h.tokens)}</div>
                          <div className="tabular-nums" style={{ color: "rgba(255,255,255,0.40)" }}>
                            {h.share_pct.toFixed(2)}%
                          </div>
                        </div>
                      </div>
                    ))
              )}
            </div>
          </>
        )}
      </div>

      {/* Buy/Sell bar */}
      {vm && walletAddress && (
        <div className="fixed left-0 right-0 z-[9995] px-4"
          style={{ bottom: "calc(env(safe-area-inset-bottom) + 72px)" }}>
          <div className="max-w-md mx-auto flex gap-2">
            <button onClick={() => requestTrade("buy")} disabled={!canTrade}
              className="flex-1 py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
              style={{
                background: canTrade ? "linear-gradient(135deg,#22c55e 0%,#16a34a 100%)" : "rgba(255,255,255,0.08)",
                color: canTrade ? "#fff" : "rgba(255,255,255,0.35)",
                boxShadow: canTrade ? "0 6px 20px rgba(34,197,94,0.35)" : "none",
              }}>
              <ShoppingCart size={16} /> Comprar
            </button>
            <button onClick={() => requestTrade("sell")} disabled={!canTrade}
              className="flex-1 py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
              style={{
                background: canTrade ? "rgba(248,113,113,0.12)" : "rgba(255,255,255,0.04)",
                color: canTrade ? "#fca5a5" : "rgba(255,255,255,0.35)",
                border: `1px solid ${canTrade ? "rgba(248,113,113,0.35)" : "rgba(255,255,255,0.08)"}`,
              }}>
              <DollarSign size={16} /> Vender
            </button>
          </div>
          {!canTrade && vm && (
            <div className="max-w-md mx-auto mt-2 text-center text-[11px]"
              style={{ color: statusColor }}>
              Trading no disponible — Estado: {statusLabel}
            </div>
          )}
        </div>
      )}

      <AnimatePresence>
        {side && vm && walletAddress && (
          <Suspense fallback={null}>
            <BuySellFullscreen
              key="buysell"
              isDark
              totemAddress={vm.address}
              totemName={name}
              totemPrice={price}
              userId={userId}
              walletAddress={walletAddress}
              canTrade={isOrbVerified}
              onRequestVerify={() => { setSide(null); setOrbGate(true); }}
              onClose={() => { setSide(null); load(); }}
              onTradeSuccess={() => { load(); }}
              initialSide={side}
            />
          </Suspense>
        )}
      </AnimatePresence>

      {orbGate && (
        <OrbGateModal
          intent="trade"
          onClose={() => setOrbGate(false)}
          onVerify={async () => { await verifyOrb(); onOrbVerifiedChange(true); }}
        />
      )}
    </div>
  );
}
