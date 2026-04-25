import { type ReactNode } from "react";
import { SurfaceCard } from "./surface-card";

type KpiCardProps = {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  tone?: "success" | "error";
};

export function KpiCard({ label, value, detail, tone }: KpiCardProps) {
  const colorClass = tone === "success" ? "text-status-success" : tone === "error" ? "text-status-error" : "";
  return (
    <SurfaceCard className="kpi-card">
      <div className="card-header">
        <p className="kpi-label">{label}</p>
      </div>
      <p className={`kpi-value ${colorClass}`}>{value}</p>
      {detail ? <div className="kpi-detail">{detail}</div> : null}
    </SurfaceCard>
  );
}
