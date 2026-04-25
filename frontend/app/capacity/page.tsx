"use client";

import Link from "next/link";
import { useState } from "react";
import { Slider } from "@/components/ui/slider";
import { useCalculateCapacity } from "@/hooks/use-api";

export default function CapacityPage() {
  const capacityMutation = useCalculateCapacity(null);

  const [formData, setFormData] = useState({
    milestone_date: "2030-01-15T00:00:00Z",
    fte_next_milestone: "2.0",
    story_points_owner: "16",
    support_13: "8",
    support_14: "5",
  });

  const handleCalculate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await capacityMutation.mutateAsync({
        milestone_date: formData.milestone_date,
        fte_next_milestone: parseFloat(formData.fte_next_milestone),
        story_points_owner: parseInt(formData.story_points_owner),
        story_points_supporting: {
          "13": parseInt(formData.support_13),
          "14": parseInt(formData.support_14),
        },
      });
    } catch (err) {
      console.error("Calculate failed:", err);
    }
  };

  const result = capacityMutation.data;
  const statusClass = result?.at_risk
    ? result.rag_status === "red"
      ? "status-error"
      : "status-warning"
    : "status-success";

  return (
    <main className="page-shell">
      <section className="page-panel stack">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h1>Capacity RAG Calculator</h1>
          <Link href="/" className="btn-secondary">
            ← Back
          </Link>
        </div>

        <form onSubmit={handleCalculate} style={{ background: "var(--color-surface-secondary)", padding: "var(--spacing-16)", borderRadius: "var(--border-radius-medium)" }}>
          <div className="stack">
            <div>
              <label htmlFor="milestone" className="input-label">
                Milestone Date (ISO 8601)
              </label>
              <input
                id="milestone"
                className="sample-input"
                type="text"
                value={formData.milestone_date}
                onChange={(e) => setFormData({ ...formData, milestone_date: e.target.value })}
              />
            </div>

            <div>
              <Slider
                id="fte"
                label="FTE Next Milestone"
                min={0}
                max={10}
                step={0.5}
                value={Number(formData.fte_next_milestone)}
                valueSuffix=" FTE"
                marks={[
                  { value: 0, label: "0" },
                  { value: 5, label: "5" },
                  { value: 10, label: "10" },
                ]}
                onChange={(e) => setFormData({ ...formData, fte_next_milestone: e.target.value })}
              />
            </div>

            <div>
              <Slider
                id="owner_sp"
                label="Story Points (Owner)"
                min={0}
                max={40}
                step={1}
                value={Number(formData.story_points_owner)}
                valueSuffix=" pts"
                marks={[
                  { value: 0, label: "0" },
                  { value: 20, label: "20" },
                  { value: 40, label: "40" },
                ]}
                onChange={(e) => setFormData({ ...formData, story_points_owner: e.target.value })}
              />
            </div>

            <div>
              <Slider
                id="support_13"
                label="Story Points (Team 13 Supporting)"
                min={0}
                max={40}
                step={1}
                value={Number(formData.support_13)}
                valueSuffix=" pts"
                marks={[
                  { value: 0, label: "0" },
                  { value: 20, label: "20" },
                  { value: 40, label: "40" },
                ]}
                onChange={(e) => setFormData({ ...formData, support_13: e.target.value })}
              />
            </div>

            <div>
              <Slider
                id="support_14"
                label="Story Points (Team 14 Supporting)"
                min={0}
                max={40}
                step={1}
                value={Number(formData.support_14)}
                valueSuffix=" pts"
                marks={[
                  { value: 0, label: "0" },
                  { value: 20, label: "20" },
                  { value: 40, label: "40" },
                ]}
                onChange={(e) => setFormData({ ...formData, support_14: e.target.value })}
              />
            </div>

            <button type="submit" className="btn-primary">
              {capacityMutation.isPending ? "Calculating..." : "Calculate RAG"}
            </button>
          </div>
        </form>

        {result && (
          <div style={{ marginTop: "var(--spacing-24)" }}>
            <h3>Result</h3>
            <div className={`status-badge ${statusClass}`}>
              RAG Status: {result.rag_status || "N/A"} • At Risk: {result.at_risk ? "Yes" : "No"}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
