/**
 * TokenInsightsPanel — 3 capas de lectura premium para TokenPage.
 *   1) Oracle Narrative   → narrative + score + influencia + deltas + edad
 *   2) Curve Reaction     → precio + supply + tensión + último trade
 *   3) Risk / Trust Field → status + risk subdomain + graduación
 *
 * Ley P1 estricta: SOLO renderiza campos pre-cocinados por el backend
 * (compose() + extendViewModel()). Si un campo opcional no llega → se oculta.
 */
import { motion } from "framer-motion";
import {
  fmtWld, fmtCount, fmtBps, fmtDelta, fmtAge,
  STATUS_COLORS, STATUS_LABELS, NARRATIVE_COLORS,
  type TotemViewModel, type VMField, type OracleNarrative,
} from "../services/viewModel";
import {
  GlassCard, SectionHeader, Pill, PulseDot, MetricCell,
  AnimatedBar, SourceDot, BiasHalo,
  trustGradient, riskGradient, tensionGradient, SPRING, useReducedMotion,
} from "./_premium";

interface Props {
  vm: TotemViewModel;
}

export default function TokenInsightsPanel({ vm }: Props) {
  return (
    <div className="flex flex-col gap-3 px-3 pb-4" aria-label="Lectura del tótem">
      <OracleLayer vm={vm} />
      <CurveLayer  vm={vm} />
      <RiskLayer   vm={vm} />
    </div>
  );
}

/* ──────────────────────────── 1. Oracle Narrative ──────────────────────────── */

function OracleLayer({ vm }: { vm: TotemViewModel }) {
  const o   = vm.oracle;
  const nar = o.narrative?.value ?? null;
  // Edad pre-cocinada por el backend. Si no existe, no se renderiza.
  const ageSec = o.signedAgeSec?.value ?? null;
  const tint = nar ? NARRATIVE_COLORS[nar] : "#a78bfa";

  return (
    <GlassCard tint={tint} intensity={nar ? 1.1 : 0.6} className="p-3.5">
      <BiasHalo color={tint} opacity={nar ? 0.18 : 0.08} />
      <SectionHeader
        title="Narrativa Oracle"
        dotColor={tint}
        right={
          <div className="flex items-center gap-1.5">
            {o._sla?.stale && (
              <span className="rounded-full px-2 py-0.5 text-[9px] font-semibold"
                style={{ background: "rgba(245,158,11,0.15)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.3)" }}>
                stale {fmtAge(o._sla.ageSec)}
              </span>
            )}
            {nar && <Pill label={nar} color={NARRATIVE_COLORS[nar]} glow />}
          </div>
        }
      />

      <div className="relative z-10 grid grid-cols-2 gap-2">
        <MetricCell
          label="Score"
          value={fmtCount(num(o.score.value))}
          color={tint}
          trailing={<SourceDot src={o.score.source} />}
          hint={o.score.stale ? "desactualizado" : undefined}
        />
        <MetricCell
          label="Influencia"
          value={fmtCount(num(o.influence.value))}
          trailing={<SourceDot src={o.influence.source} />}
          hint={o.influence.stale ? "desactualizado" : undefined}
        />
        <MetricCell
          label="Δ Score"
          value={fmtDelta(num(o.scoreDelta.value))}
          color={num(o.scoreDelta.value) > 0 ? "#22c55e" : num(o.scoreDelta.value) < 0 ? "#ef4444" : undefined}
        />
        <MetricCell
          label="Δ Influencia"
          value={fmtDelta(num(o.influenceDelta.value))}
          color={num(o.influenceDelta.value) > 0 ? "#22c55e" : num(o.influenceDelta.value) < 0 ? "#ef4444" : undefined}
        />
      </div>

      {ageSec != null && (
        <p className="relative z-10 mt-3 text-[10.5px]"
           style={{ color: "rgba(255,255,255,0.45)", letterSpacing: "0.04em" }}>
          Última firma del oráculo hace <span className="opacity-90 tabular-nums">{fmtAge(ageSec)}</span>
        </p>
      )}
    </GlassCard>
  );
}

/* ──────────────────────────── 2. Curve Reaction ────────────────────────────── */

function CurveLayer({ vm }: { vm: TotemViewModel }) {
  const m = vm.market;
  const tension = m.curveTensionBps?.value ?? null;
  // Edad pre-cocinada por el backend. Si no existe, no se renderiza.
  const lastTradeAge = m.lastTradeAgeSec?.value ?? null;

  return (
    <GlassCard tint="#60a5fa" intensity={0.9} className="p-3.5">
      <SectionHeader
        title="Reacción de la curva"
        dotColor="#60a5fa"
        right={
          m._sla?.stale ? (
            <span className="rounded-full px-2 py-0.5 text-[9px] font-semibold"
              style={{ background: "rgba(245,158,11,0.15)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.3)" }}>
              stale {fmtAge(m._sla.ageSec)}
            </span>
          ) : null
        }
      />

      <div className="relative z-10 grid grid-cols-2 gap-2">
        <MetricCell
          label="Precio"
          value={fmtWld(m.price.value as number | string | null, 6)}
          trailing={<SourceDot src={m.price.source} />}
          hint={m.price.stale ? "desactualizado" : undefined}
        />
        <MetricCell
          label="Supply"
          value={fmtCount(num(m.supply.value))}
          trailing={<SourceDot src={m.supply.source} />}
        />
        <MetricCell
          label="Volumen visto"
          value={fmtWld(m.volumeShown.value as number | string | null, 2)}
          trailing={<SourceDot src={m.volumeShown.source} />}
        />
        <MetricCell
          label="Edad"
          value={fmtAge(num(m.ageSec.value))}
        />
      </div>

      {lastTradeAge != null && (
        <div className="relative z-10 mt-2 flex items-center gap-2 text-[10.5px]"
             style={{ color: "rgba(255,255,255,0.62)" }}>
          <PulseDot color="#60a5fa" size={5} />
          Último trade hace <span className="tabular-nums opacity-90">{fmtAge(lastTradeAge)}</span>
        </div>
      )}

      {tension != null && (
        <div className="relative z-10 mt-3">
          <div className="mb-1.5 flex items-center justify-between text-[10.5px]"
               style={{ color: "rgba(255,255,255,0.62)" }}>
            <span>Tensión de curva</span>
            <span className="tabular-nums" style={{ color: "#a78bfa" }}>{fmtBps(tension)}</span>
          </div>
          <AnimatedBar bps={tension} gradient={tensionGradient()} height={6} />
        </div>
      )}
    </GlassCard>
  );
}

/* ──────────────────────────── 3. Risk / Trust ──────────────────────────────── */

function RiskLayer({ vm }: { vm: TotemViewModel }) {
  const s    = vm.status;
  const p    = vm.progression;
  const r    = vm.risk;
  const grad = p.graduation.value;
  const overall    = s.overall;
  const overallBps = grad?.overallBps ?? 0;
  const statusColor = STATUS_COLORS[overall];

  // Flags renderizadas tal cual vienen del backend. La severidad la define
  // vm.status.overall (backend), no la UI: cuando overall != "OK" la card
  // entera se tinta con statusColor y los chips activos heredan ese color.
  const activeColor = statusColor;
  const flags: Array<{ k: string; v: boolean | null }> = [
    { k: "Bloqueo de fraude", v: s.fraudLocked.value   },
    { k: "Congelado",         v: s.frozen.value        },
    { k: "Modo emergencia",   v: s.emergencyMode.value },
    { k: "Graduado",          v: s.graduated.value     },
    { k: "Es humano",         v: s.isHuman.value       },
  ];

  return (
    <GlassCard tint={statusColor} intensity={overall === "OK" ? 0.7 : 1.2} className="p-3.5">
      <BiasHalo color={statusColor} opacity={overall === "OK" ? 0.08 : 0.22} />

      <SectionHeader
        title="Riesgo y confianza"
        dotColor={statusColor}
        right={
          <div className="flex items-center gap-1.5">
            {(r?._sla ?? s._sla)?.stale && (
              <span className="rounded-full px-2 py-0.5 text-[9px] font-semibold"
                style={{ background: "rgba(245,158,11,0.15)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.3)" }}>
                stale
              </span>
            )}
            <Pill label={STATUS_LABELS[overall]} color={statusColor} glow={overall !== "OK"} />
          </div>
        }
      />

      {/* Flags compactos — color activo = statusColor (backend) */}
      <div className="relative z-10 mb-3 flex flex-wrap gap-1.5">
        {flags.map((f) => <FlagChip key={f.k} k={f.k} v={f.v} activeColor={activeColor} />)}
      </div>

      {/* Risk subdomain */}
      {r && (
        <div className="relative z-10 flex flex-col gap-2.5">
          {r.trustLevelBps?.value != null && (
            <BarRow
              label="Nivel de confianza"
              bps={r.trustLevelBps!.value as number}
              gradient={trustGradient()}
            />
          )}
          {r.manipulationRiskBps?.value != null && (
            <BarRow
              label="Riesgo de manipulación"
              bps={r.manipulationRiskBps!.value as number}
              gradient={riskGradient()}
            />
          )}
          {r.negativeEvents?.value != null && Number(r.negativeEvents.value) > 0 && (
            <div className="flex items-center justify-between text-[11px]">
              <span style={{ color: "rgba(255,255,255,0.62)" }}>Eventos negativos</span>
              <span className="tabular-nums" style={{ color: "#ef4444", fontWeight: 700 }}>
                {fmtCount(Number(r.negativeEvents.value))}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Graduation */}
      <div className="relative z-10 mt-3">
        <div className="mb-1.5 flex items-center justify-between text-[10.5px]"
             style={{ color: "rgba(255,255,255,0.62)" }}>
          <span>Avance a graduación</span>
          <span className="tabular-nums" style={{ color: statusColor }}>{fmtBps(overallBps)}</span>
        </div>
        <AnimatedBar
          bps={overallBps}
          gradient={`linear-gradient(90deg, ${statusColor}88 0%, ${statusColor} 100%)`}
          height={6}
        />
        {grad?.bottleneckGate && (
          <p className="mt-1 text-[10px]" style={{ color: "rgba(255,255,255,0.42)" }}>
            Cuello de botella: <span className="opacity-90">{grad.bottleneckGate}</span>
          </p>
        )}
      </div>
    </GlassCard>
  );
}

/* ──────────────────────────── primitives ──────────────────────────── */

function FlagChip({ k, v, activeColor }: { k: string; v: boolean | null; activeColor: string }) {
  const known = typeof v === "boolean";
  const active = known && v;
  const color  = active ? activeColor : "rgba(255,255,255,0.45)";
  const bg     = active ? `${activeColor}1a` : "rgba(255,255,255,0.04)";
  const border = active ? `${activeColor}55` : "rgba(255,255,255,0.08)";
  const reduce = useReducedMotion();
  return (
    <motion.span
      whileHover={reduce ? undefined : { scale: 1.04 }}
      transition={SPRING}
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9.5px] font-semibold"
      style={{ background: bg, color, border: `1px solid ${border}`, letterSpacing: "0.04em" }}
    >
      <span style={{
        width: 5, height: 5, borderRadius: 999,
        background: known ? color : "rgba(255,255,255,0.30)",
        boxShadow: active ? `0 0 6px ${color}` : "none",
      }} />
      {k}
      <span className="opacity-75">{!known ? "—" : v ? "sí" : "no"}</span>
    </motion.span>
  );
}

function BarRow({ label, bps, gradient }: { label: string; bps: number; gradient: string }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[10.5px]"
           style={{ color: "rgba(255,255,255,0.62)" }}>
        <span>{label}</span>
        <span className="tabular-nums opacity-90">{fmtBps(bps)}</span>
      </div>
      <AnimatedBar bps={bps} gradient={gradient} height={6} />
    </div>
  );
}

/* ──────────────────────────── helpers ──────────────────────────── */

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
