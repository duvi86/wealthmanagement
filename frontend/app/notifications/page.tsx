"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageFrame, PageHeader } from "@/components/ui/page-frame";
import { SurfaceCard } from "@/components/ui/surface-card";
import { Toast, ToastContainer } from "@/components/ui/toast";

type NotifItem = {
  id: string;
  tone: "info" | "success" | "warning" | "error";
  title: string;
  message: string;
  time: string;
  read: boolean;
};

const INITIAL: NotifItem[] = [
  { id: "n1", tone: "error",   title: "Project off track",      message: "Identity Management is now 3 weeks behind schedule.", time: "2 min ago",  read: false },
  { id: "n2", tone: "warning", title: "Capacity risk",          message: "Alice Chen is allocated to 3 projects this sprint.", time: "15 min ago", read: false },
  { id: "n3", tone: "success", title: "Milestone reached",      message: "CI/CD Modernisation successfully completed Phase 2.", time: "1 hr ago",   read: false },
  { id: "n4", tone: "info",    title: "New dependency added",   message: "API Gateway now depends on Identity Management.",     time: "3 hr ago",   read: true },
  { id: "n5", tone: "info",    title: "Report ready",           message: "Q1 2026 portfolio report is available for download.", time: "Yesterday",  read: true },
];

const TONE_ICON: Record<string, string> = { info: "ℹ", success: "✓", warning: "⚠", error: "✕" };

export default function NotificationsPage() {
  const [items, setItems] = useState<NotifItem[]>(INITIAL);
  const [toasts, setToasts] = useState<NotifItem[]>([]);

  const unread = items.filter((n) => !n.read).length;

  function markRead(id: string) {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }

  function markAllRead() {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  function dismiss(id: string) {
    setItems((prev) => prev.filter((n) => n.id !== id));
  }

  function fireToast(tone: NotifItem["tone"]) {
    const n: NotifItem = {
      id: `toast-${Date.now()}`,
      tone,
      title: "",
      message: `This is a live ${tone} notification.`,
      time: "just now",
      read: false,
    };
    setToasts((prev) => [...prev, n]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== n.id)), 4000);
  }

  return (
    <PageFrame>
      <PageHeader
        title="Notifications"
        description="Notification centre — alerts, toasts, and in-app messages."
      />

      {/* Live toast demo */}
      <SurfaceCard>
        <h3 style={{ margin: "0 0 var(--spacing-12)", fontFamily: "var(--font-bold)", fontSize: 15 }}>
          Toast notifications
        </h3>
        <p style={{ margin: "0 0 var(--spacing-16)", color: "var(--color-text-subtle)", fontSize: 14 }}>
          Trigger a live toast at the bottom-right corner.
        </p>
        <div className="button-row">
          {(["info", "success", "warning", "error"] as const).map((tone) => (
            <Button key={tone} variant="secondary" onClick={() => fireToast(tone)}>
              {tone.charAt(0).toUpperCase() + tone.slice(1)} toast
            </Button>
          ))}
        </div>
      </SurfaceCard>

      {/* Notification list */}
      <SurfaceCard>
        <div className="page-header-row" style={{ marginBottom: "var(--spacing-16)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-8)" }}>
            <h3 style={{ margin: 0, fontFamily: "var(--font-bold)", fontSize: 15 }}>Inbox</h3>
            {unread > 0 ? <Badge tone="error">{unread} unread</Badge> : null}
          </div>
          {unread > 0 ? (
            <Button variant="ghost" size="sm" onClick={markAllRead}>
              Mark all read
            </Button>
          ) : null}
        </div>

        <div className="stack">
          {items.length === 0 ? (
            <div className="empty-state">
              <p className="empty-title">All caught up</p>
              <p className="empty-description">No notifications to show.</p>
            </div>
          ) : (
            items.map((n) => (
              <div
                key={n.id}
                className={`notification-item${n.read ? "" : " unread"} notification-${n.tone}`}
              >
                <span className="notification-icon" aria-hidden="true">{TONE_ICON[n.tone]}</span>
                <div className="notification-body">
                  <div className="notification-header-row">
                    <strong className="notification-title">{n.title}</strong>
                    <span className="notification-time">{n.time}</span>
                  </div>
                  <p className="notification-message">{n.message}</p>
                </div>
                <div className="notification-actions">
                  {!n.read ? (
                    <Button variant="ghost" size="sm" onClick={() => markRead(n.id)}>
                      Mark read
                    </Button>
                  ) : null}
                  <Button variant="ghost" size="sm" onClick={() => dismiss(n.id)} aria-label="Dismiss">
                    ✕
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </SurfaceCard>

      {/* Live toasts */}
      {toasts.length > 0 ? (
        <ToastContainer>
          {toasts.map((t) => (
            <Toast
              key={t.id}
              tone={t.tone}
              message={t.message}
              onDismiss={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
            />
          ))}
        </ToastContainer>
      ) : null}
    </PageFrame>
  );
}
