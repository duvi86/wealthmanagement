"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { GoogleSignInButton } from "@/components/ui/google-signin-button";
import { MicrosoftSignInButton } from "@/components/ui/microsoft-signin-button";
import { PageFrame } from "@/components/ui/page-frame";
import { SurfaceCard } from "@/components/ui/surface-card";
import { AwaitingApprovalBanner } from "@/components/ui/awaiting-approval-banner";

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, isAuthorized, isDemoMode, isLoading } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated && isAuthorized) {
      router.replace("/wealth/dashboard");
    }
  }, [isAuthenticated, isAuthorized, router]);

  if (isLoading) {
    return null;
  }

  if (isAuthenticated && !isAuthorized) {
    return (
      <PageFrame>
        <AwaitingApprovalBanner />
      </PageFrame>
    );
  }

  if (isAuthenticated && isAuthorized) {
    return null;
  }

  const handleSuccess = () => router.push("/wealth/dashboard");
  const handleError = (err: string) => setError(err);

  const subtitle = isDemoMode
    ? "Demo mode is active. No SSO provider is configured — you can explore the app freely."
    : "Sign in with your organisation account to continue.";

  return (
    <PageFrame>
      <div style={{ maxWidth: "400px", margin: "40px auto" }}>
        <SurfaceCard>
          <div style={{ padding: "20px", textAlign: "center" }}>
            <h2>Welcome</h2>
            <p style={{ color: "var(--color-text-subtle)", marginBottom: "20px" }}>
              {subtitle}
            </p>

            {!isDemoMode && (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <GoogleSignInButton onSuccess={handleSuccess} onError={handleError} />
                <MicrosoftSignInButton onSuccess={handleSuccess} onError={handleError} />
              </div>
            )}

            {error && (
              <p style={{ color: "var(--color-status-error)", marginTop: "20px" }}>{error}</p>
            )}
          </div>
        </SurfaceCard>
      </div>
    </PageFrame>
  );
}

