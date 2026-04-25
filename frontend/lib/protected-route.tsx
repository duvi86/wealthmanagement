"use client";

import { ReactNode } from "react";
import { useAuth } from "./auth-context";
import { Skeleton } from "@/components/ui/loading";
import { LoginPrompt } from "@/components/ui/login-prompt";
import { AwaitingApprovalBanner } from "@/components/ui/awaiting-approval-banner";

interface ProtectedRouteProps {
  children: ReactNode;
  requireAuthorized?: boolean;
}

export function ProtectedRoute({ children, requireAuthorized = true }: ProtectedRouteProps) {
  const { isAuthenticated, isAuthorized, isLoading } = useAuth();

  if (isLoading) {
    return <Skeleton lines={6} />;
  }

  if (!isAuthenticated) {
    return <LoginPrompt />;
  }

  if (requireAuthorized && !isAuthorized) {
    return <AwaitingApprovalBanner />;
  }

  return <>{children}</>;
}
