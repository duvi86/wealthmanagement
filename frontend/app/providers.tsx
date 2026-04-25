"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { ReactNode } from "react";
import { AuthProvider } from "@/lib/auth-context";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 10,
    },
  },
});

export function Providers({ children }: { children: ReactNode }) {
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
  const isGoogleConfigured =
    googleClientId.length > 0 && !googleClientId.includes("your-google-client-id");

  const appTree = (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );

  if (!isGoogleConfigured) {
    return appTree;
  }

  return <GoogleOAuthProvider clientId={googleClientId}>{appTree}</GoogleOAuthProvider>;
}
