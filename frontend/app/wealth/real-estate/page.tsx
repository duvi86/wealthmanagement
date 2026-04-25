"use client";

import { useMemo, useState } from "react";
import { BarChart } from "@/components/ui/bar-chart";
import { KpiCard } from "@/components/ui/kpi-card";
import { LineChart } from "@/components/ui/line-chart";
import { PageFrame, PageHeader } from "@/components/ui/page-frame";
import { SurfaceCard } from "@/components/ui/surface-card";
import { Slider } from "@/components/ui/slider";
import { FormInput } from "@/components/ui/form-input";
import { Tabs } from "@/components/ui/tabs";
import {
  runRealEstateAnalysis,
  type RealEstateParams,
  type DecompositionRow,
} from "@/lib/real-estate-calcs";

// ─── Formatters ───────────────────────────────────────────────────────────────

function fmtK(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}€${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}€${(abs / 1_000).toFixed(2)}k`;
  return `${sign}€${abs.toFixed(2)}`;
}

function fmtEur(value: number): string {
  return `€${new Intl.NumberFormat("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)}`;
}

function fmtPct(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_PARAMS: RealEstateParams = {
  housePrice: 330000,
  rc: 2000,
  monthlyRent: 2000,
  mortgageRate: 3,
  mortgageTerm: 20,
  downPaymentPct: 10,
  allCash: false,
  bulletMortgage: false,
  corporate: false,
  sellPerLot: false,
  rentInflation: 2.0,
  houseAppreciation: 2.5,
  taxInflation: 2.0,
  maintenancePct: 1.0,
  tenantTurnoverPct: 3.0,
  managementPct: 5.0,
  insurancePct: 0.25,
  maxYears: 20,
};

// ─── Small UI helpers ─────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 10,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.07em",
        color: "var(--color-text-subtle)",
        borderBottom: "1px solid var(--color-border-subtle)",
        paddingBottom: 3,
        marginBottom: 6,
        marginTop: 10,
      }}
    >
      {children}
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        fontSize: 12,
        cursor: "pointer",
        userSelect: "none",
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ cursor: "pointer" }}
      />
      {label}
    </label>
  );
}

// ─── Decomposition table ──────────────────────────────────────────────────────

function DecompositionTable({ rows }: { rows: DecompositionRow[] }) {
  const [activeHeader, setActiveHeader] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const headers: Array<{ short: string; full: string; description: string }> = [
    { short: "Y", full: "Year", description: "Year number in the analysis timeline" },
    { short: "Rent", full: "Rental Income", description: "Gross annual rent received from tenants" },
    { short: "Tax", full: "Property Taxes", description: "Annual property-related taxes" },
    { short: "Maint", full: "Maintenance", description: "Annual maintenance and upkeep costs" },
    { short: "Turn", full: "Tenant Turnover", description: "Vacancy/turnover costs from tenant changes" },
    { short: "Mgmt", full: "Management Fees", description: "Annual property management costs" },
    { short: "Ins", full: "Insurance", description: "Annual property insurance costs" },
    { short: "Int", full: "Interest", description: "Annual mortgage interest paid" },
    { short: "Prin", full: "Principal", description: "Annual mortgage principal repaid" },
    { short: "Net CF", full: "Net Cash Flow", description: "Net annual cash flow after all costs and debt service" },
    { short: "CF-Cash", full: "Cash-Only Cash Flow", description: "Net annual cash flow if the property was fully paid in cash" },
    { short: "Lev.", full: "Leverage Return", description: "Cash flow return as a percentage of financed amount" },
  ];
  const activeHeaderMeta = headers.find((h) => h.short === activeHeader) ?? null;

  function showHeaderTooltip(short: string, element: HTMLElement) {
    const rect = element.getBoundingClientRect();
    setActiveHeader(short);
    setTooltipPos({ x: rect.right - 6, y: rect.top - 6 });
  }

  function hideHeaderTooltip() {
    setActiveHeader(null);
    setTooltipPos(null);
  }

  return (
    <>
      <div
        style={{
          overflow: "auto",
          maxHeight: 420,
          border: "1px solid var(--color-border-subtle)",
          borderRadius: 10,
        }}
      >
        <table style={{ width: "100%", fontSize: 11, borderCollapse: "separate", borderSpacing: 0, whiteSpace: "nowrap" }}>
          <thead>
            <tr style={{ backgroundColor: "var(--color-bg-subtle)" }}>
              {headers.map((h) => (
                <th
                  key={h.short}
                  aria-label={`${h.full}. ${h.description}`}
                  onMouseEnter={(e) => showHeaderTooltip(h.short, e.currentTarget)}
                  onMouseLeave={hideHeaderTooltip}
                  onFocus={(e) => showHeaderTooltip(h.short, e.currentTarget)}
                  onBlur={hideHeaderTooltip}
                  style={{
                    position: "sticky",
                    top: 0,
                    zIndex: 2,
                    backgroundColor: "var(--color-bg-subtle)",
                    padding: "8px 8px",
                    textAlign: "right",
                    fontWeight: 700,
                    color: "var(--color-text-subtle)",
                    fontSize: 10,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                    borderBottom: "1px solid var(--color-border-subtle)",
                  }}
                >
                  <abbr
                    tabIndex={0}
                    style={{ textDecoration: "underline dotted", textUnderlineOffset: 2, cursor: "help" }}
                  >
                    {h.short}
                  </abbr>
                </th>
              ))}
            </tr>
          </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={row.year}
              style={{
                backgroundColor:
                  row.year === 0
                    ? "var(--color-bg-subtle)"
                    : index % 2 === 0
                      ? "var(--color-bg-subtle)"
                      : "transparent",
              }}
            >
              <td
                style={{
                  position: "sticky",
                  left: 0,
                  zIndex: 1,
                  backgroundColor:
                    row.year === 0
                      ? "var(--color-bg-subtle)"
                      : index % 2 === 0
                        ? "var(--color-bg-subtle)"
                        : "var(--color-bg)",
                  padding: "6px 8px",
                  textAlign: "right",
                  fontWeight: 700,
                  borderRight: "1px solid var(--color-border-subtle)",
                  borderBottom: "1px solid var(--color-border-subtle)",
                }}
              >
                {row.year}
              </td>
              {row.year === 0 ? (
                <>
                  {[...Array(8)].map((_, i) => (
                    <td
                      key={i}
                      style={{
                        padding: "6px 8px",
                        textAlign: "right",
                        color: "var(--color-text-subtle)",
                        borderBottom: "1px solid var(--color-border-subtle)",
                      }}
                    >
                      —
                    </td>
                  ))}
                </>
              ) : (
                <>
                  <td style={{ padding: "6px 8px", textAlign: "right", borderBottom: "1px solid var(--color-border-subtle)" }}>{fmtK(row.rent)}</td>
                  <td style={{ padding: "6px 8px", textAlign: "right", borderBottom: "1px solid var(--color-border-subtle)" }}>{fmtK(row.tax)}</td>
                  <td style={{ padding: "6px 8px", textAlign: "right", borderBottom: "1px solid var(--color-border-subtle)" }}>{fmtK(row.maintenance)}</td>
                  <td style={{ padding: "6px 8px", textAlign: "right", borderBottom: "1px solid var(--color-border-subtle)" }}>{fmtK(row.turnover)}</td>
                  <td style={{ padding: "6px 8px", textAlign: "right", borderBottom: "1px solid var(--color-border-subtle)" }}>{fmtK(row.management)}</td>
                  <td style={{ padding: "6px 8px", textAlign: "right", borderBottom: "1px solid var(--color-border-subtle)" }}>{fmtK(row.insurance)}</td>
                  <td style={{ padding: "6px 8px", textAlign: "right", borderBottom: "1px solid var(--color-border-subtle)" }}>{fmtK(row.interest)}</td>
                  <td style={{ padding: "6px 8px", textAlign: "right", borderBottom: "1px solid var(--color-border-subtle)" }}>{fmtK(row.principal)}</td>
                </>
              )}
              <td
                style={{
                  padding: "6px 8px",
                  textAlign: "right",
                  fontWeight: 600,
                  color: row.netCF >= 0 ? "var(--color-status-success)" : "var(--color-status-error)",
                  borderBottom: "1px solid var(--color-border-subtle)",
                }}
              >
                {fmtK(row.netCF)}
              </td>
              <td
                style={{
                  padding: "6px 8px",
                  textAlign: "right",
                  fontWeight: 600,
                  color: row.netCFAllCash >= 0 ? "var(--color-status-success)" : "var(--color-status-error)",
                  borderBottom: "1px solid var(--color-border-subtle)",
                }}
              >
                {fmtK(row.netCFAllCash)}
              </td>
              <td style={{ padding: "6px 8px", textAlign: "right", borderBottom: "1px solid var(--color-border-subtle)" }}>
                {row.leverage !== null ? `${row.leverage.toFixed(2)}%` : "—"}
              </td>
            </tr>
          ))}
          </tbody>
        </table>
      </div>
      {activeHeaderMeta && tooltipPos ? (
        <div
          role="tooltip"
          style={{
            position: "fixed",
            top: tooltipPos.y,
            left: tooltipPos.x,
            transform: "translate(-100%, -100%)",
            width: 240,
            textAlign: "left",
            textTransform: "none",
            letterSpacing: "normal",
            fontWeight: 500,
            fontSize: 12,
            lineHeight: 1.4,
            color: "var(--color-text-default)",
            backgroundColor: "var(--color-surface-primary)",
            border: "1px solid var(--color-border-default)",
            borderRadius: 8,
            boxShadow: "0 14px 32px rgba(0,0,0,0.2)",
            padding: "9px 11px",
            zIndex: 9999,
            opacity: 1,
            backdropFilter: "none",
            pointerEvents: "none",
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 2 }}>{activeHeaderMeta.full}</div>
          <div>{activeHeaderMeta.description}</div>
        </div>
      ) : null}
    </>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function RealEstatePage() {
  const [params, setParams] = useState<RealEstateParams>(DEFAULT_PARAMS);

  function set<K extends keyof RealEstateParams>(key: K, value: RealEstateParams[K]) {
    setParams((p) => ({ ...p, [key]: value }));
  }

  const result = useMemo(() => runRealEstateAnalysis(params), [params]);

  // Chart data
  const irrChartData = useMemo(() => {
    const map = new Map<number, { year: number; irrPct: number | null; irrCashPct: number | null }>();
    result.irrYears.forEach((y, i) => map.set(y, { year: y, irrPct: result.irrValues[i] ?? null, irrCashPct: null }));
    if (params.allCash) {
      result.irrYearsCash.forEach((y, i) => {
        const existing = map.get(y);
        if (existing) {
          existing.irrCashPct = result.irrValuesCash[i] ?? null;
        } else {
          map.set(y, { year: y, irrPct: null, irrCashPct: result.irrValuesCash[i] ?? null });
        }
      });
    }
    return Array.from(map.values()).sort((a, b) => a.year - b.year);
  }, [result, params.allCash]);

  const propertyChartData = useMemo(
    () =>
      result.years.map((y, i) => ({
        year: y,
        propertyValue: result.propertyValues[i] ?? 0,
        ...(params.allCash ? { propertyValueCash: result.propertyValuesCash[i] ?? 0 } : {}),
      })),
    [result, params.allCash],
  );

  const cfYearlyData = useMemo(
    () =>
      result.years.map((y, i) => {
        const val = result.yearlyCF[i] ?? 0;
        return {
          year: y,
          positiveCF: val >= 0 ? val : 0,
          negativeCF: val < 0 ? val : 0,
          ...(params.allCash ? { cashCF: result.yearlyCFCash[i] ?? 0 } : {}),
        };
      }),
    [result, params.allCash],
  );

  const cumulativeData = useMemo(
    () =>
      result.years.map((y, i) => ({
        year: y,
        cumulativeCF: result.cumulativeCF[i] ?? 0,
        capitalGain: result.capitalGainsByYear[i] ?? 0,
        ...(params.allCash ? { cumulativeCash: result.cumulativeCFCash[i] ?? 0 } : {}),
      })),
    [result, params.allCash],
  );

  const lastCumulativeCF = result.cumulativeCF[result.cumulativeCF.length - 1] ?? 0;
  const annualRows = result.decomposition.filter((row) => row.year > 0);
  const bestYearCF = annualRows.reduce((max, row) => (row.netCF > max ? row.netCF : max), Number.NEGATIVE_INFINITY);
  const worstYearCF = annualRows.reduce((min, row) => (row.netCF < min ? row.netCF : min), Number.POSITIVE_INFINITY);
  const avgYearCF =
    annualRows.length > 0
      ? annualRows.reduce((sum, row) => sum + row.netCF, 0) / annualRows.length
      : 0;

  return (
    <PageFrame>
      <PageHeader title="Real Estate Investment Analyzer" />

      <div style={{ display: "grid", gridTemplateColumns: "300px minmax(0, 1fr)", gap: 16, alignItems: "start" }}>
        {/* ── Left input panel ── */}
        <SurfaceCard>
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            <SectionLabel>Property</SectionLabel>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <FormInput
                type="number"
                label="House Price (€)"
                value={params.housePrice}
                onChange={(e) => set("housePrice", Number(e.target.value))}
              />
              <FormInput
                type="number"
                label="RC Cadastral (€)"
                value={params.rc}
                onChange={(e) => set("rc", Number(e.target.value))}
              />
            </div>
            <FormInput
              type="number"
              label="Monthly Rent (€)"
              value={params.monthlyRent}
              onChange={(e) => set("monthlyRent", Number(e.target.value))}
            />

            <SectionLabel>Financing</SectionLabel>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <FormInput
                type="number"
                label="Rate (%)"
                value={params.mortgageRate}
                onChange={(e) => set("mortgageRate", Number(e.target.value))}
              />
              <FormInput
                type="number"
                label="Term (y)"
                value={params.mortgageTerm}
                onChange={(e) => set("mortgageTerm", Number(e.target.value))}
              />
            </div>
            <Slider
              label="Down Payment"
              min={0}
              max={100}
              step={1}
              value={params.downPaymentPct}
              onChange={(e) => set("downPaymentPct", Number(e.target.value))}
              valueSuffix="%"
            />
            <div style={{ display: "flex", gap: 16, marginTop: 4 }}>
              <Toggle label="All-cash" checked={params.allCash} onChange={(v) => set("allCash", v)} />
              <Toggle label="Bullet mortgage" checked={params.bulletMortgage} onChange={(v) => set("bulletMortgage", v)} />
            </div>

            <SectionLabel>Tax & Sale</SectionLabel>
            <div style={{ display: "flex", gap: 16 }}>
              <Toggle label="Corporate tax" checked={params.corporate} onChange={(v) => set("corporate", v)} />
              <Toggle label="Sell per lot +8%" checked={params.sellPerLot} onChange={(v) => set("sellPerLot", v)} />
            </div>

            <SectionLabel>Economics</SectionLabel>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <FormInput
                type="number"
                label="Rent Infl. (%)"
                value={params.rentInflation}
                onChange={(e) => set("rentInflation", Number(e.target.value))}
              />
              <FormInput
                type="number"
                label="Appreciation (%)"
                value={params.houseAppreciation}
                onChange={(e) => set("houseAppreciation", Number(e.target.value))}
              />
              <FormInput
                type="number"
                label="Tax Infl. (%)"
                value={params.taxInflation}
                onChange={(e) => set("taxInflation", Number(e.target.value))}
              />
              <FormInput
                type="number"
                label="Maint. (%)"
                value={params.maintenancePct}
                onChange={(e) => set("maintenancePct", Number(e.target.value))}
              />
              <FormInput
                type="number"
                label="Turnover (%)"
                value={params.tenantTurnoverPct}
                onChange={(e) => set("tenantTurnoverPct", Number(e.target.value))}
              />
              <FormInput
                type="number"
                label="Mgmt (%)"
                value={params.managementPct}
                onChange={(e) => set("managementPct", Number(e.target.value))}
              />
            </div>
            <FormInput
              type="number"
              label="Insurance (%)"
              value={params.insurancePct}
              onChange={(e) => set("insurancePct", Number(e.target.value))}
            />

            <SectionLabel>Analysis Period</SectionLabel>
            <Slider
              label="Period"
              min={1}
              max={50}
              step={1}
              value={params.maxYears}
              onChange={(e) => set("maxYears", Number(e.target.value))}
              valueSuffix="y"
            />
          </div>
        </SurfaceCard>

        {/* ── Right results area ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0, width: "100%" }}>
          {/* KPI row */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
              gap: 16,
              width: "100%",
            }}
          >
            <KpiCard label="Initial Investment" value={fmtK(result.initialInvestment)} />
            <KpiCard label="Best IRR" value={fmtPct(result.bestIRR)} />
            <KpiCard
              label="Payback"
              value={result.paybackYear !== null ? `${result.paybackYear}y` : "N/A"}
            />
            <KpiCard label="Total Return" value={fmtK(result.totalReturn)} />
            <KpiCard label="Capital Gain" value={fmtK(result.capitalGain)} />
          </div>

          {/* Charts */}
          <SurfaceCard className="wealth-real-estate-chart-card">
            <Tabs
              items={[
                {
                  key: "irr",
                  label: "IRR by Sale Year",
                  content: (
                    <LineChart
                      data={irrChartData}
                      xKey="year"
                      yLabel="IRR (%)"
                      yTickFormatter={(v) => `${v.toFixed(1)}%`}
                      tooltipValueFormatter={(v) => `${v.toFixed(2)}%`}
                      series={[
                        { dataKey: "irrPct", name: "Mortgage IRR", color: "var(--color-chart-series-1)" },
                        ...(params.allCash
                          ? [{ dataKey: "irrCashPct", name: "All-Cash ROI", color: "var(--color-chart-series-2)" }]
                          : []),
                      ]}
                      height={280}
                    />
                  ),
                },
                {
                  key: "property",
                  label: "Property Value",
                  content: (
                    <LineChart
                      data={propertyChartData}
                      xKey="year"
                      yLabel="EUR"
                      yTickFormatter={(v) => fmtK(v)}
                      tooltipValueFormatter={(v) => fmtEur(v)}
                      series={[
                        { dataKey: "propertyValue", name: "Property Value", color: "var(--color-chart-series-1)" },
                        ...(params.allCash
                          ? [{ dataKey: "propertyValueCash", name: "All-Cash Value", color: "var(--color-chart-series-2)" }]
                          : []),
                      ]}
                      height={280}
                    />
                  ),
                },
                {
                  key: "cashflow",
                  label: "Operating Cash Flow",
                  content: (
                    <BarChart
                      data={cfYearlyData}
                      xKey="year"
                      yLabel="EUR"
                      formatValue={(v) => fmtEur(v)}
                      series={[
                        { dataKey: "positiveCF", name: "Positive CF", color: "var(--color-status-success)" },
                        { dataKey: "negativeCF", name: "Negative CF", color: "var(--color-status-error)" },
                        ...(params.allCash
                          ? [{ dataKey: "cashCF", name: "All-Cash CF", color: "var(--color-chart-series-3)" }]
                          : []),
                      ]}
                      height={280}
                    />
                  ),
                },
                {
                  key: "cumulative",
                  label: "Cumulative Returns",
                  content: (
                    <LineChart
                      data={cumulativeData}
                      xKey="year"
                      yLabel="EUR"
                      yTickFormatter={(v) => fmtK(v)}
                      tooltipValueFormatter={(v) => fmtEur(v)}
                      series={[
                        { dataKey: "cumulativeCF", name: "Cumulative CF", color: "var(--color-chart-series-1)" },
                        { dataKey: "capitalGain", name: "Capital Appreciation", color: "var(--color-chart-series-4)" },
                        ...(params.allCash
                          ? [{ dataKey: "cumulativeCash", name: "All-Cash Cumulative", color: "var(--color-chart-series-2)" }]
                          : []),
                      ]}
                      height={280}
                    />
                  ),
                },
              ]}
            />
          </SurfaceCard>

          {/* Summary + Decomposition */}
          <div
            style={{
              display: "flex",
              gap: 16,
              alignItems: "flex-start",
              width: "100%",
              flexWrap: "nowrap",
            }}
          >
            {/* Investment Summary */}
            <SurfaceCard style={{ flex: "0 0 240px", padding: 12 }}>
              <div style={{ width: 240, minWidth: 240 }}>
              <h4 style={{ margin: "0 0 6px", fontSize: 13 }}>Cash Flow Summary</h4>
              <div
                style={{
                  backgroundColor: "var(--color-bg-subtle)",
                  borderRadius: 8,
                  padding: "7px 8px",
                  marginBottom: 6,
                }}
              >
                <div style={{ fontSize: 10, marginBottom: 3 }}>
                  <span style={{ color: "var(--color-text-subtle)" }}>Best IRR: </span>
                  <strong
                    style={{
                      color: result.bestIRR > 0 ? "var(--color-status-success)" : "var(--color-status-error)",
                    }}
                  >
                    {fmtPct(result.bestIRR, 2)}
                  </strong>
                </div>
                <div style={{ fontSize: 10 }}>
                  <span style={{ color: "var(--color-text-subtle)" }}>Payback: </span>
                  <strong>{result.paybackYear !== null ? `${result.paybackYear} years` : "Not achieved"}</strong>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 5, marginBottom: 6 }}>
                <div style={{ border: "1px solid var(--color-border-subtle)", borderRadius: 8, padding: "6px 8px" }}>
                  <div style={{ fontSize: 10, color: "var(--color-text-subtle)" }}>Avg Annual Net CF</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: avgYearCF >= 0 ? "var(--color-status-success)" : "var(--color-status-error)" }}>
                    {fmtEur(avgYearCF)}
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 }}>
                  <div style={{ border: "1px solid var(--color-border-subtle)", borderRadius: 8, padding: "6px 7px" }}>
                    <div style={{ fontSize: 10, color: "var(--color-text-subtle)" }}>Best CF</div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-status-success)" }}>
                      {fmtEur(bestYearCF)}
                    </div>
                  </div>
                  <div style={{ border: "1px solid var(--color-border-subtle)", borderRadius: 8, padding: "6px 7px" }}>
                    <div style={{ fontSize: 10, color: "var(--color-text-subtle)" }}>Worst CF</div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-status-error)" }}>
                      {fmtEur(worstYearCF)}
                    </div>
                  </div>
                </div>
              </div>

              <table style={{ width: "100%", fontSize: 11, borderCollapse: "collapse" }}>
                <tbody>
                  {(
                    [
                      ["Initial Investment", fmtEur(result.initialInvestment)],
                      ["Capital Appreciation", fmtEur(result.capitalGain)],
                    ] as [string, string][]
                  ).map(([label, value]) => (
                    <tr key={label} style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
                      <td style={{ padding: "3px 0", color: "var(--color-text-subtle)" }}>{label}</td>
                      <td style={{ padding: "3px 0", textAlign: "right", fontWeight: 600 }}>{value}</td>
                    </tr>
                  ))}
                  <tr>
                    <td style={{ padding: "4px 0", fontWeight: 700 }}>Total Return</td>
                    <td
                      style={{
                        padding: "4px 0",
                        textAlign: "right",
                        fontWeight: 700,
                        fontSize: 12,
                        color: result.totalReturn > 0 ? "var(--color-status-success)" : "var(--color-status-error)",
                      }}
                    >
                      {fmtEur(result.totalReturn)}
                    </td>
                  </tr>
                </tbody>
              </table>
              </div>
            </SurfaceCard>

            {/* Cash Flow Decomposition */}
            <SurfaceCard style={{ flex: "1 1 auto", minWidth: 0 }}>
              <div style={{ minWidth: 0, width: "100%", flex: 1 }}>
              <h4 style={{ margin: "0 0 10px", fontSize: 14 }}>Cash Flow Details</h4>
              <DecompositionTable rows={result.decomposition} />
              </div>
            </SurfaceCard>
          </div>
        </div>
      </div>
    </PageFrame>
  );
}
