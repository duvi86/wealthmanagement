"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { FormContainer } from "@/components/ui/form-container";
import { FormDatepicker } from "@/components/ui/form-datepicker";
import { FormDropdown } from "@/components/ui/form-dropdown";
import { FormInput } from "@/components/ui/form-input";
import { Modal } from "@/components/ui/modal";
import { PageFrame, PageHeader } from "@/components/ui/page-frame";
import { TemporalFilter } from "@/components/ui/temporal-filter";
import { SurfaceCard } from "@/components/ui/surface-card";
import { type FinancialDecision } from "@/lib/wealth-mock-data";
import {
  useWealthDecisions,
  useCreateWealthDecision,
  useUpdateWealthDecision,
  useDeleteWealthDecision,
  useWealthFireScenarios,
  type WealthDecision,
} from "@/hooks/use-api";
import { Skeleton } from "@/components/ui/loading";

type DecisionForm = {
  title: string;
  description: string;
  type: FinancialDecision["type"];
  date: string;
  author: string;
  relatedScenario: string;
};

const emptyForm: DecisionForm = {
  title: "",
  description: "",
  type: "Strategy",
  date: "2026-04-18",
  author: "Sylvie",
  relatedScenario: "",
};

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="wealth-action-icon">
      <path
        d="M4 20h4l10-10-4-4L4 16v4Zm3.2-1.5H5.5v-1.7l8.1-8.1 1.7 1.7-8.1 8.1ZM19 9l-4-4 1.3-1.3a1.5 1.5 0 0 1 2.1 0l1.9 1.9a1.5 1.5 0 0 1 0 2.1L19 9Z"
        fill="currentColor"
      />
    </svg>
  );
}

function DeleteIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="wealth-action-icon">
      <path
        d="M9 3h6l1 2h4v2H4V5h4l1-2Zm1 6h2v8h-2V9Zm4 0h2v8h-2V9ZM7 9h2v8H7V9Zm-1 11a2 2 0 0 1-2-2V8h16v10a2 2 0 0 1-2 2H6Z"
        fill="currentColor"
      />
    </svg>
  );
}

function typeTone(type: FinancialDecision["type"]): "info" | "success" | "warning" | "default" {
  if (type === "Investment") return "success";
  if (type === "Rebalance") return "warning";
  if (type === "Strategy") return "info";
  return "default";
}

export default function WealthDecisionsPage() {
  const { data: rawDecisions = [], isLoading, isError } = useWealthDecisions();
  const items = rawDecisions as FinancialDecision[];
  const { data: rawScenarios = [] } = useWealthFireScenarios();
  const fireScenarios = rawScenarios;
  const createDecision = useCreateWealthDecision();
  const updateDecision = useUpdateWealthDecision();
  const deleteDecision = useDeleteWealthDecision();
  const [period, setPeriod] = useState("1y");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [authorFilter, setAuthorFilter] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [openForm, setOpenForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<DecisionForm>(emptyForm);

  const visible = useMemo(() => {
    const sorted = [...items].sort((a, b) => b.date.localeCompare(a.date));
    const withPeriod =
      period === "30d"
        ? sorted.slice(0, 3)
        : period === "90d"
        ? sorted.slice(0, 6)
        : period === "1y"
          ? sorted
          : period === "ytd"
            ? sorted.filter((item) => item.date.startsWith("2026"))
            : sorted;

    return withPeriod.filter((item) => {
      if (typeFilter !== "all" && item.type !== typeFilter) return false;
      if (authorFilter !== "all" && item.author !== authorFilter) return false;
      if (query.trim()) {
        const hay = `${item.title} ${item.description}`.toLowerCase();
        if (!hay.includes(query.toLowerCase())) return false;
      }
      return true;
    });
  }, [items, period, typeFilter, authorFilter, query]);

  function startCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setOpenForm(true);
  }

  function startEdit(item: FinancialDecision) {
    setEditingId(item.id);
    setForm({
      title: item.title,
      description: item.description,
      type: item.type,
      date: item.date,
      author: item.author,
      relatedScenario: item.relatedScenario ?? "",
    });
    setOpenForm(true);
  }

  function saveDecision(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const payload: WealthDecision = {
      id: editingId ?? `d-${Date.now()}`,
      title: form.title,
      description: form.description,
      type: form.type as WealthDecision["type"],
      date: form.date,
      author: form.author,
      relatedScenario: form.relatedScenario,
    };
    if (editingId) {
      updateDecision.mutate(payload);
    } else {
      createDecision.mutate(payload);
    }
    setOpenForm(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  function removeDecision(id: string) {
    deleteDecision.mutate(id);
  }

  return (
    <PageFrame>
      <PageHeader
        title="Investment Decisions"
      />

      {isLoading ? (
        <SurfaceCard><Skeleton lines={6} /></SurfaceCard>
      ) : isError ? (
        <SurfaceCard>
          <p style={{ color: "var(--color-status-error)" }}>Failed to load decisions. Check that the backend is running.</p>
        </SurfaceCard>
      ) : (<>
      <SurfaceCard>
        <div className="wealth-meta-row">
          <TemporalFilter
            defaultPeriod="1y"
            onPeriodChange={setPeriod}
            periods={[
              { value: "30d", label: "Monthly" },
              { value: "90d", label: "Quarter" },
              { value: "1y", label: "Year" },
              { value: "ytd", label: "YTD" },
            ]}
            showDateRange={false}
          />
          <Button onClick={startCreate}>New Decision</Button>
        </div>

        <div className="wealth-filter-grid" style={{ marginTop: "var(--spacing-12)" }}>
          <FormDropdown
            label="Type"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            options={[
              { value: "all", label: "All types" },
              { value: "Strategy", label: "Strategy" },
              { value: "Purchase", label: "Purchase" },
              { value: "Rebalance", label: "Rebalance" },
              { value: "Investment", label: "Investment" },
              { value: "Other", label: "Other" },
            ]}
          />
          <FormDropdown
            label="Author"
            value={authorFilter}
            onChange={(e) => setAuthorFilter(e.target.value)}
            options={[
              { value: "all", label: "All authors" },
              { value: "Sylvie", label: "Sylvie" },
              { value: "Matthieu", label: "Matthieu" },
            ]}
          />
          <FormInput label="Search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search title or note" />
        </div>
      </SurfaceCard>

      {visible.length === 0 ? (
        <EmptyState title="No decisions found" description="Adjust filters or create a new decision entry." />
      ) : (
        <div className="wealth-decision-grid">
          {visible.map((item) => (
            <SurfaceCard key={item.id} className="wealth-decision-card kpi-card">
              <div className="card-header wealth-decision-card-header">
                <div className="wealth-decision-heading">
                  <p className="wealth-decision-date">{item.date}</p>
                  <Badge tone={typeTone(item.type)}>{item.type}</Badge>
                </div>
                <div className="wealth-actions-row wealth-decision-actions">
                  <Button
                    variant="icon"
                    className="wealth-compact-icon-button"
                    aria-label={`Edit ${item.title}`}
                    title="Edit decision"
                    onClick={() => startEdit(item)}
                  >
                    <EditIcon />
                  </Button>
                  <Button
                    variant="icon"
                    className="wealth-danger-icon-button wealth-compact-icon-button"
                    aria-label={`Delete ${item.title}`}
                    title="Delete decision"
                    onClick={() => removeDecision(item.id)}
                  >
                    <DeleteIcon />
                  </Button>
                </div>
              </div>
              <h3 className="wealth-decision-title">{item.title}</h3>
              <p className="wealth-muted wealth-decision-author">{item.author}</p>
              <p className="wealth-decision-description">{item.description}</p>
              <div className="wealth-decision-footer">
                <p className="wealth-muted wealth-decision-scenario">
                  {item.relatedScenario ? `Scenario: ${item.relatedScenario}` : "No linked scenario"}
                </p>
              </div>
            </SurfaceCard>
          ))}
        </div>
      )}

      <Modal open={openForm} onClose={() => setOpenForm(false)} title={editingId ? "Edit Decision" : "New Decision"}>
        <FormContainer
          title="Decision Entry"
          description="Frontend mock flow for Slice D review."
          onSubmit={saveDecision}
          footer={
            <div className="wealth-modal-actions">
              <Button type="button" variant="secondary" onClick={() => setOpenForm(false)}>
                Cancel
              </Button>
              <Button type="submit">Save Decision</Button>
            </div>
          }
        >
          <FormInput required label="Title" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
          <FormInput required label="Description" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
          <FormDropdown
            label="Type"
            value={form.type}
            onChange={(e) => setForm((p) => ({ ...p, type: e.target.value as FinancialDecision["type"] }))}
            options={[
              { value: "Strategy", label: "Strategy" },
              { value: "Purchase", label: "Purchase" },
              { value: "Rebalance", label: "Rebalance" },
              { value: "Investment", label: "Investment" },
              { value: "Other", label: "Other" },
            ]}
          />
          <FormDropdown
            label="Author"
            value={form.author}
            onChange={(e) => setForm((p) => ({ ...p, author: e.target.value }))}
            options={[
              { value: "Sylvie", label: "Sylvie" },
              { value: "Matthieu", label: "Matthieu" },
            ]}
          />
          <FormDatepicker label="Decision date" value={form.date} onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))} />
          <FormDropdown
            label="Related scenario"
            value={form.relatedScenario}
            onChange={(e) => setForm((p) => ({ ...p, relatedScenario: e.target.value }))}
            options={[
              { value: "", label: "None" },
              ...fireScenarios.map((s) => ({ value: s.id, label: s.name ?? s.id })),
            ]}
          />
        </FormContainer>
      </Modal>
      </>)}
    </PageFrame>
  );
}
