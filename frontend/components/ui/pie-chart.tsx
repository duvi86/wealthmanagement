"use client";

import {
  Cell,
  Legend,
  Pie,
  PieChart as RechartsPieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

type PieChartProps = {
  data: Record<string, unknown>[];
  dataKey: string;
  nameKey: string;
  height?: number | `${number}%`;
  formatValue?: (value: number) => string;
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

type CustomTooltipProps = {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: Record<string, unknown> }>;
  total: number;
  formatValue: (v: number) => string;
};

function CustomTooltip({ active, payload, total, formatValue }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  if (!entry) return null;
  const pct = total > 0 ? ((entry.value / total) * 100).toFixed(1) : "0.0";
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
      <p style={{ margin: 0 }}>
        <span style={{ color: "var(--color-text-subtle)" }}>Share: </span>
        <strong>{pct}%</strong>
      </p>
    </div>
  );
}

/** Pie chart wrapper around Recharts. Tooltip shows absolute amount and percentage share. */
export function PieChart({ data, dataKey, nameKey, height = 420, formatValue = String }: PieChartProps) {
  const total = data.reduce((sum, d) => sum + Number(d[dataKey] ?? 0), 0);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsPieChart>
          <Pie
            data={data}
            dataKey={dataKey}
            nameKey={nameKey}
            cx="50%"
            cy="50%"
            outerRadius="76%"
            innerRadius="50%"
            paddingAngle={1}
            strokeWidth={0}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={DEFAULT_COLORS[i % DEFAULT_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip total={total} formatValue={formatValue} />} />
          <Legend
            iconType="circle"
            iconSize={10}
            wrapperStyle={{
              fontSize: 13,
              fontFamily: "var(--font-regular)",
              paddingTop: 12,
              paddingLeft: 8,
              paddingRight: 8,
              lineHeight: 1.6,
            }}
            layout="vertical"
            align="center"
            verticalAlign="bottom"
          />
        </RechartsPieChart>
      </ResponsiveContainer>
    );
  }
