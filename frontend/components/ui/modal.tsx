"use client";

import { type ReactNode, useEffect, useRef } from "react";

type ModalVariant = "default" | "confirm" | "info";

type ModalSize = "default" | "wide";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  variant?: ModalVariant;
  size?: ModalSize;
  children: ReactNode;
  footer?: ReactNode;
  headerActions?: ReactNode;
};

/**
 * Accessible modal dialog with overlay.
 * Traps focus on open and restores it on close.
 * Variants: default | confirm | info
 */
export function Modal({
  open,
  onClose,
  title,
  variant = "default",
  size = "default",
  children,
  footer,
  headerActions,
}: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const backdropMouseDownRef = useRef(false);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open) {
      if (!el.open) el.showModal();
    } else {
      if (el.open) el.close();
    }
  }, [open]);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    const handleClose = () => onClose();
    el.addEventListener("close", handleClose);
    return () => el.removeEventListener("close", handleClose);
  }, [onClose]);

  function handleBackdropMouseDown(e: React.MouseEvent<HTMLDialogElement>) {
    // Mark intent to close only if press started directly on the backdrop.
    backdropMouseDownRef.current = e.target === dialogRef.current;
  }

  // Close on backdrop click only when both mouse down and click happened on the backdrop.
  // This prevents accidental close when selecting/dragging from inside modal to outside.
  function handleBackdropClick(e: React.MouseEvent<HTMLDialogElement>) {
    // Don't close if the click target or any parent is an interactive element.
    const target = e.target as HTMLElement;
    if (target.closest("input, button, textarea, select, [role=button]")) {
      backdropMouseDownRef.current = false;
      return;
    }

    if (backdropMouseDownRef.current && e.target === dialogRef.current) {
      onClose();
    }

    backdropMouseDownRef.current = false;
  }

  return (
    <dialog
      ref={dialogRef}
      className={`modal-dialog modal-${variant}${size === "wide" ? " modal-dialog-wide" : ""}`}
      onMouseDown={handleBackdropMouseDown}
      onClick={handleBackdropClick}
      aria-labelledby={title ? "modal-title" : undefined}
    >
      <div className="modal-inner" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          {title ? (
            <h2 id="modal-title" className="modal-title">
              {title}
            </h2>
          ) : null}
          <div className="modal-header-controls">
            {headerActions ? <div className="modal-header-actions">{headerActions}</div> : null}
            <button
              type="button"
              className="modal-close btn-icon"
              aria-label="Close dialog"
              onClick={onClose}
            >
              ✕
            </button>
          </div>
        </div>

        <div className="modal-body">{children}</div>

        {footer ? <div className="modal-footer">{footer}</div> : null}
      </div>
    </dialog>
  );
}
