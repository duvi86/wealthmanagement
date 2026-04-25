type RagStatus = "green" | "amber" | "red";

type ProgressBarProps = {
  value: number;
  max?: number;
  label?: string;
  showPercent?: boolean;
  color?: string;
};

type RagIndicatorProps = {
  status: RagStatus;
  label?: string;
};

/** Horizontal progress bar. Maps to Dash create_progress_display. */
export function ProgressBar({ value, max = 100, label, showPercent = true, color }: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const fill = color ?? getProgressColor(pct);

  return (
    <div className="progress-root">
      {label || showPercent ? (
        <div className="progress-meta">
          {label ? <span className="progress-label">{label}</span> : null}
          {showPercent ? <span className="progress-pct">{pct.toFixed(0)}%</span> : null}
        </div>
      ) : null}
      <div
        className="progress-track"
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label}
      >
        <div className="progress-fill" style={{ width: `${pct}%`, background: fill }} />
      </div>
    </div>
  );
}

const RAG_LABEL: Record<RagStatus, string> = { green: "On track", amber: "At risk", red: "Off track" };
const RAG_CLASS: Record<RagStatus, string> = {
  green: "rag-green",
  amber: "rag-amber",
  red: "rag-red",
};

/** RAG (Red / Amber / Green) status indicator dot + label. */
export function RagIndicator({ status, label }: RagIndicatorProps) {
  return (
    <span className={`rag-indicator ${RAG_CLASS[status]}`}>
      <span className="rag-dot" aria-hidden="true" />
      <span className="rag-label">{label ?? RAG_LABEL[status]}</span>
    </span>
  );
}

function getProgressColor(pct: number): string {
  if (pct >= 70) return "var(--color-surface-success-strong)";
  if (pct >= 40) return "var(--color-surface-warning-strong)";
  return "var(--color-surface-error-strong)";
}
