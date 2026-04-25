"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { BarChart } from "@/components/ui/bar-chart";
import { Button } from "@/components/ui/button";
import { KpiCard } from "@/components/ui/kpi-card";
import { LineChart } from "@/components/ui/line-chart";
import { Modal } from "@/components/ui/modal";
import { PageFrame, PageHeader } from "@/components/ui/page-frame";
import { ProgressBar, RagIndicator } from "@/components/ui/progress";
import { StatusPill } from "@/components/ui/status-pill";
import { SurfaceCard } from "@/components/ui/surface-card";
import { Tabs } from "@/components/ui/tabs";

const RISK_DATA = [
  { id: "R1", title: "Resource shortfall Q2",    impact: "High",   probability: "Medium", status: "open",     owner: "Alice" },
  { id: "R2", title: "Vendor delay — API certs",  impact: "Medium", probability: "High",   status: "mitigated",owner: "Bob" },
  { id: "R3", title: "Scope creep — Phase 3",     impact: "High",   probability: "Low",    status: "open",     owner: "Carol" },
  { id: "R4", title: "Legacy system dependency",  impact: "Low",    probability: "High",   status: "closed",   owner: "Dave" },
];

const SPRINT_DATA = [
  { sprint: "S1", velocity: 32, planned: 35 },
  { sprint: "S2", velocity: 28, planned: 32 },
  { sprint: "S3", velocity: 38, planned: 36 },
  { sprint: "S4", velocity: 42, planned: 40 },
  { sprint: "S5", velocity: 36, planned: 40 },
  { sprint: "S6", velocity: 45, planned: 42 },
];

const IMPACT_TONE: Record<string, "error" | "warning" | "default"> = {
  High: "error", Medium: "warning", Low: "default",
};

const STATUS_TONE: Record<string, "success" | "warning" | "error" | "default"> = {
  mitigated: "success", open: "warning", closed: "default",
};

export default function AdvancedPage() {
  const [riskModal, setRiskModal] = useState<typeof RISK_DATA[0] | null>(null);

  return (
    <PageFrame>
      <PageHeader title="Advanced Patterns" description="Complex UI patterns — risk register, sprint tracking, cascade widgets." />

      <div className="kpi-grid">
        <KpiCard label="Open Risks"      value="2"   detail="1 high-impact" />
        <KpiCard label="Avg Velocity"    value="36.8" detail="story points / sprint" />
        <KpiCard label="Sprint Health"   value="92%" detail="↑ 3% vs previous" />
        <KpiCard label="Blocked Items"   value="3"   detail="Requires action" />
      </div>

      <Tabs
        items={[
          {
            key: "risks",
            label: "Risk Register",
            content: (
              <div className="stack">
                <div className="page-header-row">
                  <Button variant="primary" size="sm">+ Add risk</Button>
                </div>
                <div className="data-table-scroll">
                  <table className="data-table">
                    <thead>
                      <tr>
                        {["ID", "Title", "Impact", "Probability", "Status", "Owner", ""].map((h) => (
                          <th key={h} className="data-table-th">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {RISK_DATA.map((r) => (
                        <tr key={r.id} className="data-table-row">
                          <td className="data-table-td"><code>{r.id}</code></td>
                          <td className="data-table-td">{r.title}</td>
                          <td className="data-table-td"><StatusPill tone={IMPACT_TONE[r.impact] ?? "default"}>{r.impact}</StatusPill></td>
                          <td className="data-table-td"><Badge tone={IMPACT_TONE[r.probability] ?? "default"}>{r.probability}</Badge></td>
                          <td className="data-table-td"><StatusPill tone={STATUS_TONE[r.status] ?? "default"}>{r.status}</StatusPill></td>
                          <td className="data-table-td">{r.owner}</td>
                          <td className="data-table-td">
                            <Button variant="ghost" size="sm" onClick={() => setRiskModal(r)}>Detail</Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ),
          },
          {
            key: "sprint",
            label: "Sprint Velocity",
            content: (
              <div className="stack">
                <SurfaceCard>
                  <h3 style={{ margin: "0 0 var(--spacing-16)", fontFamily: "var(--font-bold)", fontSize: 15 }}>
                    Sprint velocity trend
                  </h3>
                  <p className="chart-token-hint">
                    Tokens: --color-chart-velocity, --color-chart-planned
                  </p>
                  <LineChart
                    data={SPRINT_DATA}
                    xKey="sprint"
                    series={[
                      { dataKey: "velocity", name: "Actual velocity", color: "var(--color-chart-velocity)" },
                      { dataKey: "planned",  name: "Planned",         color: "var(--color-chart-planned)" },
                    ]}
                    height={280}
                    yLabel="Story points"
                  />
                </SurfaceCard>
                <SurfaceCard>
                  <h3 style={{ margin: "0 0 var(--spacing-16)", fontFamily: "var(--font-bold)", fontSize: 15 }}>
                    Velocity by sprint
                  </h3>
                  <p className="chart-token-hint">
                    Tokens: --color-chart-velocity, --color-chart-planned
                  </p>
                  <BarChart
                    data={SPRINT_DATA}
                    xKey="sprint"
                    series={[
                      { dataKey: "velocity", name: "Actual velocity", color: "var(--color-chart-velocity)" },
                      { dataKey: "planned",  name: "Planned",         color: "var(--color-chart-planned)" },
                    ]}
                    height={280}
                  />
                </SurfaceCard>
              </div>
            ),
          },
          {
            key: "rag",
            label: "Portfolio RAG",
            content: (
              <div className="stack">
                {[
                  { name: "TwinOps Platform",    rag: "green" as const, progress: 82, owner: "Alice" },
                  { name: "Data Lake v2",         rag: "amber" as const, progress: 45, owner: "Bob" },
                  { name: "Identity Management",  rag: "red"   as const, progress: 18, owner: "Carol" },
                  { name: "API Gateway",          rag: "green" as const, progress: 67, owner: "Dave" },
                  { name: "Analytics Dashboard",  rag: "green" as const, progress: 91, owner: "Alice" },
                ].map((p) => (
                  <SurfaceCard key={p.name}>
                    <div className="split-row">
                      <div>
                        <p style={{ margin: "0 0 var(--spacing-4)", fontFamily: "var(--font-bold)", fontSize: 15 }}>{p.name}</p>
                        <p style={{ margin: 0, fontSize: 13, color: "var(--color-text-subtle)" }}>Owner: {p.owner}</p>
                      </div>
                      <RagIndicator status={p.rag} />
                    </div>
                    <div style={{ marginTop: "var(--spacing-12)" }}><ProgressBar value={p.progress} /></div>
                  </SurfaceCard>
                ))}
              </div>
            ),
          },
        ]}
      />

      <Modal
        open={riskModal !== null}
        onClose={() => setRiskModal(null)}
        title={riskModal ? `Risk ${riskModal.id}` : ""}
        footer={<Button variant="secondary" onClick={() => setRiskModal(null)}>Close</Button>}
      >
        {riskModal ? (
          <div className="kv-grid">
            {[
              ["Title",       riskModal.title],
              ["Impact",      riskModal.impact],
              ["Probability", riskModal.probability],
              ["Status",      riskModal.status],
              ["Owner",       riskModal.owner],
            ].map(([k, v]) => (
              <div key={k} className="kv-row">
                <span style={{ fontFamily: "var(--font-bold)", fontSize: 12, color: "var(--color-text-subtle)" }}>{k}</span>
                <span>{v}</span>
              </div>
            ))}
          </div>
        ) : null}
      </Modal>
    </PageFrame>
  );
}
