"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { BarChart } from "@/components/ui/bar-chart";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { FormContainer } from "@/components/ui/form-container";
import { FormDatepicker } from "@/components/ui/form-datepicker";
import { FormDropdown } from "@/components/ui/form-dropdown";
import { FormInput } from "@/components/ui/form-input";
import { GaugeChart } from "@/components/ui/gauge-chart";
import { KpiCard } from "@/components/ui/kpi-card";
import { LineChart } from "@/components/ui/line-chart";
import { LoadingSpinner, Skeleton } from "@/components/ui/loading";
import { Modal } from "@/components/ui/modal";
import { ObjectiveCard } from "@/components/ui/okr-card";
import { PageFrame, PageHeader } from "@/components/ui/page-frame";
import { ProgressBar, RagIndicator } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { StatusPill } from "@/components/ui/status-pill";
import { SurfaceCard } from "@/components/ui/surface-card";
import { Tabs } from "@/components/ui/tabs";
import { TemporalFilter } from "@/components/ui/temporal-filter";
import { Toast, ToastContainer } from "@/components/ui/toast";

/* ── Demo data ─────────────────────────────────────────────── */
type SampleRow = {
  id: string;
  name: string;
  status: string;
  progress: number;
  owner: string;
};

const SAMPLE_ROWS: SampleRow[] = [
  { id: "1", name: "Project Alpha", status: "On track",  progress: 82, owner: "Alice" },
  { id: "2", name: "Project Beta",  status: "At risk",   progress: 45, owner: "Bob" },
  { id: "3", name: "Project Gamma", status: "Off track", progress: 18, owner: "Carol" },
  { id: "4", name: "Project Delta", status: "On track",  progress: 67, owner: "Dave" },
  { id: "5", name: "Initiative X",  status: "On track",  progress: 91, owner: "Eve" },
];

const CHART_DATA = [
  { month: "Jan", planned: 40, actual: 35 },
  { month: "Feb", planned: 55, actual: 50 },
  { month: "Mar", planned: 60, actual: 62 },
  { month: "Apr", planned: 70, actual: 65 },
  { month: "May", planned: 80, actual: 78 },
  { month: "Jun", planned: 90, actual: 88 },
];

const BAR_SERIES = [
  { dataKey: "planned", name: "Planned" },
  { dataKey: "actual",  name: "Actual", color: "var(--color-chart-completed)" },
];

const CHART_SEMANTIC_SWATCHES = [
  { name: "Velocity", token: "--color-chart-velocity" },
  { name: "Completed", token: "--color-chart-completed" },
  { name: "Planned", token: "--color-chart-planned" },
  { name: "Budget", token: "--color-chart-budget" },
  { name: "Defects", token: "--color-chart-defects" },
  { name: "Risk", token: "--color-chart-risk" },
  { name: "Capacity", token: "--color-chart-capacity" },
];

const CHART_SERIES_SWATCHES = [
  "--color-chart-series-1",
  "--color-chart-series-2",
  "--color-chart-series-3",
  "--color-chart-series-4",
  "--color-chart-series-5",
  "--color-chart-series-6",
  "--color-chart-series-7",
  "--color-chart-series-8",
  "--color-chart-series-9",
  "--color-chart-series-10",
];

const SAMPLE_OBJECTIVE = {
  id: 1,
  title: "Improve portfolio delivery confidence",
  progress: 67,
  key_results: [
    {
      id: 11,
      title: "Raise on-time delivery rate to 85%",
      progress: 72,
      initiatives: [
        { id: 101, title: "Delivery review cadence", progress: 80 },
        { id: 102, title: "Release readiness checklist", progress: 64 },
      ],
    },
    {
      id: 12,
      title: "Reduce blocked work by 30%",
      progress: 44,
      initiatives: [
        { id: 103, title: "Dependency triage board", progress: 40 },
      ],
    },
  ],
};

export default function ComponentsPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sliderValue, setSliderValue] = useState(65);
  const [toast, setToast] = useState<{ message: string; tone: "info" | "success" | "warning" | "error" } | null>(null);

  return (
    <PageFrame>
      <PageHeader
        title="Component Catalog"
        description="All reusable GSK design-system components available in this starter kit."
      />

      <div className="catalog-grid">

        {/* ── KPI Cards ──────────────────────────────────────── */}
        <section className="catalog-section">
          <h2 className="catalog-section-title">KPI Cards</h2>
          <div className="kpi-grid">
            <KpiCard label="Total Projects"    value="24"  detail="+3 this quarter" />
            <KpiCard label="On Track"          value="18"  detail="75% of portfolio" />
            <KpiCard label="Avg. Completion"   value="67%" detail="↑ 4% vs last period" />
            <KpiCard label="Team Members"      value="42"  detail="Across 6 squads" />
          </div>
        </section>

        {/* ── Buttons ────────────────────────────────────────── */}
        <section className="catalog-section">
          <h2 className="catalog-section-title">Buttons</h2>
          <div className="catalog-demo-row">
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="tertiary">Tertiary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
            <Button variant="icon" aria-label="Action">✕</Button>
          </div>
          <div className="catalog-demo-row">
            <Button variant="primary" size="sm">Small</Button>
            <Button variant="primary">Medium</Button>
            <Button variant="primary" size="lg">Large</Button>
          </div>
          <div className="catalog-demo-row">
            <Button variant="primary" loading>Loading</Button>
            <Button variant="secondary" disabled>Disabled</Button>
          </div>
        </section>

        {/* ── Badges ─────────────────────────────────────────── */}
        <section className="catalog-section">
          <h2 className="catalog-section-title">Design System Colours</h2>
          <div className="semantic-chip-row">
            <div className="semantic-swatch">
              <div className="semantic-swatch-sample" style={{ background: "var(--color-accent-primary)" }} />
              <p className="semantic-swatch-name">Primary Accent</p>
              <p className="semantic-swatch-token">--color-accent-primary</p>
            </div>
            <div className="semantic-swatch">
              <div className="semantic-swatch-sample" style={{ background: "var(--color-accent-secondary)" }} />
              <p className="semantic-swatch-name">Secondary Accent</p>
              <p className="semantic-swatch-token">--color-accent-secondary</p>
            </div>
            <div className="semantic-swatch">
              <div className="semantic-swatch-sample" style={{ background: "var(--color-accent-tertiary)" }} />
              <p className="semantic-swatch-name">Tertiary Accent</p>
              <p className="semantic-swatch-token">--color-accent-tertiary</p>
            </div>
            <div className="semantic-swatch">
              <div className="semantic-swatch-sample" style={{ background: "var(--color-surface-info-primary)" }} />
              <p className="semantic-swatch-name">Info</p>
              <p className="semantic-swatch-token">--color-surface-info-primary</p>
            </div>
            <div className="semantic-swatch">
              <div className="semantic-swatch-sample" style={{ background: "var(--color-surface-success-primary)" }} />
              <p className="semantic-swatch-name">Success</p>
              <p className="semantic-swatch-token">--color-surface-success-primary</p>
            </div>
            <div className="semantic-swatch">
              <div className="semantic-swatch-sample" style={{ background: "var(--color-surface-warning-primary)" }} />
              <p className="semantic-swatch-name">Warning</p>
              <p className="semantic-swatch-token">--color-surface-warning-primary</p>
            </div>
            <div className="semantic-swatch">
              <div className="semantic-swatch-sample" style={{ background: "var(--color-surface-error-primary)" }} />
              <p className="semantic-swatch-name">Error / Failure</p>
              <p className="semantic-swatch-token">--color-surface-error-primary</p>
            </div>
          </div>
        </section>

        <section className="catalog-section">
          <h2 className="catalog-section-title">Chart Colours</h2>
          <p className="semantic-swatch-token" style={{ margin: 0 }}>
            Semantic chart colours (for meaning):
          </p>
          <div className="semantic-chip-row">
            {CHART_SEMANTIC_SWATCHES.map((swatch) => (
              <div key={swatch.token} className="semantic-swatch">
                <div
                  className="semantic-swatch-sample"
                  style={{ background: `var(${swatch.token})` }}
                />
                <p className="semantic-swatch-name">{swatch.name}</p>
                <p className="semantic-swatch-token">{swatch.token}</p>
              </div>
            ))}
          </div>
          <p className="semantic-swatch-token" style={{ margin: 0 }}>
            Ordered series palette (for multi-series graphs):
          </p>
          <div className="semantic-chip-row">
            {CHART_SERIES_SWATCHES.map((token) => (
              <div key={token} className="semantic-swatch">
                <div
                  className="semantic-swatch-sample"
                  style={{ background: `var(${token})` }}
                />
                <p className="semantic-swatch-name">{token.replace("--color-chart-", "").toUpperCase()}</p>
                <p className="semantic-swatch-token">{token}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="catalog-section">
          <h2 className="catalog-section-title">Badges</h2>
          <div className="catalog-demo-row">
            <Badge tone="default">Default</Badge>
            <Badge tone="success">Success</Badge>
            <Badge tone="warning">Warning</Badge>
            <Badge tone="error">Error</Badge>
            <Badge tone="info">Info</Badge>
          </div>
          <div className="catalog-demo-row">
            <StatusPill tone="success">On Track</StatusPill>
            <StatusPill tone="warning">At Risk</StatusPill>
            <StatusPill tone="error">Off Track</StatusPill>
          </div>
        </section>

        {/* ── Progress & RAG ─────────────────────────────────── */}
        <section className="catalog-section">
          <h2 className="catalog-section-title">Progress &amp; RAG</h2>
          <div className="stack">
            <ProgressBar value={82} label="Project Alpha" />
            <ProgressBar value={45} label="Project Beta" />
            <ProgressBar value={18} label="Project Gamma" />
          </div>
          <div className="catalog-demo-row" style={{ marginTop: "var(--spacing-12)" }}>
            <RagIndicator status="green" />
            <RagIndicator status="amber" />
            <RagIndicator status="red" />
          </div>
        </section>

        {/* ── Loading ────────────────────────────────────────── */}
        <section className="catalog-section">
          <h2 className="catalog-section-title">Loading States</h2>
          <div className="catalog-demo-row">
            <LoadingSpinner size="sm" />
            <LoadingSpinner size="md" />
            <LoadingSpinner size="lg" />
          </div>
          <div style={{ maxWidth: 360, marginTop: "var(--spacing-12)" }}>
            <Skeleton lines={3} />
          </div>
        </section>

        {/* ── Tabs ───────────────────────────────────────────── */}
        <section className="catalog-section">
          <h2 className="catalog-section-title">Tabs</h2>
          <Tabs
            items={[
              { key: "overview", label: "Overview", content: <p style={{ margin: 0, color: "var(--color-text-subtle)" }}>Overview tab content.</p> },
              { key: "details",  label: "Details",  content: <p style={{ margin: 0, color: "var(--color-text-subtle)" }}>Details tab content.</p> },
              { key: "history",  label: "History",  content: <p style={{ margin: 0, color: "var(--color-text-subtle)" }}>History tab content.</p> },
            ]}
          />
        </section>

        {/* ── Surface Card & Empty State ─────────────────────── */}
        <section className="catalog-section">
          <h2 className="catalog-section-title">Cards &amp; Empty State</h2>
          <div className="kpi-grid">
            <SurfaceCard>
              <p style={{ margin: 0 }}>Surface card — generic content container.</p>
            </SurfaceCard>
            <EmptyState
              title="No data yet"
              description="Add your first item to get started."
            />
          </div>
        </section>

        {/* ── Form Controls ──────────────────────────────────── */}
        <section className="catalog-section">
          <h2 className="catalog-section-title">Form Controls</h2>
          <FormContainer
            title="Sample Form"
            description="Combines all form primitives in a container."
            footer={
              <>
                <Button variant="secondary">Cancel</Button>
                <Button variant="primary">Submit</Button>
              </>
            }
          >
            <FormInput label="Project name" placeholder="Enter name…" required />
            <FormDropdown
              label="Status"
              placeholder="Select status…"
              options={[
                { value: "on-track", label: "On Track" },
                { value: "at-risk",  label: "At Risk" },
                { value: "off-track",label: "Off Track" },
              ]}
            />
            <FormDatepicker label="Target date" />
            <FormInput label="With error" defaultValue="bad value" error="This field is invalid." />
            <Slider
              label="Capacity Allocation"
              min={0}
              max={100}
              step={5}
              value={sliderValue}
              valueSuffix="%"
              marks={[
                { value: 0, label: "0" },
                { value: 50, label: "50" },
                { value: 100, label: "100" },
              ]}
              onChange={(e) => setSliderValue(Number(e.target.value))}
            />
          </FormContainer>
        </section>

        <section className="catalog-section">
          <h2 className="catalog-section-title">OKR Card Format</h2>
          <ObjectiveCard objective={SAMPLE_OBJECTIVE} />
        </section>

        {/* ── Temporal Filter ────────────────────────────────── */}
        <section className="catalog-section">
          <h2 className="catalog-section-title">Temporal Filter</h2>
          <TemporalFilter showDateRange />
        </section>

        {/* ── Charts ─────────────────────────────────────────── */}
        <section className="catalog-section">
          <h2 className="catalog-section-title">Charts</h2>
          <div className="kpi-grid">
            <SurfaceCard>
              <h3 style={{ margin: "0 0 var(--spacing-12)", fontFamily: "var(--font-bold)", fontSize: 14 }}>Bar Chart</h3>
              <BarChart data={CHART_DATA} xKey="month" series={BAR_SERIES} />
            </SurfaceCard>
            <SurfaceCard>
              <h3 style={{ margin: "0 0 var(--spacing-12)", fontFamily: "var(--font-bold)", fontSize: 14 }}>Line Chart</h3>
              <LineChart data={CHART_DATA} xKey="month" series={BAR_SERIES} />
            </SurfaceCard>
          </div>
          <SurfaceCard>
            <h3 style={{ margin: "0 0 var(--spacing-12)", fontFamily: "var(--font-bold)", fontSize: 14 }}>Stacked Bar Chart</h3>
            <BarChart data={CHART_DATA} xKey="month" series={BAR_SERIES} stacked />
          </SurfaceCard>
          <div className="catalog-demo-row" style={{ gap: "var(--spacing-24)" }}>
            <GaugeChart value={82} label="On Track" />
            <GaugeChart value={45} label="At Risk" />
            <GaugeChart value={18} label="Critical" />
          </div>
        </section>

        {/* ── Data Table ─────────────────────────────────────── */}
        <section className="catalog-section">
          <h2 className="catalog-section-title">Data Table</h2>
          <DataTable<SampleRow>
            columns={[
              { key: "name",     header: "Project",  sortable: true },
              { key: "status",   header: "Status",   sortable: true,
                render: (v) => <StatusPill tone={v === "On track" ? "success" : v === "At risk" ? "warning" : "error"}>{String(v)}</StatusPill> },
              { key: "progress", header: "Progress", sortable: true,
                render: (v) => <ProgressBar value={Number(v)} showPercent /> },
              { key: "owner",    header: "Owner",    sortable: true },
            ]}
            data={SAMPLE_ROWS}
            rowKey="id"
          />
        </section>

        {/* ── Modals ─────────────────────────────────────────── */}
        <section className="catalog-section">
          <h2 className="catalog-section-title">Modals</h2>
          <div className="catalog-demo-row">
            <Button variant="secondary" onClick={() => setModalOpen(true)}>
              Open default modal
            </Button>
            <Button variant="secondary" onClick={() => setConfirmOpen(true)}>
              Open confirm modal
            </Button>
          </div>
          <Modal
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            title="Default Modal"
            footer={
              <>
                <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
                <Button variant="primary"   onClick={() => setModalOpen(false)}>Confirm</Button>
              </>
            }
          >
            <p style={{ margin: 0 }}>Modal body content goes here. Use this for forms, details, or confirmations.</p>
          </Modal>
          <Modal
            open={confirmOpen}
            onClose={() => setConfirmOpen(false)}
            title="Confirm Action"
            variant="confirm"
            footer={
              <>
                <Button variant="secondary" onClick={() => setConfirmOpen(false)}>Cancel</Button>
                <Button variant="danger"    onClick={() => setConfirmOpen(false)}>Delete</Button>
              </>
            }
          >
            <p style={{ margin: 0 }}>Are you sure? This action cannot be undone.</p>
          </Modal>
        </section>

        {/* ── Toasts ─────────────────────────────────────────── */}
        <section className="catalog-section">
          <h2 className="catalog-section-title">Toast Notifications</h2>
          <div className="catalog-demo-row">
            {(["info", "success", "warning", "error"] as const).map((tone) => (
              <Button
                key={tone}
                variant="secondary"
                onClick={() => setToast({ message: `This is a ${tone} notification.`, tone })}
              >
                Show {tone}
              </Button>
            ))}
          </div>
        </section>

      </div>

      {/* Global toast container */}
      {toast ? (
        <ToastContainer>
          <Toast
            tone={toast.tone}
            message={toast.message}
            onDismiss={() => setToast(null)}
            autoDismissMs={4000}
          />
        </ToastContainer>
      ) : null}
    </PageFrame>
  );
}
