type LoadingSpinnerProps = { size?: "sm" | "md" | "lg"; label?: string };

/** Circular loading spinner. Maps to Dash create_loading_placeholder. */
export function LoadingSpinner({ size = "md", label = "Loading…" }: LoadingSpinnerProps) {
  return (
    <div className={`loading-spinner loading-spinner-${size}`} role="status" aria-label={label}>
      <span className="sr-only">{label}</span>
    </div>
  );
}

type SkeletonProps = { lines?: number; height?: string };

/** Skeleton placeholder while content loads. */
export function Skeleton({ lines = 3, height }: SkeletonProps) {
  return (
    <div className="skeleton-root" aria-busy="true" aria-label="Loading content">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="skeleton-line"
          style={height ? { height } : undefined}
        />
      ))}
    </div>
  );
}
