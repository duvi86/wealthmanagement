"use client";

import { useEffect } from "react";
import { PageFrame } from "@/components/ui/page-frame";
import { SurfaceCard } from "@/components/ui/surface-card";

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error("Unhandled app error", error);
  }, [error]);

  return (
    <PageFrame>
      <SurfaceCard>
        <h2 style={{ marginTop: 0 }}>Something went wrong</h2>
        <p style={{ color: "var(--color-text-subtle)" }}>
          We could not load this page. Try again, or return to the dashboard.
        </p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button type="button" className="btn-primary" onClick={reset}>
            Try again
          </button>
          <a href="/wealth/dashboard" className="btn-secondary">
            Go to dashboard
          </a>
        </div>
      </SurfaceCard>
    </PageFrame>
  );
}
