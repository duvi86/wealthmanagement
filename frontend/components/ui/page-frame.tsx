import Link from "next/link";
import { type ReactNode } from "react";

type PageFrameProps = {
  children: ReactNode;
};

type PageHeaderProps = {
  title: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
  rightContent?: ReactNode;
};

export function PageFrame({ children }: PageFrameProps) {
  return (
    <div className="page-shell">
      <div className="page-panel stack">{children}</div>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  backHref,
  backLabel = "Back",
  rightContent,
}: PageHeaderProps) {
  return (
    <div className="page-header-row">
      <div>
        <h1 style={{ margin: 0 }}>{title}</h1>
        {description ? (
          <p style={{ margin: "var(--spacing-4) 0 0", color: "var(--color-text-subtle)", fontFamily: "var(--font-regular)", fontSize: 14 }}>
            {description}
          </p>
        ) : null}
      </div>
      {rightContent ? rightContent : null}
      {backHref ? (
        <Link href={backHref} className="btn-secondary">
          {backLabel}
        </Link>
      ) : null}
    </div>
  );
}
