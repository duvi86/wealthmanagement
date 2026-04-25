"use client";

import { useState } from "react";
import { BarChart } from "@/components/ui/bar-chart";
import { KpiCard } from "@/components/ui/kpi-card";
import { LineChart } from "@/components/ui/line-chart";
import { PageFrame, PageHeader } from "@/components/ui/page-frame";
import { ProgressBar } from "@/components/ui/progress";
import { SurfaceCard } from "@/components/ui/surface-card";
import { Tabs } from "@/components/ui/tabs";
import { TemporalFilter } from "@/components/ui/temporal-filter";

const WEEKLY: Record<string, { week: string; velocity: number; defects: number; completed: number }[]> = {
  "7d":  [
    { week: "Mon", velocity: 8, defects: 1, completed: 3 },
    { week: "Tue", velocity: 9, defects: 0, completed: 4 },
    { week: "Wed", velocity: 7, defects: 2, completed: 2 },
    { week: "Thu", velocity: 11,defects: 1, completed: 5 },
    { week: "Fri", velocity: 10,defects: 0, completed: 4 },
  ],
  "30d": [
    { week: "W1", velocity: 32, defects: 6, completed: 12 },
    { week: "W2", velocity: 35, defects: 4, completed: 14 },
    { week: "W3", velocity: 38, defects: 3, completed: 15 },
    { week: "W4", velocity: 42, defects: 2, completed: 17 },
  ],
  "90d": [
    { week: "Jan",  velocity: 120, defects: 18, completed: 48 },
    { week: "Feb",  velocity: 138, defects: 12, completed: 55 },
    { week: "Mar",  velocity: 145, defects: 9,  completed: 58 },
  ],
};

const MILESTONES = [
  { name: "Discovery complete",   dueDate: "2026-01-31", status: "complete",  progress: 100 },
  { name: "MVP delivered",        dueDate: "2026-03-15", status: "complete",  progress: 100 },
  { name: "Beta release",         dueDate: "2026-04-30", status: "on-track",  progress: 72  },
  { name: "UAT sign-off",         dueDate: "2026-05-31", status: "at-risk",   progress: 35  },
  { name: "Production go-live",   dueDate: "2026-06-30", status: "not-started",progress: 0  },
];

const MS_TONE: Record<string, "success" | "warning" | "error" | "default"> = {
  complete: "success", "on-track": "success", "at-risk": "warning", "not-started": "default",
};

export default function TemporalPage() {
  const [period, setPeriod] = useState("30d");
  const data = WEEKLY[period] ?? WEEKLY["30d"];

  return (
    <PageFrame>
      <PageHeader
        title="Temporal Analysis"
        description="Time-series patterns — velocity trends, milestone timeline, and period comparison."
      />

      <TemporalFilter
        defaultPeriod="30d"
        onPeriodChange={setPeriod}
        showDateRange
      />

      <div className="kpi-grid">
        <KpiCard
          label="Avg velocity"
          value={String(Math.round(data.reduce((s, d) => s + d.velocity, 0) / data.length))}
          detail="units / period"
        />
        <KpiCard
          label="Total completed"
          value={String(data.reduce((s, d) => s + d.completed, 0))}
          detail="items delivered"
        />
        <KpiCard
          label="Total defects"
          value={String(data.reduce((s, d) => s + d.defects, 0))}
          detail="bugs found"
        />
        <KpiCard label="Periods shown" value={String(data.length)} detail={period} />
      </div>

      <Tabs
        items={[
          {
            key: "velocity",
            label: "Velocity",
            content: (
              <SurfaceCard>
                <h3 style={{ margin: "0 0 var(--spacing-16)", fontFamily: "var(--font-bold)", fontSize: 15 }}>
                  Velocity over time
                </h3>
                <p className="chart-token-hint">
                  Tokens: --color-chart-velocity, --color-chart-completed
                </p>
                <LineChart
                  data={data}
                  xKey="week"
                  series={[
                    { dataKey: "velocity",  name: "Velocity",  color: "var(--color-chart-velocity)" },
                    { dataKey: "completed", name: "Completed", color: "var(--color-chart-completed)" },
                  ]}
                  height={300}
                />
              </SurfaceCard>
            ),
          },
          {
            key: "defects",
            label: "Defect Trend",
            content: (
              <SurfaceCard>
                <h3 style={{ margin: "0 0 var(--spacing-16)", fontFamily: "var(--font-bold)", fontSize: 15 }}>
                  Defects over time
                </h3>
                <p className="chart-token-hint">
                  Token: --color-chart-defects
                </p>
                <BarChart
                  data={data}
                  xKey="week"
                  series={[{ dataKey: "defects", name: "Defects", color: "var(--color-chart-defects)" }]}
                  height={300}
                />
              </SurfaceCard>
            ),
          },
          {
            key: "milestones",
            label: "Milestones",
            content: (
              <div className="stack">
                {MILESTONES.map((m) => (
                  <SurfaceCard key={m.name}>
                    <div className="split-row">
                      <div>
                        <p style={{ margin: "0 0 var(--spacing-4)", fontFamily: "var(--font-bold)", fontSize: 15 }}>
                          {m.name}
                        </p>
                        <p style={{ margin: 0, fontSize: 12, color: "var(--color-text-subtle)" }}>
                          Due: {m.dueDate}
                        </p>
                      </div>
                      <span className={`status-badge status-${MS_TONE[m.status] === "success" ? "success" : MS_TONE[m.status] === "warning" ? "warning" : "default"}`}>
                        {m.status}
                      </span>
                    </div>
                    <div style={{ marginTop: "var(--spacing-12)" }}><ProgressBar value={m.progress} /></div>
                  </SurfaceCard>
                ))}
              </div>
            ),
          },
        ]}
      />
    </PageFrame>
  );
}
