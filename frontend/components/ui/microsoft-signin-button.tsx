"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  isMicrosoftConfigured,
  signInWithMicrosoftPopup,
  MicrosoftAuthCancelledError,
} from "@/lib/microsoft-auth";

interface MicrosoftSignInButtonProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export function MicrosoftSignInButton({ onSuccess, onError }: MicrosoftSignInButtonProps) {
  const { loginMicrosoft } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const configured = isMicrosoftConfigured();

  const handleSignIn = async () => {
    if (!configured) return;
    setIsLoading(true);
    try {
      const { idToken } = await signInWithMicrosoftPopup();
      await loginMicrosoft(idToken);
      onSuccess?.();
    } catch (err) {
      // User deliberately closed the popup — treat as non-fatal.
      if (err instanceof MicrosoftAuthCancelledError) {
        return;
      }
      const message =
        err instanceof Error ? err.message : "Microsoft sign-in failed";
      console.error("Microsoft sign-in error:", err);
      onError?.(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
      <button
        onClick={handleSignIn}
        disabled={isLoading || !configured}
        title={!configured ? "Set NEXT_PUBLIC_MICROSOFT_CLIENT_ID in frontend/.env.local to enable" : undefined}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          padding: "10px 20px",
          background: configured ? "#fff" : "#f5f5f5",
          border: "1px solid #8c8c8c",
          borderRadius: "4px",
          cursor: configured && !isLoading ? "pointer" : "not-allowed",
          fontSize: "14px",
          fontWeight: 500,
          color: configured ? "#3c4043" : "#aaa",
          width: "300px",
          justifyContent: "center",
          opacity: isLoading ? 0.7 : 1,
        }}
      >
        {/* Microsoft logo SVG */}
        <svg width="18" height="18" viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg" style={{ opacity: configured ? 1 : 0.4 }}>
          <rect x="1" y="1" width="9" height="9" fill="#f25022" />
          <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
          <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
          <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
        </svg>
        {isLoading ? "Signing in…" : "Sign in with Microsoft"}
      </button>
      {!configured && (
        <p style={{ fontSize: "11px", color: "var(--color-text-subtle)", margin: 0 }}>
          Set <code>NEXT_PUBLIC_MICROSOFT_CLIENT_ID</code> to enable
        </p>
      )}
    </div>
  );
}
