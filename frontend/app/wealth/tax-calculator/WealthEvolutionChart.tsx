"use client";

import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { WealthEvolutionDataPoint, TaxCountry, TAX_COUNTRY_OPTIONS } from "@/lib/investment-tax-calculator";

type MetricType = "taxRate" | "totalTax" | "taxDelta" | "rank";

type WealthEvolutionChartProps = {
  data: WealthEvolutionDataPoint[];
  referenceCountry: TaxCountry;
  selectedMetric: MetricType;
};

const COUNTRY_COLORS: Record<TaxCountry, string> = {
  Belgium: "#3b82f6",
  Luxembourg: "#ef4444",
  USA: "#f59e0b",
  Spain: "#ec4899",
  UK: "#8b5cf6",
  Switzerland: "#06b6d4",
  Netherlands: "#10b981",
  Italy: "#f97316",
  Singapore: "#6366f1",
  "New Zealand": "#14b8a6",
  Ireland: "#84cc16",
  "Belgium 2009": "#6b7280",
  UAE: "#d97706",
  "Hong Kong": "#a855f7",
  Portugal: "#0ea5e9",
};

function formatWealth(value: number): string {
  if (value >= 1_000_000) return `€${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `€${(value / 1_000).toFixed(0)}k`;
  return `€${value.toFixed(0)}`;
}

function formatCurrencySigned(value: number): string {
  const abs = Math.abs(value);
  const sign = value >= 0 ? "+" : "-";
  if (abs >= 1_000_000) return `${sign}€${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}€${(abs / 1_000).toFixed(1)}k`;
  return `${sign}€${abs.toFixed(0)}`;
}

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `€${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `€${(value / 1_000).toFixed(1)}k`;
  return `€${value.toFixed(0)}`;
}

function formatPct(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

type TransformedDataPoint = {
  wealth: number;
  wealthLabel: string;
  [key: string]: number | string;
};

function getDisplayValue(metric: MetricType, rawValue: number): string {
  switch (metric) {
    case "taxRate": return formatPct(rawValue / 100);
    case "totalTax": return formatCurrency(rawValue);
    case "taxDelta": return formatCurrencySigned(rawValue);
    case "rank": return `#${rawValue}`;
  }
}

const CustomTooltip = ({ active, payload, selectedMetric, referenceCountry }: any) => {
  if (!active || !payload || !payload.length) return null;

  const dataPoint = payload[0].payload as TransformedDataPoint;

  // Sort entries by value: ascending for rank/taxRate/totalTax, by absolute value desc for taxDelta
  const sorted = [...payload].sort((a: any, b: any) => {
    if (selectedMetric === "rank") return (a.value ?? 99) - (b.value ?? 99);
    if (selectedMetric === "taxDelta") return (a.value ?? 0) - (b.value ?? 0); // most negative (cheapest) first
    return (a.value ?? 0) - (b.value ?? 0); // lowest tax first
  });

  return (
    <div
      style={{
        backgroundColor: "var(--color-surface-secondary, #fff)",
        border: "1px solid var(--color-stroke-primary, #ccc)",
        borderRadius: "6px",
        padding: "10px 14px",
        fontSize: "11px",
        maxHeight: "500px",
        overflowY: "auto",
        minWidth: "200px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
      }}
    >
      <p style={{ margin: "0 0 6px 0", fontWeight: 700, fontSize: "12px", borderBottom: "1px solid var(--color-stroke-primary, #eee)", paddingBottom: "4px" }}>
        {dataPoint.wealthLabel}
        {selectedMetric === "taxDelta" && (
          <span style={{ fontWeight: 400, color: "var(--color-text-subtle, #888)", marginLeft: 6 }}>
            vs {referenceCountry}
          </span>
        )}
      </p>
      {sorted.map((entry: any, index: number) => {
        const isRef = selectedMetric === "taxDelta" && entry.name === referenceCountry;
        return (
          <div
            key={index}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              margin: "2px 0",
              padding: "1px 2px",
              borderRadius: "3px",
              background: isRef ? "var(--color-surface-info-subtle, rgba(59,130,246,0.08))" : "transparent",
            }}
          >
            <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: entry.color, flexShrink: 0 }} />
            <span style={{ flex: 1, color: "var(--color-text-default, #333)" }}>
              {selectedMetric === "rank" ? `${entry.value}. ` : ""}{entry.name}
            </span>
            <span style={{ fontWeight: 600, color: entry.color, marginLeft: "4px" }}>
              {getDisplayValue(selectedMetric, entry.value)}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export function WealthEvolutionChart({
  data,
  referenceCountry,
  selectedMetric,
}: WealthEvolutionChartProps) {
  const transformedData = useMemo<TransformedDataPoint[]>(() => {
    return data.map((point) => {
      const transformed: TransformedDataPoint = {
        wealth: point.wealth,
        wealthLabel: formatWealth(point.wealth),
      };

      TAX_COUNTRY_OPTIONS.forEach(({ value: country }) => {
        const countryData = point.countries[country];
        if (!countryData) return;

        switch (selectedMetric) {
          case "taxRate":
            transformed[country] = Math.round(countryData.taxRate * 1_000_000) / 10_000; // percentage as number e.g. 15.23
            break;
          case "totalTax":
            transformed[country] = countryData.totalTax;
            break;
          case "taxDelta":
            transformed[country] = countryData.taxDelta; // signed — no abs()
            break;
          case "rank":
            transformed[country] = countryData.rank;
            break;
        }
      });

      return transformed;
    });
  }, [data, selectedMetric]);

  const yAxisLabel = useMemo(() => {
    switch (selectedMetric) {
      case "taxRate": return "Tax Rate (%)";
      case "totalTax": return "Total Tax (€)";
      case "taxDelta": return `Tax Delta vs ${referenceCountry} (€)`;
      case "rank": return "Rank (1 = lowest tax)";
    }
  }, [selectedMetric, referenceCountry]);

  const yAxisDomain = useMemo<[any, any]>(() => {
    if (selectedMetric === "rank") return [TAX_COUNTRY_OPTIONS.length, 1];
    return ["auto", "auto"];
  }, [selectedMetric]);

  const yAxisTickFormatter = useMemo(() => {
    switch (selectedMetric) {
      case "taxRate": return (v: number) => `${v.toFixed(1)}%`;
      case "totalTax": return (v: number) => formatCurrency(v);
      case "taxDelta": return (v: number) => formatCurrencySigned(v);
      case "rank": return (v: number) => `#${v}`;
    }
  }, [selectedMetric]);

  if (data.length === 0) {
    return (
      <div style={{ padding: "20px", textAlign: "center", color: "var(--color-text-muted)" }}>
        No data available
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height: "580px" }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={transformedData} margin={{ top: 8, right: 24, left: 16, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-stroke-secondary, #e5e7eb)" />
          <XAxis
            dataKey="wealthLabel"
            stroke="var(--color-text-secondary, #888)"
            tick={{ fontSize: 11 }}
            angle={-40}
            textAnchor="end"
            height={70}
          />
          <YAxis
            stroke="var(--color-text-secondary, #888)"
            tick={{ fontSize: 11 }}
            domain={yAxisDomain}
            tickFormatter={yAxisTickFormatter}
            width={72}
            label={{ value: yAxisLabel, angle: -90, position: "insideLeft", offset: -4, style: { fontSize: 10, fill: "var(--color-text-subtle, #aaa)" } }}
          />
          {selectedMetric === "taxDelta" && (
            <ReferenceLine y={0} stroke="var(--color-stroke-primary, #ccc)" strokeDasharray="4 2" strokeWidth={1.5} />
          )}
          <Tooltip
            content={(props: any) => (
              <CustomTooltip {...props} selectedMetric={selectedMetric} referenceCountry={referenceCountry} />
            )}
            wrapperStyle={{ zIndex: 1000, pointerEvents: "none" }}
          />
          <Legend
            wrapperStyle={{ paddingTop: "8px", fontSize: "11px" }}
            iconType="circle"
            iconSize={8}
          />
          {TAX_COUNTRY_OPTIONS.map(({ value: country, label }) => (
            <Line
              key={country}
              type="monotone"
              dataKey={country}
              stroke={COUNTRY_COLORS[country]}
              dot={false}
              name={label}
              strokeWidth={2}
              isAnimationActive={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
