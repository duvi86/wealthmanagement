import { PageFrame } from "@/components/ui/page-frame";
import { SurfaceCard } from "@/components/ui/surface-card";
import { Skeleton } from "@/components/ui/loading";

export default function GlobalLoading() {
  return (
    <PageFrame>
      <SurfaceCard>
        <Skeleton lines={8} />
      </SurfaceCard>
    </PageFrame>
  );
}
