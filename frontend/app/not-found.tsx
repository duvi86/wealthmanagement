import Link from "next/link";
import { PageFrame } from "@/components/ui/page-frame";
import { SurfaceCard } from "@/components/ui/surface-card";

export default function GlobalNotFound() {
  return (
    <PageFrame>
      <SurfaceCard>
        <h2 style={{ marginTop: 0 }}>Page not found</h2>
        <p style={{ color: "var(--color-text-subtle)" }}>
          The page you requested could not be found.
        </p>
        <Link href="/wealth/dashboard" className="btn-primary" style={{ display: "inline-flex" }}>
          Back to dashboard
        </Link>
      </SurfaceCard>
    </PageFrame>
  );
}
