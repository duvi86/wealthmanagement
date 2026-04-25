"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

type GaugeChartProps = {
  value: number;
  max?: number;
  label?: string;
  size?: number;
  color?: string;
};

/**
 * Half-donut gauge chart.
 * Maps to Dash create_gauge_chart.
 * value: current value; max: maximum (default 100).
 */
export function GaugeChart({ value, max = 100, label, size = 200, color }: GaugeChartProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const fill = color ?? getGaugeColor(pct);

  const data = [
    { name: "value", v: pct },
    { name: "empty", v: 100 - pct },
  ];

  return (
    <div className="gauge-root" style={{ width: size, height: size / 2 + 32 }}>
      <ResponsiveContainer width="100%" height={size / 2 + 8}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="100%"
            startAngle={180}
            endAngle={0}
            innerRadius={size * 0.3}
            outerRadius={size * 0.45}
            dataKey="v"
            stroke="none"
          >
            <Cell fill={fill} />
            <Cell fill="var(--color-surface-tertiary)" />
          </Pie>
          <Tooltip
            formatter={(v, name) =>
              name === "value" ? [`${Number(v).toFixed(1)}%`, label ?? "Value"] : null
            }
            contentStyle={{
              fontFamily: "var(--font-regular)",
              fontSize: 13,
              border: "1px solid var(--color-stroke-primary)",
              borderRadius: "var(--border-radius-medium)",
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="gauge-label">
        <span className="gauge-value">{value}</span>
        {label ? <span className="gauge-name">{label}</span> : null}
      </div>
    </div>
  );
}

function getGaugeColor(pct: number): string {
  if (pct >= 70) return "var(--color-surface-success-strong)";
  if (pct >= 40) return "var(--color-surface-warning-strong)";
  return "var(--color-surface-error-strong)";
}
