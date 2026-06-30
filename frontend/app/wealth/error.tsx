"use client";

import { useEffect } from "react";
import { PageFrame } from "@/components/ui/page-frame";
import { SurfaceCard } from "@/components/ui/surface-card";

type WealthErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function WealthError({ error, reset }: WealthErrorProps) {
  useEffect(() => {
    console.error("Unhandled wealth route error", error);
  }, [error]);

  return (
    <PageFrame>
      <SurfaceCard>
        <h2 style={{ marginTop: 0 }}>Unable to load wealth data</h2>
        <p style={{ color: "var(--color-text-subtle)" }}>
          We hit an unexpected error while rendering this wealth page.
        </p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button type="button" className="btn-primary" onClick={reset}>
            Retry
          </button>
          <a href="/wealth/dashboard" className="btn-secondary">
            Dashboard
          </a>
        </div>
      </SurfaceCard>
    </PageFrame>
  );
}
