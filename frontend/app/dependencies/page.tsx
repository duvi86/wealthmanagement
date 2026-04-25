"use client";

import Link from "next/link";
import { useState } from "react";
import { useDependenciesForKr, useDependentProgress, useCreateDependency, useDeleteDependency } from "@/hooks/use-api";

const SOURCE_KR_ID = 101; // Demo key result

export default function DependenciesPage() {
  const { data: depsData, isLoading } = useDependenciesForKr(SOURCE_KR_ID);
  const { data: progData } = useDependentProgress(SOURCE_KR_ID);
  const createMutation = useCreateDependency();
  const deleteMutation = useDeleteDependency();

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<{
    target_id: string;
    relationship_type: "positive" | "negative";
    dependency_weight: string;
  }>({
    target_id: "102",
    relationship_type: "positive",
    dependency_weight: "0.5",
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createMutation.mutateAsync({
        source_kr_id: SOURCE_KR_ID,
        target_id: parseInt(formData.target_id),
        target_type: "key_result",
        relationship_type: formData.relationship_type,
        dependency_weight: parseFloat(formData.dependency_weight),
      });
      setShowForm(false);
      setFormData({ target_id: "102", relationship_type: "positive", dependency_weight: "0.5" });
    } catch (err) {
      console.error("Create failed:", err);
    }
  };

  if (isLoading) {
    return (
      <main className="page-shell">
        <section className="page-panel stack">
          <h1>Dependencies</h1>
          <p>Loading...</p>
        </section>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <section className="page-panel stack">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h1>Dependencies for KR {SOURCE_KR_ID}</h1>
          <Link href="/" className="btn-secondary">
            ← Back
          </Link>
        </div>

        {progData?.dependent_progress !== null && (
          <div className="status-badge status-success">
            Weighted Progress: {progData?.dependent_progress}%
          </div>
        )}

        <div className="button-row">
          <button
            type="button"
            className="btn-primary"
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? "Cancel" : "Add Dependency"}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleCreate} style={{ background: "var(--color-surface-secondary)", padding: "var(--spacing-16)", borderRadius: "var(--border-radius-medium)" }}>
            <div className="stack">
              <div>
                <label htmlFor="target_id" className="input-label">
                  Target KR ID
                </label>
                <input
                  id="target_id"
                  className="sample-input"
                  type="number"
                  value={formData.target_id}
                  onChange={(e) => setFormData({ ...formData, target_id: e.target.value })}
                />
              </div>

              <div>
                <label htmlFor="rel_type" className="input-label">
                  Relationship Type
                </label>
                <select
                  id="rel_type"
                  className="sample-input"
                  value={formData.relationship_type}
                  onChange={(e) => setFormData({ ...formData, relationship_type: e.target.value as "positive" | "negative" })}
                >
                  <option>positive</option>
                  <option>negative</option>
                </select>
              </div>

              <div>
                <label htmlFor="weight" className="input-label">
                  Weight (0-1)
                </label>
                <input
                  id="weight"
                  className="sample-input"
                  type="number"
                  step="0.1"
                  min="0"
                  max="1"
                  value={formData.dependency_weight}
                  onChange={(e) => setFormData({ ...formData, dependency_weight: e.target.value })}
                />
              </div>

              <button type="submit" className="btn-primary">
                {createMutation.isPending ? "Creating..." : "Create"}
              </button>
            </div>
          </form>
        )}

        <div>
          <h3>Dependencies</h3>
          {depsData?.dependencies.length === 0 ? (
            <p className="body2">No dependencies found.</p>
          ) : (
            depsData?.dependencies.map((dep) => (
              <div
                key={dep.id}
                style={{
                  background: "var(--color-surface-secondary)",
                  padding: "var(--spacing-12)",
                  borderRadius: "var(--border-radius-medium)",
                  marginTop: "var(--spacing-8)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <p className="body2" style={{ fontWeight: 600 }}>
                    {dep.target_title || `KR ${dep.target_id}`}
                  </p>
                  <p className="body3">
                    Type: {dep.relationship_type} • Weight: {(dep.dependency_weight * 100).toFixed(0)}%
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => deleteMutation.mutate(dep.id)}
                  style={{
                    background: "var(--color-surface-error-strong)",
                    color: "white",
                    border: "none",
                    padding: "var(--spacing-8) var(--spacing-12)",
                    borderRadius: "var(--border-radius-medium)",
                    cursor: "pointer",
                  }}
                >
                  Delete
                </button>
              </div>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
