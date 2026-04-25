"use client";

import { GoogleLogin } from "@react-oauth/google";
import { useAuth } from "@/lib/auth-context";

interface GoogleSignInButtonProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export function GoogleSignInButton({ onSuccess, onError }: GoogleSignInButtonProps) {
  const { login } = useAuth();
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
  const isGoogleClientConfigured =
    googleClientId.length > 0 && !googleClientId.includes("your-google-client-id");

  if (!isGoogleClientConfigured) {
    const message =
      "Google OAuth is not configured. Set NEXT_PUBLIC_GOOGLE_CLIENT_ID in frontend/.env.local.";

    return (
      <div style={{ textAlign: "left", color: "var(--color-status-error)", fontSize: "14px" }}>
        {message}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", justifyContent: "center", gap: "10px" }}>
      <GoogleLogin
        onSuccess={async (credentialResponse) => {
          try {
            if (credentialResponse.credential) {
              await login(credentialResponse.credential);
              onSuccess?.();
            }
          } catch (error) {
            console.error("Sign-in error:", error);
            onError?.(error instanceof Error ? error.message : "Sign-in failed");
          }
        }}
        onError={() => {
          const message = "Google login failed";
          console.error(message);
          onError?.(message);
        }}
        text="signin_with"
        size="large"
        width="300"
      />
    </div>
  );
}
