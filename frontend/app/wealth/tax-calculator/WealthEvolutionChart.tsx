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
} from "recharts";
import { WealthEvolutionDataPoint, TaxCountry, TAX_COUNTRY_OPTIONS } from "@/lib/investment-tax-calculator";

type MetricType = "taxRate" | "totalTax" | "taxDelta" | "rank";

type WealthEvolutionChartProps = {
  data: WealthEvolutionDataPoint[];
  referenceCountry: TaxCountry;
  selectedMetric: MetricType;
};

// Color palette for countries
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
  if (value >= 1000000) {
    return `€${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `€${(value / 1000).toFixed(0)}k`;
  }
  return `€${value.toFixed(0)}`;
}

function formatCurrency(value: number, decimals = 0): string {
  return `€${value.toLocaleString("en-GB", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

function percentage(value: number, decimals = 2): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

type TransformedDataPoint = {
  wealth: number;
  wealthLabel: string;
  [key: string]: number | string;
};

const CustomTooltip = (props: any) => {
  const { active, payload, label } = props;
  if (!active || !payload || !payload.length) return null;

  const dataPoint = payload[0].payload as TransformedDataPoint;

  return (
    <div
      style={{
        backgroundColor: "var(--color-surface-secondary, #fff)",
        border: "1px solid var(--color-stroke-primary, #ccc)",
        borderRadius: "4px",
        padding: "8px 12px",
        fontSize: "12px",
      }}
    >
      <p style={{ margin: "0 0 4px 0", fontWeight: 600 }}>
        Wealth: {dataPoint.wealthLabel}
      </p>
      {payload.map((entry: any, index: number) => (
        <p key={index} style={{ margin: "2px 0", color: entry.color }}>
          {entry.name}: {entry.value}
        </p>
      ))}
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

        let displayValue: string;
        let value: number;
        
        switch (selectedMetric) {
          case "taxRate":
            displayValue = percentage(countryData.taxRate);
            value = Math.round(countryData.taxRate * 10000) / 100; // For sorting/positioning
            break;
          case "totalTax":
            displayValue = formatCurrency(countryData.totalTax);
            value = countryData.totalTax;
            break;
          case "taxDelta":
            displayValue = formatCurrency(countryData.taxDelta);
            // Use absolute value for log scale to avoid log of negative/zero
            value = Math.abs(countryData.taxDelta) || 1; // Default to 1 if zero
            break;
          case "rank":
            displayValue = `#${countryData.rank}`;
            value = countryData.rank;
            break;
        }

        transformed[country] = value;
        transformed[`${country}_display`] = displayValue;
      });

      return transformed;
    });
  }, [data, selectedMetric]);

  const yAxisLabel = useMemo(() => {
    switch (selectedMetric) {
      case "taxRate":
        return "Tax Rate (%)";
      case "totalTax":
        return "Total Tax (€)";
      case "taxDelta":
        return `|Tax Delta| vs ${referenceCountry} (€, log scale)`;
      case "rank":
        return "Country Ranking (1=Best)";
    }
  }, [selectedMetric, referenceCountry]);

  const yAxisDomain = useMemo(() => {
    if (selectedMetric === "rank") {
      return [16, 1]; // Inverted so best (1) is at top
    }
    return ["auto", "auto"];
  }, [selectedMetric]);

  const yAxisScale = useMemo(() => {
    if (selectedMetric === "taxDelta") {
      return "log" as const;
    }
    return "linear" as const;
  }, [selectedMetric]);

  if (data.length === 0) {
    return (
      <div style={{ padding: "20px", textAlign: "center", color: "var(--color-text-muted)" }}>
        No data available
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height: "500px" }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={transformedData}
          margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--color-stroke-secondary, #e5e7eb)"
          />
          <XAxis
            dataKey="wealthLabel"
            stroke="var(--color-text-secondary, #666)"
            tick={{ fontSize: 12 }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis
            label={{ value: yAxisLabel, angle: -90, position: "insideLeft" }}
            stroke="var(--color-text-secondary, #666)"
            tick={{ fontSize: 12 }}
            domain={yAxisDomain}
            scale={yAxisScale}
            type={selectedMetric === "rank" ? "number" : "number"}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ paddingTop: "20px" }}
            height={36}
            fontSize={12}
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
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
