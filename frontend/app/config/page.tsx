"use client";

import Link from "next/link";
import { useConfig } from "@/hooks/use-api";

export default function ConfigPage() {
  const { data, isLoading, error } = useConfig();

  if (isLoading) {
    return (
      <main className="page-shell">
        <section className="page-panel stack">
          <h1>Application Config</h1>
          <p>Loading...</p>
        </section>
      </main>
    );
  }

  if (error) {
    return (
      <main className="page-shell">
        <section className="page-panel stack">
          <h1>Application Config</h1>
          <div className="status-badge status-error">Error loading config</div>
        </section>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <section className="page-panel stack">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h1>Application Config</h1>
          <Link href="/" className="btn-secondary">
            ← Back
          </Link>
        </div>

        {data?.app_settings && (
          <div style={{ background: "var(--color-surface-secondary)", padding: "var(--spacing-16)", borderRadius: "var(--border-radius-medium)" }}>
            <dl>
              <div style={{ marginBottom: "var(--spacing-12)" }}>
                <dt className="input-label">App Version</dt>
                <dd className="body2">{data.app_settings.app_version}</dd>
              </div>
              <div style={{ marginBottom: "var(--spacing-12)" }}>
                <dt className="input-label">Data Source</dt>
                <dd className="body2">{data.app_settings.data_source}</dd>
              </div>
              <div style={{ marginBottom: "var(--spacing-12)" }}>
                <dt className="input-label">Chatbot Mode</dt>
                <dd className="body2">{data.app_settings.chatbot_mode}</dd>
              </div>
              <div style={{ marginBottom: "var(--spacing-12)" }}>
                <dt className="input-label">FTE Story Points Rate</dt>
                <dd className="body2">{data.app_settings.fte_story_points_rate}</dd>
              </div>
            </dl>
          </div>
        )}
      </section>
    </main>
  );
}