/**
 * PriceChart.tsx — Gráfica de precio histórico de un Totem (Recharts)
 */

import { useEffect, useState } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { getTotemHistory, type TotemHistory } from "../../../lib/tradeApi";

interface Props {
  totemAddress: string;
  isDark:       boolean;
}

export default function PriceChart({ totemAddress, isDark }: Props) {
  const [data,    setData]    = useState<TotemHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getTotemHistory(totemAddress, 48)
      .then(setData)
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [totemAddress]);

  const bg     = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)";
  const border = isDark ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.09)";
  const txt    = isDark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.55)";

  const chartData = data.map(d => ({
    ts:    new Date(d.timestamp).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" }),
    price: d.price,
  }));

  if (loading) {
    return (
      <div style={{ background: bg, borderRadius: 14, border: `1px solid ${border}`,
        padding: 16, height: 120, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 24, height: 24, borderRadius: "50%",
          border: "2px solid #6366f1", borderTopColor: "transparent",
          animation: "spin 0.7s linear infinite" }} />
      </div>
    );
  }

  if (data.length < 2) {
    return (
      <div style={{ background: bg, borderRadius: 14, border: `1px solid ${border}`,
        padding: 16, textAlign: "center" }}>
        <p style={{ color: txt, fontSize: 12 }}>Sin historial de precios aún</p>
      </div>
    );
  }

  const minP = Math.min(...chartData.map(d => d.price));
  const maxP = Math.max(...chartData.map(d => d.price));

  return (
    <div style={{ background: bg, borderRadius: 14, border: `1px solid ${border}`, padding: "14px 12px 8px" }}>
      <div style={{ fontSize: 11, fontWeight: 700,
        color: isDark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.55)",
        marginBottom: 8, paddingLeft: 2 }}>
        Precio (últimas {data.length} snapshots)
      </div>
      <ResponsiveContainer width="100%" height={100}>
        <AreaChart data={chartData} margin={{ top: 2, right: 4, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <XAxis dataKey="ts" hide tick={{ fontSize: 9, fill: txt }} interval="preserveStartEnd" />
          <YAxis domain={[minP * 0.99, maxP * 1.01]} hide />
          <Tooltip
            contentStyle={{
              background: isDark ? "#1f1f1f" : "#fff",
              border: `1px solid ${border}`,
              borderRadius: 8, fontSize: 11,
            }}
            formatter={(v: number) => [v.toFixed(10) + " WLD", "Precio"]}
            labelStyle={{ color: txt }}
          />
          <Area
            type="monotone" dataKey="price"
            stroke="#6366f1" strokeWidth={2}
            fill="url(#priceGrad)"
            dot={false} activeDot={{ r: 3 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
