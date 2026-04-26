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
  tooltipTotalKey?: string;
  tooltipTotalLabel?: string;
  tooltipTotalFormatter?: (value: number) => string;
  tooltipPercentTotalKey?: string;
  tooltipPercentLabel?: string;
  tooltipPctLabel?: string;
  tooltipTitleKey?: string;
  tooltipSeriesLabel?: string;
  tooltipShowAmount?: boolean;
  tooltipShowAllSeriesPercents?: boolean;
  tooltipAllSeriesLabel?: string;
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
  totalKey?: string;
  totalLabel?: string;
  totalFormatter?: (v: number) => string;
  percentTotalKey?: string;
  percentLabel?: string;
  pctLabel?: string;
  titleKey?: string;
  seriesLabel?: string;
  showAmount?: boolean;
  showAllSeriesPercents?: boolean;
  allSeriesLabel?: string;
};

function CustomTooltip({
  active,
  payload,
  formatValue = String,
  totalKey,
  totalLabel = "Total",
  totalFormatter = String,
  percentTotalKey,
  percentLabel = "Share",
  pctLabel = "Share",
  titleKey,
  seriesLabel,
  showAmount = true,
  showAllSeriesPercents = false,
  allSeriesLabel = "Class shares",
}: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  if (!entry) return null;
  const pct = (entry.payload.pct as string) || "";
  const title = titleKey ? String(entry.payload[titleKey] ?? entry.name) : entry.name;
  const totalRaw = totalKey ? entry.payload[totalKey] : undefined;
  const totalValue = typeof totalRaw === "number" ? totalRaw : Number.NaN;
  const hasTotal = Number.isFinite(totalValue);
  const percentTotalRaw = percentTotalKey ? entry.payload[percentTotalKey] : undefined;
  const percentTotal = typeof percentTotalRaw === "number" ? percentTotalRaw : Number.NaN;
  const showAllSeries = showAllSeriesPercents && Number.isFinite(percentTotal) && Math.abs(percentTotal) > 0;
  const allSeriesShares = showAllSeries
    ? payload
        .map((item) => {
          const itemValue = Number(item.value);
          return {
            name: item.name,
            pctValue: Number.isFinite(itemValue) ? (itemValue / percentTotal) * 100 : Number.NaN,
          };
        })
        .filter((item) => Number.isFinite(item.pctValue))
    : [];
  const percentShare = Number.isFinite(percentTotal) && Math.abs(percentTotal) > 0
    ? ((entry.value / percentTotal) * 100).toFixed(1)
    : "";
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
      <p style={{ margin: "0 0 4px", fontFamily: "var(--font-bold)" }}>{title}</p>
      {seriesLabel ? (
        <p style={{ margin: "0 0 2px" }}>
          <span style={{ color: "var(--color-text-subtle)" }}>{seriesLabel}: </span>
          {entry.name}
        </p>
      ) : null}
      {showAmount ? (
        <p style={{ margin: "0 0 2px" }}>
          <span style={{ color: "var(--color-text-subtle)" }}>Amount: </span>
          {formatValue(entry.value)}
        </p>
      ) : null}
      {hasTotal ? (
        <p style={{ margin: "0 0 2px" }}>
          <span style={{ color: "var(--color-text-subtle)" }}>{totalLabel}: </span>
          <strong>{totalFormatter(totalValue)}</strong>
        </p>
      ) : null}
      {percentShare && !showAllSeries ? (
        <p style={{ margin: "0 0 2px" }}>
          <span style={{ color: "var(--color-text-subtle)" }}>{percentLabel}: </span>
          <strong>{percentShare}%</strong>
        </p>
      ) : null}
      {allSeriesShares.length > 0 ? (
        <div style={{ margin: "0 0 2px" }}>
          <p style={{ margin: "0 0 2px" }}>
            <span style={{ color: "var(--color-text-subtle)" }}>{allSeriesLabel}: </span>
          </p>
          {allSeriesShares.map((item) => (
            <p key={item.name} style={{ margin: "0 0 1px", paddingLeft: 8 }}>
              {item.name}: <strong>{item.pctValue.toFixed(1)}%</strong>
            </p>
          ))}
        </div>
      ) : null}
      {pct && (
        <p style={{ margin: 0 }}>
          <span style={{ color: "var(--color-text-subtle)" }}>{pctLabel}: </span>
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
  tooltipTotalKey,
  tooltipTotalLabel,
  tooltipTotalFormatter,
  tooltipPercentTotalKey,
  tooltipPercentLabel,
  tooltipPctLabel,
  tooltipTitleKey,
  tooltipSeriesLabel,
  tooltipShowAmount,
  tooltipShowAllSeriesPercents,
  tooltipAllSeriesLabel,
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
        <Tooltip
          content={
            <CustomTooltip
              formatValue={formatValue}
              totalKey={tooltipTotalKey}
              totalLabel={tooltipTotalLabel}
              totalFormatter={tooltipTotalFormatter}
              percentTotalKey={tooltipPercentTotalKey}
              percentLabel={tooltipPercentLabel}
              pctLabel={tooltipPctLabel}
              titleKey={tooltipTitleKey}
              seriesLabel={tooltipSeriesLabel}
              showAmount={tooltipShowAmount}
              showAllSeriesPercents={tooltipShowAllSeriesPercents}
              allSeriesLabel={tooltipAllSeriesLabel}
            />
          }
        />
        {series.some((s) => s.name) && <Legend wrapperStyle={{ fontSize: 12, fontFamily: "var(--font-regular)" }} />}
        {series.map((s, i) => {
          // For stacked charts, attach the top label to the last series that has
          // positive values so it sits above the positive stack, not above a
          // negative (e.g. Loan) segment that renders below zero.
          let labelSeriesIdx = series.length - 1;
          if (stacked) {
            for (let j = series.length - 1; j >= 0; j--) {
              if (data.some((d) => Number(d[series[j].dataKey] ?? 0) > 0)) {
                labelSeriesIdx = j;
                break;
              }
            }
          }
          return (
          <Bar
            key={s.dataKey}
            dataKey={s.dataKey}
            name={s.name ?? s.dataKey}
            fill={s.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length]}
            stackId={stacked ? "stack" : undefined}
            radius={stacked ? undefined : [3, 3, 0, 0]}
            label={
              data.some((d) => d.pct) && (!stacked || i === labelSeriesIdx)
                ? {
                    dataKey: "pct",
                    position: "top",
                    offset: 8,
                    fill: "var(--color-text-default)",
                    fontSize: 11,
                    fontFamily: "var(--font-regular)",
                    formatter: (value: unknown) =>
                      value === undefined || value === null || value === "" ? "" : `${value}%`,
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
          );
        })}
      </RechartsBarChart>
    </ResponsiveContainer>
  );
}
