import { memo } from "react";
import { motion } from "framer-motion";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { BarChart3 } from "lucide-react";
import { SectionBlock } from "../primitives/SectionBlock";
import type { ChartPoint } from "../../lib/types";

interface EarningsChartProps {
  chartData: ChartPoint[];
}

const tooltipStyle: React.CSSProperties = {
  backgroundColor: "rgba(8,8,18,0.92)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "12px",
  backdropFilter: "blur(16px)",
  color: "#fff",
  fontSize: 11,
  padding: "8px 14px",
  boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
};

export const EarningsChart = memo(function EarningsChart({ chartData }: EarningsChartProps) {
  return (
    <SectionBlock icon={BarChart3} title="Ganancias en el Tiempo" iconColor="text-violet-400">
      {!chartData.length ? (
        <div className="h-44 flex items-center justify-center">
          <p className="text-white/20 text-sm">Sin datos de ganancias aún</p>
        </div>
      ) : (
        <motion.div
          className="h-44"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 4, right: 0, left: -22, bottom: 0 }}>
              <defs>
                <linearGradient id="earnGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#34d399" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#7c3aed" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#34d399" />
                  <stop offset="100%" stopColor="#a78bfa" />
                </linearGradient>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 9 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 9 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: "rgba(255,255,255,0.06)", strokeWidth: 1 }} />
              <Area
                type="monotone"
                dataKey="earnings"
                stroke="url(#lineGrad)"
                strokeWidth={2}
                fill="url(#earnGrad)"
                dot={false}
                activeDot={{ r: 5, fill: "#34d399", stroke: "rgba(255,255,255,0.2)", strokeWidth: 1, filter: "url(#glow)" }}
                isAnimationActive={true}
                animationDuration={1200}
              />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>
      )}
    </SectionBlock>
  );
});
