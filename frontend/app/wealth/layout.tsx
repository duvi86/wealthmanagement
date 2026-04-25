"use client";

import { ReactNode } from "react";
import { ProtectedRoute } from "@/lib/protected-route";

export default function WealthLayout({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute requireAuthorized={true}>
      {children}
    </ProtectedRoute>
  );
}
