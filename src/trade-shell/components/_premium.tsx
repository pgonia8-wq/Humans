/**
 * _premium.tsx — Primitivos visuales 2026 para los 3 sistemas TOTEM.
 *
 * Ley P1: ESTOS COMPONENTES NO CALCULAN NADA. Solo renderizan props.
 * Toda decisión de color/estado/etiqueta proviene del backend.
 */
import { motion, useReducedMotion, type MotionStyle, type Transition } from "framer-motion";
import type { ReactNode, CSSProperties } from "react";

export { useReducedMotion };

// ──────────────────────────────────────────────────────────────────────────
// Design tokens
// ──────────────────────────────────────────────────────────────────────────

export const SPRING: Transition = { type: "spring", stiffness: 240, damping: 26, mass: 0.7 };
export const SPRING_SOFT: Transition = { type: "spring", stiffness: 140, damping: 22, mass: 0.9 };

export const BIAS_COLOR = {
  BULL:    "#22c55e",
  NEUTRAL: "#a78bfa",
  BEAR:    "#ef4444",
} as const;

export const STATE_COLOR = {
  ok:      "#22c55e",
  info:    "#60a5fa",
  warn:    "#f59e0b",
  danger:  "#ef4444",
  muted:   "#7a7a85",
  accent:  "#a78bfa",
} as const;

// ──────────────────────────────────────────────────────────────────────────
// GlassCard — capa base con glassmorphism dinámico por color tinte
// ──────────────────────────────────────────────────────────────────────────

export function GlassCard({
  tint,
  children,
  className = "",
  intensity = 1,
  style,
}: {
  tint?: string;
  children: ReactNode;
  className?: string;
  intensity?: number;
  style?: CSSProperties;
}) {
  const reduce = useReducedMotion();
  const c = tint ?? "#ffffff";
  const a = Math.max(0, Math.min(1, intensity));
  return (
    <motion.section
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduce ? { duration: 0 } : SPRING}
      className={`relative overflow-hidden rounded-2xl ${className}`}
      style={{
        background: `linear-gradient(160deg, ${c}${hex(0.06 * a)} 0%, rgba(18,18,22,0.65) 55%, rgba(12,12,15,0.82) 100%)`,
        border:     `1px solid ${c}${hex(0.18 * a)}`,
        boxShadow:  `0 1px 0 0 rgba(255,255,255,0.05) inset, 0 12px 40px -12px ${c}${hex(0.18 * a)}, 0 24px 80px -30px rgba(0,0,0,0.6)`,
        backdropFilter: "blur(18px) saturate(140%)",
        WebkitBackdropFilter: "blur(18px) saturate(140%)",
        color: "#ececf0",
        ...style,
      }}
    >
      {/* corner gleam */}
      <span
        aria-hidden
        className="pointer-events-none absolute -inset-px"
        style={{
          background: `radial-gradient(120% 80% at 0% 0%, ${c}${hex(0.10 * a)} 0%, transparent 45%)`,
        }}
      />
      {children}
    </motion.section>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// SectionHeader — header consistente con dot de estado opcional
// ──────────────────────────────────────────────────────────────────────────

export function SectionHeader({
  title,
  right,
  dotColor,
}: { title: string; right?: ReactNode; dotColor?: string }) {
  return (
    <header className="relative z-10 mb-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        {dotColor && <PulseDot color={dotColor} />}
        <h3
          className="text-[10.5px] font-semibold uppercase"
          style={{ letterSpacing: "0.14em", color: "rgba(255,255,255,0.62)" }}
        >
          {title}
        </h3>
      </div>
      {right}
    </header>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// PulseDot — dot animado para indicar "live"
// ──────────────────────────────────────────────────────────────────────────

export function PulseDot({ color, size = 6 }: { color: string; size?: number }) {
  const reduce = useReducedMotion();
  return (
    <span className="relative inline-flex" style={{ width: size, height: size }}>
      {!reduce && (
        <motion.span
          animate={{ scale: [1, 1.9, 1], opacity: [0.6, 0, 0.6] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
          className="absolute inset-0 rounded-full"
          style={{ background: color }}
        />
      )}
      <span
        className="relative inline-block rounded-full"
        style={{ width: size, height: size, background: color, boxShadow: `0 0 8px ${color}` }}
      />
    </span>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Pill — chip semántico con glow sutil
// ──────────────────────────────────────────────────────────────────────────

export function Pill({
  label,
  color,
  sub,
  glow = false,
}: { label: string; color: string; sub?: string; glow?: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold"
      style={{
        background: color + "1f",
        color,
        border:     `1px solid ${color}55`,
        letterSpacing: "0.06em",
        boxShadow: glow ? `0 0 18px -4px ${color}88` : undefined,
      }}
    >
      <span style={{ textTransform: "uppercase" }}>{label}</span>
      {sub && <span className="font-medium opacity-70">· {sub}</span>}
    </span>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// MetricCell — celda densa estilo Bloomberg
// ──────────────────────────────────────────────────────────────────────────

export function MetricCell({
  label,
  value,
  hint,
  color,
  trailing,
  unavailable,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  color?: string;
  trailing?: ReactNode;
  unavailable?: boolean;
}) {
  const c = color ?? "rgba(255,255,255,0.92)";
  const reduce = useReducedMotion();
  return (
    <motion.div
      whileHover={reduce ? undefined : { y: -1 }}
      transition={SPRING}
      className="relative rounded-xl p-2.5"
      style={{
        background: unavailable
          ? "rgba(255,255,255,0.015)"
          : "linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.015) 100%)",
        border: unavailable
          ? "1px dashed rgba(255,255,255,0.10)"
          : "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div className="flex items-center justify-between">
        <span
          className="text-[9.5px] font-semibold uppercase"
          style={{ color: "rgba(255,255,255,0.45)", letterSpacing: "0.12em" }}
        >
          {label}
        </span>
        {trailing}
      </div>
      <div
        className="mt-1 text-[14px] font-semibold tabular-nums"
        style={{ color: unavailable ? "rgba(255,255,255,0.30)" : c }}
      >
        {unavailable ? "sin datos" : value}
      </div>
      {hint && (
        <div className="mt-0.5 text-[9.5px]" style={{ color: "rgba(255,255,255,0.40)" }}>
          {hint}
        </div>
      )}
    </motion.div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// AnimatedBar — barra de progreso con spring
// ──────────────────────────────────────────────────────────────────────────

export function AnimatedBar({
  bps,
  gradient,
  height = 6,
}: { bps: number; gradient: string; height?: number }) {
  const reduce = useReducedMotion();
  const pct = Math.max(0, Math.min(100, bps / 100));
  return (
    <div
      className="relative w-full overflow-hidden rounded-full"
      style={{ background: "rgba(255,255,255,0.06)", height }}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
    >
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={reduce ? { duration: 0 } : SPRING_SOFT}
        className="h-full rounded-full"
        style={{ background: gradient, boxShadow: "0 0 10px -2px currentColor" }}
      />
      {!reduce && (
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 w-1/4"
          animate={{ x: ["-25%", "125%"] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
          style={{
            background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent)",
          }}
        />
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// BiasHalo — gradiente radial reactivo al bias del sistema
// ──────────────────────────────────────────────────────────────────────────

export function BiasHalo({ color, opacity = 0.18 }: { color: string; opacity?: number }) {
  const reduce = useReducedMotion();
  if (reduce) {
    return (
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: `radial-gradient(60% 50% at 50% 0%, ${color}${hex(opacity)} 0%, transparent 70%)` }}
      />
    );
  }
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none absolute inset-0"
      animate={{ opacity: [opacity * 0.7, opacity, opacity * 0.7] }}
      transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
      style={{
        background: `radial-gradient(60% 50% at 50% 0%, ${color}${hex(opacity)} 0%, transparent 70%)`,
      }}
    />
  );
}

// ──────────────────────────────────────────────────────────────────────────
// MicroSparkline — sparkline puro, recibe puntos pre-cocinados
// ──────────────────────────────────────────────────────────────────────────

export function MicroSparkline({
  points,
  color,
  width = 80,
  height = 20,
}: { points: number[]; color: string; width?: number; height?: number }) {
  if (!points.length) return <span className="text-[10px] opacity-40">—</span>;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const stepX = width / Math.max(1, points.length - 1);
  const path = points
    .map((v, i) => {
      const x = i * stepX;
      const y = height - ((v - min) / span) * height;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg width={width} height={height} aria-hidden>
      <defs>
        <linearGradient id={`spark-${color.slice(1)}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%"  stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${path} L${width},${height} L0,${height} Z`} fill={`url(#spark-${color.slice(1)})`} />
      <path d={path} stroke={color} strokeWidth={1.2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// SourceDot — origen del dato (onchain/indexed/db/mirror/unknown)
// ──────────────────────────────────────────────────────────────────────────

export const SOURCE_META: Record<string, { c: string; label: string }> = {
  onchain: { c: "#22c55e", label: "on-chain"  },
  indexed: { c: "#a78bfa", label: "indexer"   },
  db:      { c: "#60a5fa", label: "DB"        },
  mirror:  { c: "#f59e0b", label: "mirror"    },
  unknown: { c: "#777",    label: "unknown"   },
};

export function SourceDot({ src }: { src: string }) {
  const m = SOURCE_META[src] ?? SOURCE_META.unknown;
  return (
    <span
      title={m.label}
      aria-label={m.label}
      className="inline-block rounded-full"
      style={{ width: 6, height: 6, background: m.c, boxShadow: `0 0 6px ${m.c}88` }}
    />
  );
}

// ──────────────────────────────────────────────────────────────────────────
// helpers
// ──────────────────────────────────────────────────────────────────────────

function hex(a: number): string {
  const v = Math.round(Math.max(0, Math.min(1, a)) * 255).toString(16).padStart(2, "0");
  return v;
}

// ──────────────────────────────────────────────────────────────────────────
// Design-system gradient tokens — convenciones universales de presentación.
// NO derivan datos: pintan rangos canónicos (0% → 100%) que el backend ya
// definió como bps. La orientación rojo→verde / verde→rojo es el lenguaje
// universal financiero (mismo principio que fmtDelta usa "+/-"); no es lógica
// de negocio sino formato.
// ──────────────────────────────────────────────────────────────────────────

export function biasGradient(bias: keyof typeof BIAS_COLOR): string {
  const c = BIAS_COLOR[bias];
  return `linear-gradient(90deg, ${c} 0%, ${c}88 100%)`;
}

/** Trust: 0 bps = riesgo, 10000 bps = confianza máxima → rojo→verde. */
export function trustGradient(): string {
  return "linear-gradient(90deg, #ef4444 0%, #f59e0b 50%, #22c55e 100%)";
}

/** Risk: 0 bps = seguro, 10000 bps = manipulación máxima → verde→rojo. */
export function riskGradient(): string {
  return "linear-gradient(90deg, #22c55e 0%, #f59e0b 50%, #ef4444 100%)";
}

/** Tension: 0 bps = curva relajada, 10000 bps = al límite → frío→cálido. */
export function tensionGradient(): string {
  return "linear-gradient(90deg, #60a5fa 0%, #a78bfa 50%, #22c55e 100%)";
}

// re-export motion style helper for consumers if needed
export type { MotionStyle };
