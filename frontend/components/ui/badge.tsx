import { type ReactNode } from "react";

type BadgeTone = "default" | "success" | "warning" | "error" | "info";

type BadgeProps = {
  tone?: BadgeTone;
  children: ReactNode;
};

const TONE_CLASS: Record<BadgeTone, string> = {
  default: "badge-default",
  success: "badge-success",
  warning: "badge-warning",
  error: "badge-error",
  info: "badge-info",
};

/** Small inline badge with semantic tone colouring. */
export function Badge({ tone = "default", children }: BadgeProps) {
  return <span className={`badge ${TONE_CLASS[tone]}`}>{children}</span>;
}
