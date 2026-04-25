"use client";

import { type ButtonHTMLAttributes, forwardRef } from "react";

type ButtonVariant =
  | "primary"
  | "secondary"
  | "tertiary"
  | "ghost"
  | "danger"
  | "icon";
type ButtonSize = "sm" | "md" | "lg";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
};

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: "btn-primary",
  secondary: "btn-secondary",
  tertiary: "btn-tertiary",
  ghost: "btn-ghost",
  danger: "btn-danger",
  icon: "btn-icon",
};

const SIZE_CLASS: Record<ButtonSize, string> = {
  sm: "btn-sm",
  md: "",
  lg: "btn-lg",
};

/**
 * GSK design-system button.
 * Variants: primary | secondary | tertiary | ghost | danger | icon
 * Sizes: sm | md | lg
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      disabled,
      children,
      className = "",
      ...rest
    },
    ref,
  ) => {
    const classes = [
      VARIANT_CLASS[variant],
      SIZE_CLASS[size],
      loading ? "btn-loading" : "",
      className,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <button
        ref={ref}
        className={classes}
        disabled={disabled ?? loading}
        aria-busy={loading || undefined}
        {...rest}
      >
        {loading ? <span className="btn-spinner" aria-hidden="true" /> : null}
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";
