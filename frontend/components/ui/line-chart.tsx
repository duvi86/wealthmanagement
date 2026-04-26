"use client";

import { useState, useMemo } from "react";
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
  const [visibleSeries, setVisibleSeries] = useState<Set<string>>(new Set(series.map((s) => s.dataKey)));

  const handleLegendClick = (e: any) => {
    const dataKey = e.dataKey;
    setVisibleSeries((prev) => {
      const updated = new Set(prev);
      if (updated.has(dataKey)) {
        updated.delete(dataKey);
      } else {
        updated.add(dataKey);
      }
      return updated;
    });
  };

  // Memoized domain calculation that recalculates whenever visible series change
  const { yMin, yMax, ticks } = useMemo(() => {
    // Compute smart Y-axis domain to maximize data visualization (80%+ of vertical space)
    // Only consider data from visible series
    let minValue = Infinity;
    let maxValue = -Infinity;
    
    // Iterate only over visible series for accurate min/max
    data.forEach((row) => {
      visibleSeries.forEach((dataKey) => {
        const val = Number(row[dataKey]);
        // Only count valid finite numbers
        if (Number.isFinite(val)) {
          if (val < minValue) minValue = val;
          if (val > maxValue) maxValue = val;
        }
      });
    });

    // Handle case where no visible series or empty data
    if (minValue === Infinity || maxValue === -Infinity) {
      minValue = 0;
      maxValue = 1;
    }

    const range = maxValue - minValue;
    // Use minimal 1% padding to maximize space usage
    const padding = range === 0 ? 0.5 : range * 0.01;
    let yMin = minValue - padding;
    let yMax = maxValue + padding;

    // Ensure yMin and yMax are different
    if (yMin === yMax) {
      yMax = yMin + 1;
    }

    // Generate explicit ticks to force Recharts to use our exact domain
    const tickCount = 5;
    const generatedTicks = [];
    for (let i = 0; i <= tickCount; i++) {
      generatedTicks.push(yMin + (yMax - yMin) * (i / tickCount));
    }

    return { yMin, yMax, ticks: generatedTicks };
  }, [data, visibleSeries]);

  const renderCustomLegend = (props: any) => {
    const { payload } = props;
    if (!payload || payload.length === 0) return null;

    return (
      <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", fontSize: 12, fontFamily: "var(--font-regular)", marginTop: "0px" }}>
        {payload.map((entry: any, index: number) => {
          const isVisible = visibleSeries.has(entry.dataKey);
          return (
            <button
              key={`${entry.dataKey}-${index}`}
              onClick={() => handleLegendClick({ dataKey: entry.dataKey })}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                cursor: "pointer",
                border: "none",
                background: "transparent",
                padding: "0",
                opacity: isVisible ? 1 : 0.5,
                transition: "opacity 120ms ease",
                fontSize: "inherit",
                fontFamily: "inherit",
              }}
            >
              <span
                style={{
                  width: "12px",
                  height: "12px",
                  backgroundColor: entry.color || "var(--color-stroke-primary)",
                  borderRadius: "2px",
                  display: "inline-block",
                }}
              />
              <span style={{ color: "var(--color-text-default)" }}>
                {entry.value}
              </span>
            </button>
          );
        })}
      </div>
    );
  };


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
          type="number"
          domain={[yMin, yMax]}
          ticks={ticks}
          nice={false}
          allowDecimals={true}
          tickFormatter={yTickFormatter ?? formatCompactAxisValue}
          tick={{ fontSize: 12, fontFamily: "var(--font-regular)" }}
          label={yLabel ? { value: yLabel, angle: -90, position: "insideLeft", fontSize: 12 } : undefined}
        />
        <Tooltip
          labelFormatter={(label) => {
            if (!tooltipLabelFormatter) {
              return String(label ?? "");
            }
            if (typeof label === "string" || typeof label === "number") {
              return tooltipLabelFormatter(label);
            }
            return String(label ?? "");
          }}
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
        <Legend wrapperStyle={{ fontSize: 12, fontFamily: "var(--font-regular)", paddingTop: "0px", marginBottom: "-8px" }} content={renderCustomLegend} layout="horizontal" verticalAlign="top" />
        {referenceLines.map((line) => (
          <ReferenceLine
            key={`${line.x}-${line.label ?? "reference"}`}
            x={line.x}
            stroke={line.color ?? "var(--color-text-subtle)"}
            strokeDasharray={line.strokeDasharray ?? "4 4"}
            label={line.label ? { value: line.label, position: "insideTopRight", fontSize: 12 } : undefined}
          />
        ))}
        {series.map((s, i) => {
          const isVisible = visibleSeries.has(s.dataKey);
          return (
            <Line
              key={s.dataKey}
              dataKey={s.dataKey}
              name={s.name ?? s.dataKey}
              stroke={s.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length]}
              strokeWidth={isVisible ? 2 : 0}
              strokeOpacity={isVisible ? 1 : 0}
              dot={isVisible ? { r: 3 } : false}
              activeDot={isVisible ? { r: 5 } : false}
              type="monotone"
            />
          );
        })}
      </RechartsLineChart>
    </ResponsiveContainer>
  );
}
