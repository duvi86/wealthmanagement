"use client";

import { BarChart } from "@/components/ui/bar-chart";
import { GaugeChart } from "@/components/ui/gauge-chart";
import { LineChart } from "@/components/ui/line-chart";
import { PageFrame, PageHeader } from "@/components/ui/page-frame";
import { SurfaceCard } from "@/components/ui/surface-card";
import { Tabs } from "@/components/ui/tabs";
import { TemporalFilter } from "@/components/ui/temporal-filter";

const MONTHLY = [
  { month: "Jan", planned: 40, actual: 35, budget: 50 },
  { month: "Feb", planned: 55, actual: 50, budget: 60 },
  { month: "Mar", planned: 60, actual: 62, budget: 65 },
  { month: "Apr", planned: 70, actual: 65, budget: 75 },
  { month: "May", planned: 80, actual: 78, budget: 82 },
  { month: "Jun", planned: 90, actual: 88, budget: 95 },
];

const QUARTERLY = [
  { quarter: "Q1 2025", alpha: 30, beta: 20, gamma: 15 },
  { quarter: "Q2 2025", alpha: 45, beta: 30, gamma: 25 },
  { quarter: "Q3 2025", alpha: 60, beta: 42, gamma: 38 },
  { quarter: "Q4 2025", alpha: 72, beta: 55, gamma: 48 },
  { quarter: "Q1 2026", alpha: 82, beta: 66, gamma: 59 },
];

const TEAM_LOAD = [
  { name: "Alice",  engineering: 0.8, pm: 0.2 },
  { name: "Bob",    engineering: 0.6, pm: 0.4 },
  { name: "Carol",  engineering: 0.3, pm: 0.7 },
  { name: "Dave",   engineering: 0.9, pm: 0.1 },
  { name: "Eve",    engineering: 1.0, pm: 0.0 },
];

const LINE_SERIES = [
  { dataKey: "planned", name: "Planned", color: "var(--color-chart-planned)" },
  { dataKey: "actual",  name: "Actual",  color: "var(--color-chart-completed)" },
  { dataKey: "budget",  name: "Budget",  color: "var(--color-chart-budget)" },
];

const STACKED_SERIES = [
  { dataKey: "alpha", name: "Project Alpha", color: "var(--color-chart-series-1)" },
  { dataKey: "beta",  name: "Project Beta",  color: "var(--color-chart-series-2)" },
  { dataKey: "gamma", name: "Project Gamma", color: "var(--color-chart-series-3)" },
];

const LOAD_SERIES = [
  { dataKey: "engineering", name: "Engineering", color: "var(--color-chart-capacity)" },
  { dataKey: "pm",          name: "PM",          color: "var(--color-chart-risk)" },
];

export default function ChartsPage() {
  return (
    <PageFrame>
      <PageHeader title="Charts" description="Chart type showcase — bar, line, stacked, gauge." />

      <TemporalFilter defaultPeriod="90d" showDateRange />

      <Tabs
        items={[
          {
            key: "line",
            label: "Line",
            content: (
              <SurfaceCard>
                <h3 style={{ margin: "0 0 var(--spacing-16)", fontFamily: "var(--font-bold)", fontSize: 15 }}>
                  Delivery progress over time
                </h3>
                <p className="chart-token-hint">
                  Tokens: --color-chart-planned, --color-chart-completed, --color-chart-budget
                </p>
                <LineChart data={MONTHLY} xKey="month" series={LINE_SERIES} height={320} yLabel="% Complete" />
              </SurfaceCard>
            ),
          },
          {
            key: "bar",
            label: "Bar",
            content: (
              <div className="stack">
                <SurfaceCard>
                  <h3 style={{ margin: "0 0 var(--spacing-16)", fontFamily: "var(--font-bold)", fontSize: 15 }}>
                    Planned vs Actual by month
                  </h3>
                  <p className="chart-token-hint">
                    Tokens: --color-chart-planned, --color-chart-completed
                  </p>
                  <BarChart data={MONTHLY} xKey="month" series={LINE_SERIES.slice(0, 2)} height={300} />
                </SurfaceCard>
                <SurfaceCard>
                  <h3 style={{ margin: "0 0 var(--spacing-16)", fontFamily: "var(--font-bold)", fontSize: 15 }}>
                    Portfolio progress by quarter (stacked)
                  </h3>
                  <p className="chart-token-hint">
                    Tokens: --color-chart-series-1, --color-chart-series-2, --color-chart-series-3
                  </p>
                  <BarChart data={QUARTERLY} xKey="quarter" series={STACKED_SERIES} height={300} stacked />
                </SurfaceCard>
              </div>
            ),
          },
          {
            key: "gauge",
            label: "Gauge",
            content: (
              <SurfaceCard>
                <h3 style={{ margin: "0 0 var(--spacing-16)", fontFamily: "var(--font-bold)", fontSize: 15 }}>
                  Portfolio health at a glance
                </h3>
                <p className="chart-token-hint">
                  Tokens: --color-surface-success-strong, --color-surface-warning-strong, --color-surface-error-strong
                </p>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "var(--spacing-24)",
                    alignItems: "flex-end",
                    justifyContent: "center",
                  }}
                >
                  <GaugeChart value={82} label="On Track" size={180} />
                  <GaugeChart value={45} label="At Risk"  size={180} />
                  <GaugeChart value={18} label="Critical" size={180} />
                  <GaugeChart value={67} label="Overall"  size={220} />
                </div>
              </SurfaceCard>
            ),
          },
          {
            key: "stacked-team",
            label: "Team Load",
            content: (
              <SurfaceCard>
                <h3 style={{ margin: "0 0 var(--spacing-16)", fontFamily: "var(--font-bold)", fontSize: 15 }}>
                  Team capacity allocation
                </h3>
                <p className="chart-token-hint">
                  Tokens: --color-chart-capacity, --color-chart-risk
                </p>
                <BarChart data={TEAM_LOAD} xKey="name" series={LOAD_SERIES} height={300} stacked />
              </SurfaceCard>
            ),
          },
        ]}
      />
    </PageFrame>
  );
}
