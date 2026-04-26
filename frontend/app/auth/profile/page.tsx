"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { FormInput } from "@/components/ui/form-input";
import { PageFrame, PageHeader } from "@/components/ui/page-frame";
import { SurfaceCard } from "@/components/ui/surface-card";
import { Skeleton } from "@/components/ui/loading";
import {
  addAuthorizedEmail,
  listAuthorizedEmails,
  removeAuthorizedEmail,
  type AuthorizedEmail,
} from "@/lib/sso-client";

export default function ProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, isAuthorized, logout } = useAuth();
  const [emails, setEmails] = useState<AuthorizedEmail[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchAuthorizedEmails = useCallback(async () => {
    try {
      setLoading(true);
      const data = await listAuthorizedEmails();
      setEmails(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading emails");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/auth/login");
      return;
    }
    if (!isAuthorized) {
      router.push("/");
      return;
    }
    void fetchAuthorizedEmails();
  }, [isAuthenticated, isAuthorized, router, fetchAuthorizedEmails]);

  const handleAddEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!newEmail) {
      setError("Email is required");
      return;
    }

    try {
      await addAuthorizedEmail(newEmail, notes || null);
      setSuccess(`Email ${newEmail} has been authorized`);
      setNewEmail("");
      setNotes("");
      await fetchAuthorizedEmails();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error adding email");
    }
  };

  const handleRemoveEmail = async (email: string) => {
    if (!confirm(`Remove ${email} from authorized list?`)) return;

    try {
      await removeAuthorizedEmail(email);
      setSuccess(`Email ${email} has been removed`);
      await fetchAuthorizedEmails();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error removing email");
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push("/auth/login");
  };

  if (!isAuthenticated || !user) {
    return <Skeleton lines={6} />;
  }

  return (
    <PageFrame>
      <PageHeader title="Profile & Settings" />

      {/* User Profile Section */}
      <SurfaceCard style={{ marginBottom: "20px" }}>
        <div style={{ display: "flex", gap: "20px", alignItems: "flex-start" }}>
          {user.profile_picture_url ? (
            <Image
              src={user.profile_picture_url}
              alt={user.display_name || "Profile"}
              width={80}
              height={80}
              unoptimized
              style={{ borderRadius: "50%", objectFit: "cover" }}
            />
          ) : (
            <div
              style={{
                width: "80px",
                height: "80px",
                borderRadius: "50%",
                backgroundColor: "var(--color-primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "24px",
                fontWeight: "bold",
                color: "white",
              }}
            >
              {(user.display_name || user.email)
                .split(" ")
                .slice(0, 2)
                .map((word) => word[0].toUpperCase())
                .join("")}
            </div>
          )}
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: "0 0 10px 0" }}>{user.display_name || user.email}</h3>
            <p style={{ margin: 0, color: "var(--color-text-subtle)" }}>{user.email}</p>
            <p style={{ margin: "10px 0 0", fontSize: "13px" }}>
              Status: <strong>{user.is_authorized ? "✓ Authorized" : "⚠ Pending Authorization"}</strong>
            </p>
          </div>
          <Button variant="secondary" onClick={handleLogout}>
            Sign Out
          </Button>
        </div>
      </SurfaceCard>

      {/* Add Email Section */}
      <SurfaceCard style={{ marginBottom: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h3 style={{ margin: 0 }}>Add Authorized Email</h3>
        </div>

        <form
          onSubmit={handleAddEmail}
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr auto",
            gap: "10px",
            alignItems: "flex-end",
          }}
        >
          <FormInput
            label="Email Address"
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="user@example.com"
            required
          />
          <FormInput
            label="Notes (Optional)"
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g., Team lead"
          />
          <Button type="submit">Add Email</Button>
        </form>

        {error && <p style={{ color: "var(--color-status-error)", marginTop: "10px" }}>{error}</p>}
        {success && <p style={{ color: "var(--color-status-success)", marginTop: "10px" }}>{success}</p>}
      </SurfaceCard>

      {/* Authorized Emails List */}
      <SurfaceCard>
        <h3 style={{ margin: "0 0 20px 0" }}>Authorized Email Addresses</h3>

        {loading ? (
          <Skeleton lines={4} />
        ) : emails.length === 0 ? (
          <p style={{ color: "var(--color-text-subtle)" }}>No authorized emails yet.</p>
        ) : (
          <DataTable<AuthorizedEmail>
            columns={[
              { key: "email", label: "Email", render: (v) => String(v ?? "") },
              { key: "approved_at", label: "Approved", render: (v) => new Date(String(v ?? "")).toLocaleDateString() },
              {
                key: "notes",
                label: "Notes",
                render: (v) => (v as string | null) || "-",
              },
              {
                key: "actions",
                label: "Actions",
                render: (_v, row) => (
                  <Button
                    variant="secondary"
                    onClick={() => handleRemoveEmail((row as AuthorizedEmail).email)}
                    style={{ padding: "4px 8px", fontSize: "12px" }}
                  >
                    Remove
                  </Button>
                ),
              },
            ]}
            data={emails}
            rowKey="id"
            onRowClick={undefined}
          />
        )}
      </SurfaceCard>
    </PageFrame>
  );
}
