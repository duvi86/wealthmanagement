"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart as RechartsLineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type LineSeries = { dataKey: string; name?: string; color?: string };
type LineReference = { x: string | number; label?: string; color?: string; strokeDasharray?: string };

type LineChartProps = {
  data: Record<string, unknown>[];
  xKey: string;
  series: LineSeries[];
  referenceLines?: LineReference[];
  height?: number | `${number}%`;
  xLabel?: string;
  yLabel?: string;
  yTickFormatter?: (value: number) => string;
  tooltipLabelFormatter?: (label: string | number) => string;
  tooltipValueFormatter?: (value: number, name: string) => string;
};

const DEFAULT_COLORS = [
  "var(--color-chart-series-1)",
  "var(--color-chart-series-2)",
  "var(--color-chart-series-3)",
  "var(--color-chart-series-4)",
  "var(--color-chart-series-5)",
  "var(--color-chart-series-6)",
  "var(--color-chart-series-7)",
  "var(--color-chart-series-8)",
  "var(--color-chart-series-9)",
  "var(--color-chart-series-10)",
];

function formatCompactAxisValue(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(1)}k`;
  return `${value}`;
}

/** Line chart wrapper around Recharts. Maps to Dash create_line_chart. */
export function LineChart({
  data,
  xKey,
  series,
  referenceLines = [],
  height = 300,
  xLabel,
  yLabel,
  yTickFormatter,
  tooltipLabelFormatter,
  tooltipValueFormatter,
}: LineChartProps) {
  // Compute smart Y-axis domain to avoid empty space
  let minValue = Infinity;
  let maxValue = -Infinity;
  data.forEach((row) => {
    series.forEach((s) => {
      const val = Number(row[s.dataKey] ?? 0);
      if (val < minValue) minValue = val;
      if (val > maxValue) maxValue = val;
    });
  });

  const range = maxValue - minValue;
  const safeRange = range === 0 ? Math.max(Math.abs(maxValue), 1) * 0.1 : range;
  const padding = safeRange * 0.05;
  let yMin = minValue - padding;
  let yMax = maxValue + padding;

  // Keep 0 in the domain if data is close to it
  if (minValue >= 0 && minValue < range * 0.1) {
    yMin = 0;
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsLineChart
        data={data}
        margin={{ top: 8, right: 16, left: 0, bottom: xLabel ? 24 : 8 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-stroke-primary)" />
        <XAxis
          dataKey={xKey}
          tick={{ fontSize: 12, fontFamily: "var(--font-regular)" }}
          label={xLabel ? { value: xLabel, position: "insideBottom", offset: -12, fontSize: 12 } : undefined}
        />
        <YAxis
          domain={[yMin, yMax]}
          tickFormatter={yTickFormatter ?? formatCompactAxisValue}
          tick={{ fontSize: 12, fontFamily: "var(--font-regular)" }}
          label={yLabel ? { value: yLabel, angle: -90, position: "insideLeft", fontSize: 12 } : undefined}
        />
        <Tooltip
          labelFormatter={tooltipLabelFormatter}
          formatter={(value, name) => {
            const numericValue = Number(value);
            if (!Number.isFinite(numericValue)) {
              return [String(value), name];
            }
            const formattedValue = tooltipValueFormatter
              ? tooltipValueFormatter(numericValue, String(name))
              : numericValue.toLocaleString("en-GB");
            return [formattedValue, name];
          }}
          contentStyle={{
            fontFamily: "var(--font-regular)",
            fontSize: 13,
            border: "1px solid var(--color-stroke-primary)",
            borderRadius: "var(--border-radius-medium)",
          }}
        />
        <Legend wrapperStyle={{ fontSize: 12, fontFamily: "var(--font-regular)" }} />
        {referenceLines.map((line) => (
          <ReferenceLine
            key={`${line.x}-${line.label ?? "reference"}`}
            x={line.x}
            stroke={line.color ?? "var(--color-text-subtle)"}
            strokeDasharray={line.strokeDasharray ?? "4 4"}
            label={line.label ? { value: line.label, position: "insideTopRight", fontSize: 12 } : undefined}
          />
        ))}
        {series.map((s, i) => (
          <Line
            key={s.dataKey}
            dataKey={s.dataKey}
            name={s.name ?? s.dataKey}
            stroke={s.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length]}
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
            type="monotone"
          />
        ))}
      </RechartsLineChart>
    </ResponsiveContainer>
  );
}
