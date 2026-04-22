/**
 * MarketPhysicsPanel — Pulso agregado del mercado para DiscoveryPage.
 *
 * Ley P1: render-only. Consume /api/system/physics. Sin métricas inventadas.
 */
import { useEffect, useRef, useState } from "react";
import { getSystemPhysics, type SystemPhysics } from "../../lib/tradeApi";
import { fmtBps, fmtWld } from "../services/viewModel";
import {
  GlassCard, SectionHeader, Pill, MetricCell, BiasHalo, MicroSparkline,
  BIAS_COLOR,
} from "./_premium";

interface Props {
  /** Tiempo (ms) entre refreshes. Default 15s. 0 = sin refresh. */
  refreshMs?: number;
}

const SPARK_LEN = 24;

export default function MarketPhysicsPanel({ refreshMs = 15_000 }: Props) {
  const [data,  setData]  = useState<SystemPhysics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const presSpark = useRef<number[]>([]);
  const momSpark  = useRef<number[]>([]);

  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setInterval> | null = null;

    const load = async () => {
      try {
        const d = await getSystemPhysics();
        if (!alive) return;
        setData(d);
        setError(null);
        if (d.curvePressureBps.available) {
          presSpark.current = [...presSpark.current, d.curvePressureBps.value].slice(-SPARK_LEN);
        }
        if (d.buyMomentumBps.available) {
          momSpark.current = [...momSpark.current, d.buyMomentumBps.value].slice(-SPARK_LEN);
        }
      } catch (e) {
        if (alive) setError((e as Error).message);
      }
    };

    load();
    if (refreshMs > 0) timer = setInterval(load, refreshMs);
    return () => { alive = false; if (timer) clearInterval(timer); };
  }, [refreshMs]);

  const biasColor = data ? BIAS_COLOR[data.systemBias] : "#7a7a85";

  return (
    <div className="px-3 mt-3">
      <GlassCard tint={biasColor} intensity={1} className="p-3.5">
        <BiasHalo color={biasColor} opacity={0.14} />

        <SectionHeader
          title="Pulso de mercado"
          dotColor={biasColor}
          right={
            <div className="flex items-center gap-2">
              {data && (
                <Pill label={data.systemBias} color={biasColor} glow />
              )}
              {error && (
                <span className="text-[10px]" style={{ color: "#ef4444" }}>{error}</span>
              )}
            </div>
          }
        />

        <div className="relative z-10 grid grid-cols-3 gap-2">
          {/* Color de la celda = biasColor (backend). Sin umbrales locales. */}
          <MetricCell
            label="Presión"
            value={data && data.curvePressureBps.available ? signed(data.curvePressureBps.value) : "—"}
            unavailable={!data || !data.curvePressureBps.available}
            trailing={presSpark.current.length > 1 ? <MicroSparkline points={presSpark.current} color={biasColor} width={48} height={14} /> : null}
          />
          <MetricCell
            label="Momentum"
            value={data && data.buyMomentumBps.available ? fmtBps(data.buyMomentumBps.value) : "—"}
            unavailable={!data || !data.buyMomentumBps.available}
            trailing={momSpark.current.length > 1 ? <MicroSparkline points={momSpark.current} color="#a78bfa" width={48} height={14} /> : null}
          />
          <MetricCell
            label="Volat."
            value={data && data.volatilityBps.available ? fmtBps(data.volatilityBps.value) : "—"}
            unavailable={!data || !data.volatilityBps.available}
          />
        </div>

        {data?.topTotem && (
          <p className="relative z-10 mt-3 flex items-center gap-1.5 text-[11px]"
             style={{ color: "rgba(255,255,255,0.55)" }}>
            <span style={{ color: biasColor, fontWeight: 700 }}>↑</span>
            Líder
            <span className="opacity-90" style={{ color: "rgba(255,255,255,0.85)" }}>
              {data.topTotem.name || data.topTotem.address.slice(0, 8)}
            </span>
            <span className="opacity-60">·</span>
            <span className="tabular-nums">{fmtWld(data.topTotem.volume_24h, 2)}</span>
          </p>
        )}
      </GlassCard>
    </div>
  );
}

function signed(v: number): string {
  return (v > 0 ? "+" : "") + fmtBps(v);
}
