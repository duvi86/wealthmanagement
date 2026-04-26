"use client";

import {
  Bar,
  BarChart as RechartsBarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type BarSeries = { dataKey: string; name?: string; color?: string; colorKey?: string };

type BarChartProps = {
  data: Record<string, unknown>[];
  xKey: string;
  series: BarSeries[];
  height?: number | `${number}%`;
  stacked?: boolean;
  xLabel?: string;
  yLabel?: string;
  formatValue?: (value: number) => string;
  yTickFormatter?: (value: number) => string;
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

type CustomTooltipProps = {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: Record<string, unknown> }>;
  formatValue?: (v: number) => string;
};

function CustomTooltip({ active, payload, formatValue = String }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  if (!entry) return null;
  const pct = (entry.payload.pct as string) || "";
  return (
    <div
      style={{
        background: "var(--color-surface-primary)",
        border: "1px solid var(--color-stroke-primary)",
        borderRadius: "var(--border-radius-medium)",
        padding: "8px 12px",
        fontFamily: "var(--font-regular)",
        fontSize: 13,
      }}
    >
      <p style={{ margin: "0 0 4px", fontFamily: "var(--font-bold)" }}>{entry.name}</p>
      <p style={{ margin: "0 0 2px" }}>
        <span style={{ color: "var(--color-text-subtle)" }}>Amount: </span>
        {formatValue(entry.value)}
      </p>
      {pct && (
        <p style={{ margin: 0 }}>
          <span style={{ color: "var(--color-text-subtle)" }}>Share: </span>
          <strong>{pct}%</strong>
        </p>
      )}
    </div>
  );
}

/** Bar chart wrapper around Recharts. Maps to Dash create_bar_chart / create_stacked_bar_chart. */
export function BarChart({
  data,
  xKey,
  series,
  height = 300,
  stacked = false,
  xLabel,
  yLabel,
  formatValue = String,
  yTickFormatter,
}: BarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsBarChart data={data} margin={{ top: 24, right: 16, left: 0, bottom: xLabel ? 24 : 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-stroke-primary)" />
        <XAxis
          dataKey={xKey}
          tick={{ fontSize: 12, fontFamily: "var(--font-regular)" }}
          label={xLabel ? { value: xLabel, position: "insideBottom", offset: -12, fontSize: 12 } : undefined}
        />
        <YAxis
          tickFormatter={yTickFormatter ?? formatCompactAxisValue}
          tick={{ fontSize: 12, fontFamily: "var(--font-regular)" }}
          label={yLabel ? { value: yLabel, angle: -90, position: "insideLeft", fontSize: 12 } : undefined}
        />
        <Tooltip content={<CustomTooltip formatValue={formatValue} />} />
        {series.some((s) => s.name) && <Legend wrapperStyle={{ fontSize: 12, fontFamily: "var(--font-regular)" }} />}
        {series.map((s, i) => (
          <Bar
            key={s.dataKey}
            dataKey={s.dataKey}
            name={s.name ?? s.dataKey}
            fill={s.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length]}
            stackId={stacked ? "stack" : undefined}
            radius={stacked ? undefined : [3, 3, 0, 0]}
            label={
              data.some((d) => d.pct)
                ? {
                    dataKey: "pct",
                    position: "top",
                    fill: "var(--color-text-default)",
                    fontSize: 11,
                    fontFamily: "var(--font-regular)",
                    formatter: (value: unknown) => `${value ?? ""}%`,
                  }
                : false
            }
          >
            {s.colorKey
              ? data.map((row, idx) => (
                  <Cell
                    key={`${s.dataKey}-cell-${idx}`}
                    fill={String((row[s.colorKey as string] as string | undefined) ?? s.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length])}
                  />
                ))
              : null}
          </Bar>
        ))}
      </RechartsBarChart>
    </ResponsiveContainer>
  );
}
