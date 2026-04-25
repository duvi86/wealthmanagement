"use client";

import Link from "next/link";
import { ObjectiveCard } from "@/components/ui/okr-card";
import { useOkrStructure } from "@/hooks/use-api";

export default function OkrPage() {
  const { data, isLoading, error } = useOkrStructure();

  if (isLoading) {
    return (
      <main className="page-shell">
        <section className="page-panel stack">
          <h1>OKR Structure</h1>
          <p>Loading...</p>
        </section>
      </main>
    );
  }

  if (error) {
    return (
      <main className="page-shell">
        <section className="page-panel stack">
          <h1>OKR Structure</h1>
          <div className="status-badge status-error">Error loading data</div>
        </section>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <section className="page-panel stack">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h1>OKR Structure</h1>
          <Link href="/" className="btn-secondary">
            ← Back
          </Link>
        </div>

        {data?.objectives.map((obj) => <ObjectiveCard key={obj.id} objective={obj} />)}
      </section>
    </main>
  );
}
