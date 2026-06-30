import Link from "next/link";
import { PageFrame } from "@/components/ui/page-frame";
import { SurfaceCard } from "@/components/ui/surface-card";

export default function WealthNotFound() {
  return (
    <PageFrame>
      <SurfaceCard>
        <h2 style={{ marginTop: 0 }}>Wealth page not found</h2>
        <p style={{ color: "var(--color-text-subtle)" }}>
          The requested wealth route does not exist.
        </p>
        <Link href="/wealth/dashboard" className="btn-primary" style={{ display: "inline-flex" }}>
          Open dashboard
        </Link>
      </SurfaceCard>
    </PageFrame>
  );
}
