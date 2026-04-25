import { type CSSProperties, type ReactNode } from "react";

type SurfaceCardProps = {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
};

export function SurfaceCard({ children, className, style }: SurfaceCardProps) {
  const classes = className ? `surface-card ${className}` : "surface-card";

  return <div className={classes} style={style}>{children}</div>;
}
