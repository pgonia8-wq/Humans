/**
 * SystemOverlay — Capa flotante de estado global del sistema TOTEM.
 *
 * Ley P1: render-only. Consume GET /api/system/physics. Si un campo viene
 * con `available:false` se renderiza inactivo (sin valor falso).
 */
import { useEffect, useId, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  getSystemPhysics,
  type SystemPhysics, type TotemProfile, type PhysicsMetric,
} from "../../lib/tradeApi";
import { fmtWld, fmtCount, fmtBps, fmtAge } from "../services/viewModel";
import {
  GlassCard, SectionHeader, Pill, PulseDot, MetricCell, BiasHalo,
  BIAS_COLOR, SPRING, useReducedMotion,
} from "./_premium";

interface Props {
  open:    boolean;
  onClose: () => void;
}

const ORACLE_COLOR: Record<SystemPhysics["oracleStatus"]["state"], string> = {
  FRESH:   "#22c55e",
  STALE:   "#f59e0b",
  UNKNOWN: "#7a7a85",
};

const NETWORK_COLOR: Record<SystemPhysics["networkStatus"]["state"], string> = {
  OK:       "#22c55e",
  DEGRADED: "#f59e0b",
};

export default function SystemOverlay({ open, onClose }: Props) {
  const [data,    setData]    = useState<SystemPhysics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const titleId   = useId();
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    setLoading(true);
    setError(null);
    getSystemPhysics()
      .then((d) => { if (alive) setData(d); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [open]);

  // Focus management: trap dentro del diálogo, restaurar al cerrar.
  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = (document.activeElement as HTMLElement) ?? null;
    closeBtnRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { e.preventDefault(); onClose(); return; }
      if (e.key !== "Tab" || !dialogRef.current) return;
      const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last  = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previouslyFocused.current?.focus?.();
    };
  }, [open, onClose]);

  const biasColor = data ? BIAS_COLOR[data.systemBias] : "#7a7a85";
  const reduce = useReducedMotion();

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={reduce ? { duration: 0 } : { duration: 0.18 }}
            className="fixed inset-0 z-[10000]"
            style={{
              background: "rgba(4,4,8,0.62)",
              backdropFilter: "blur(14px) saturate(120%)",
              WebkitBackdropFilter: "blur(14px) saturate(120%)",
            }}
            onClick={onClose}
          />
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={reduce ? false : { opacity: 0, y: 18, scale: 0.97 }}
            animate={{ opacity: 1, y: 0,  scale: 1    }}
            exit={{    opacity: 0, y: 12, scale: 0.97 }}
            transition={reduce ? { duration: 0 } : SPRING}
            className="fixed left-1/2 top-1/2 z-[10001] w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2"
          >
            <GlassCard tint={biasColor} intensity={1.2} className="p-5" style={{ maxHeight: "84vh", overflowY: "auto" }}>
              <BiasHalo color={biasColor} opacity={0.22} />

              <header className="relative z-10 mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <PulseDot color={biasColor} />
                  <h2
                    id={titleId}
                    className="text-[12px] font-semibold uppercase"
                    style={{ letterSpacing: "0.18em", color: "rgba(255,255,255,0.85)" }}
                  >
                    Estado del sistema
                  </h2>
                </div>
                <button
                  ref={closeBtnRef}
                  onClick={onClose}
                  className="rounded-md px-2 py-1 text-[11px] opacity-60 transition hover:bg-white/5 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-white/30"
                  aria-label="Cerrar estado del sistema"
                >
                  ESC ✕
                </button>
              </header>

              {loading && (
                <p className="relative z-10 text-[11px] opacity-50">Cargando físicas del sistema…</p>
              )}
              {error && !loading && (
                <p className="relative z-10 text-[11px]" style={{ color: "#ef4444" }}>{error}</p>
              )}

              {data && !loading && !error && (
                <div className="relative z-10">
                  {/* Estado emocional + salud */}
                  <div className="mb-4 flex flex-wrap items-center gap-2">
                    <Pill label={`Bias ${data.systemBias}`} color={biasColor} glow />
                    <Pill
                      label={`Oracle ${data.oracleStatus.state}`}
                      color={ORACLE_COLOR[data.oracleStatus.state]}
                      sub={data.oracleStatus.lastSignedAgeSec != null
                        ? fmtAge(data.oracleStatus.lastSignedAgeSec)
                        : undefined}
                    />
                    <Pill
                      label={`Red ${data.networkStatus.state}`}
                      color={NETWORK_COLOR[data.networkStatus.state]}
                    />
                  </div>

                  {/* Totales */}
                  <div className="mb-3 grid grid-cols-2 gap-2">
                    <MetricCell label="Total tótems"    value={fmtCount(data.totalTotems)} />
                    <MetricCell label="Volumen 24h"     value={fmtWld(data.totalVolume, 2)} />
                    <MetricCell label="Precio promedio" value={fmtWld(data.avgPrice, 4)} />
                    <MetricCell label="Líder por vol."  value={topName(data.topTotem)} />
                  </div>

                  {/* Físicas derivadas */}
                  <div className="grid grid-cols-2 gap-2">
                    <PhysicsCell label="Presión de curva" m={data.curvePressureBps} signed />
                    <PhysicsCell label="Buy momentum"     m={data.buyMomentumBps} />
                    <PhysicsCell label="Volatilidad"      m={data.volatilityBps} />
                    <PhysicsCell label="Drift precio 24h" m={data.priceDriftAvg} numeric />
                  </div>

                  <p
                    className="mt-4 text-[10px]"
                    style={{ color: "rgba(255,255,255,0.38)", letterSpacing: "0.06em" }}
                  >
                    Ley P1 · render-only · campos sin datos se marcan, no se inventan
                  </p>
                </div>
              )}
            </GlassCard>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function PhysicsCell({
  label, m, signed = false, numeric = false,
}: { label: string; m: PhysicsMetric; signed?: boolean; numeric?: boolean }) {
  if (!m.available) {
    return <MetricCell label={label} value="—" hint={`ventana ${fmtAge(m.windowSec)}`} unavailable />;
  }
  // Sólo aplicamos color por SIGNO en métricas con signo (puro formato, no umbral).
  const display = numeric
    ? m.value.toFixed(2)
    : signed
      ? (m.value > 0 ? "+" : "") + fmtBps(m.value)
      : fmtBps(m.value);
  const color = signed
    ? (m.value > 0 ? "#22c55e" : m.value < 0 ? "#ef4444" : undefined)
    : undefined;
  return <MetricCell label={label} value={display} hint={`ventana ${fmtAge(m.windowSec)}`} color={color} />;
}

function topName(t: TotemProfile | null): string {
  if (!t) return "—";
  return t.name || t.address.slice(0, 6) + "…" + t.address.slice(-4);
}
