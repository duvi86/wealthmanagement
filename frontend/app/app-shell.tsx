"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useState } from "react";
import { useAuth } from "@/lib/auth-context";

type NavItem = {
  href: string;
  label: string;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/wealth/dashboard", label: "Dashboard" },
  { href: "/wealth/accounts", label: "Accounts" },
  { href: "/wealth/snapshots", label: "Snapshots" },
  { href: "/wealth/fire-scenarios", label: "FIRE Scenarios" },
  { href: "/wealth/tax-calculator", label: "Tax Calculator" },
  { href: "/wealth/decisions", label: "Investment Decisions" },
  { href: "/wealth/real-estate", label: "Real Estate" },
];

function isItemActive(pathname: string, href: string): boolean {
  if (href === "/") {
    return pathname === "/";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const currentYear = new Date().getFullYear();

  const handleLogout = async () => {
    await logout();
    setUserMenuOpen(false);
    router.push("/auth/login");
  };

  return (
    <div className="app-root">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      {/* ── Top bar ───────────────────────────────────────────── */}
      <header className="top-bar">
        {/* Brand: logo + app name */}
        <Link href="/" className="top-bar-brand" aria-label="TwinOps home">
          <Image
            src="/gsk-logo.svg"
            alt="GSK"
            width={64}
            height={28}
            priority
            className="top-bar-logo"
          />
          <span className="top-bar-divider" aria-hidden="true" />
          <span className="top-bar-app-name">Wealth Management</span>
        </Link>

        {/* Desktop nav */}
        {isAuthenticated ? (
          <nav aria-label="Primary navigation" className="top-bar-nav">
            {NAV_ITEMS.map((item) => {
              const active = isItemActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`top-bar-link${active ? " active" : ""}`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        ) : (
          <div style={{ marginLeft: "auto" }}>
            <Link href="/auth/login" className="top-bar-link">
              Sign In
            </Link>
          </div>
        )}

        {/* User profile menu (right side) */}
        {isAuthenticated && user && (
          <div style={{ position: "relative", marginLeft: "auto" }}>
            <button
              type="button"
              className="top-bar-user-button"
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              aria-expanded={userMenuOpen}
              aria-label="User menu"
              title={user.email}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "8px 12px",
                fontSize: "20px",
                color: "var(--color-text-default)",
              }}
            >
              {user.profile_picture_url ? (
                <img
                  src={user.profile_picture_url}
                  alt="Profile"
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    objectFit: "cover",
                  }}
                />
              ) : (
                "👤"
              )}
            </button>

            {/* Dropdown menu */}
            {userMenuOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  right: 0,
                  background: "var(--color-surface-primary)",
                  border: "1px solid var(--color-stroke-primary)",
                  borderRadius: "var(--border-radius-medium)",
                  boxShadow: "var(--elevation-medium)",
                  minWidth: "200px",
                  zIndex: 1000,
                  marginTop: "8px",
                }}
              >
                <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--color-stroke-primary)" }}>
                  <p style={{ margin: 0, fontSize: "12px", color: "var(--color-text-subtle)" }}>Signed in as</p>
                  <p style={{ margin: "4px 0 0", fontWeight: "bold", fontSize: "14px" }}>{user.email}</p>
                </div>

                <Link
                  href="/auth/profile"
                  style={{
                    display: "block",
                    padding: "12px 16px",
                    color: "var(--color-text-default)",
                    textDecoration: "none",
                    borderBottom: "1px solid var(--color-stroke-primary)",
                  }}
                  onClick={() => setUserMenuOpen(false)}
                >
                  Profile & Settings
                </Link>

                <button
                  type="button"
                  onClick={handleLogout}
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    textAlign: "left",
                    color: "var(--color-status-error)",
                    fontSize: "14px",
                    fontFamily: "inherit",
                  }}
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        )}

        {/* Mobile hamburger */}
        <button
          type="button"
          className="menu-toggle"
          aria-expanded={menuOpen}
          aria-controls="mobile-nav"
          aria-label={menuOpen ? "Close navigation" : "Open navigation"}
          onClick={() => setMenuOpen((prev) => !prev)}
        >
          <span className="hamburger-icon" aria-hidden="true">
            {menuOpen ? "✕" : "☰"}
          </span>
        </button>
      </header>

      {/* ── Mobile dropdown nav ───────────────────────────────── */}
      {menuOpen && isAuthenticated && (
        <nav id="mobile-nav" aria-label="Mobile navigation" className="mobile-nav">
          {NAV_ITEMS.map((item) => {
            const active = isItemActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`mobile-nav-link${active ? " active" : ""}`}
                onClick={() => setMenuOpen(false)}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      )}

      {/* ── Page content ──────────────────────────────────────── */}
      <main id="main-content" className="app-main" aria-live="polite">
        {children}
      </main>

      {/* ── Footer ────────────────────────────────────────────── */}
      <footer className="app-footer">
        <p className="app-footer-text">
          Duvinage Inc. © 2026 • MD Wealth Management
        </p>
      </footer>
    </div>
  );
}
