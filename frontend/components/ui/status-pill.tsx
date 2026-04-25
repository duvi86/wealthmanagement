import { type ReactNode } from "react";

type StatusTone = "success" | "warning" | "error" | "default" | "info";

type StatusPillProps = {
  tone: StatusTone;
  children: ReactNode;
};

export function StatusPill({ tone, children }: StatusPillProps) {
  return <span className={`status-badge status-${tone}`}>{children}</span>;
}
