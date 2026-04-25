"use client";

import {
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Scatter,
  ScatterChart as RechartsScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type ScatterSeries = {
  data: Record<string, unknown>[];
  name: string;
  color?: string;
  xKey: string;
  yKey: string;
};

type ScatterChartProps = {
  series: ScatterSeries[];
  xLabel?: string;
  yLabel?: string;
  height?: number;
};

const DEFAULT_COLORS = [
  "var(--color-chart-series-1)",
  "var(--color-chart-series-2)",
  "var(--color-chart-series-3)",
  "var(--color-chart-series-4)",
  "var(--color-chart-series-5)",
];

/** Scatter chart wrapper around Recharts. Maps to Dash px.scatter. */
export function ScatterChart({ series, xLabel, yLabel, height = 320 }: ScatterChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsScatterChart margin={{ top: 8, right: 24, left: 0, bottom: xLabel ? 28 : 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-stroke-primary)" />
        <XAxis
          type="number"
          dataKey={series[0]?.xKey}
          name={xLabel}
          tick={{ fontSize: 12, fontFamily: "var(--font-regular)" }}
          label={xLabel ? { value: xLabel, position: "insideBottom", offset: -16, fontSize: 12 } : undefined}
        />
        <YAxis
          type="number"
          dataKey={series[0]?.yKey}
          name={yLabel}
          tick={{ fontSize: 12, fontFamily: "var(--font-regular)" }}
          label={yLabel ? { value: yLabel, angle: -90, position: "insideLeft", fontSize: 12 } : undefined}
        />
        <Tooltip
          cursor={{ strokeDasharray: "3 3" }}
          contentStyle={{
            fontFamily: "var(--font-regular)",
            fontSize: 13,
            border: "1px solid var(--color-stroke-primary)",
            borderRadius: 6,
          }}
        />
        <Legend wrapperStyle={{ fontSize: 12, fontFamily: "var(--font-regular)" }} />
        {series.map((s, i) => (
          <Scatter
            key={s.name}
            name={s.name}
            data={s.data}
            dataKey={s.yKey}
            fill={s.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length]}
            opacity={0.8}
          />
        ))}
      </RechartsScatterChart>
    </ResponsiveContainer>
  );
}
