"use client";

import { type ReactNode, useEffect } from "react";

type ToastTone = "info" | "success" | "warning" | "error";

type ToastProps = {
  message: string;
  tone?: ToastTone;
  onDismiss: () => void;
  autoDismissMs?: number;
  action?: { label: string; onClick: () => void };
};

const TONE_CLASS: Record<ToastTone, string> = {
  info: "toast-info",
  success: "toast-success",
  warning: "toast-warning",
  error: "toast-error",
};

const TONE_ICON: Record<ToastTone, string> = {
  info: "ℹ",
  success: "✓",
  warning: "⚠",
  error: "✕",
};

/** Dismissible toast notification. Maps to Dash notifications pattern. */
export function Toast({ message, tone = "info", onDismiss, autoDismissMs, action }: ToastProps) {
  useEffect(() => {
    if (!autoDismissMs) return;
    const t = setTimeout(onDismiss, autoDismissMs);
    return () => clearTimeout(t);
  }, [autoDismissMs, onDismiss]);

  return (
    <div className={`toast ${TONE_CLASS[tone]}`} role="alert" aria-live="assertive">
      <span className="toast-icon" aria-hidden="true">
        {TONE_ICON[tone]}
      </span>
      <span className="toast-message">{message}</span>
      {action ? (
        <button type="button" className="toast-action btn-ghost btn-sm" onClick={action.onClick}>
          {action.label}
        </button>
      ) : null}
      <button type="button" className="toast-close" aria-label="Dismiss" onClick={onDismiss}>
        ✕
      </button>
    </div>
  );
}

type ToastContainerProps = { children: ReactNode };

/** Fixed container that stacks toasts at bottom-right. */
export function ToastContainer({ children }: ToastContainerProps) {
  return (
    <div className="toast-container" aria-label="Notifications">
      {children}
    </div>
  );
}
