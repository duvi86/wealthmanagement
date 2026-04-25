"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { ssoLoginWithGoogle, ssoLoginWithMicrosoft, ssoLogout, ssoMe } from "@/lib/sso-client";

export interface User {
  id: string;
  email: string;
  display_name: string | null;
  profile_picture_url: string | null;
  is_authorized: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAuthorized: boolean;
  isDemoMode: boolean;
  oLoginWithGoogle: (idToken: string) => Promise<void>;
  oLoginWithMicrosoft: (idToken: string) => Promise<void>;
  login: (idToken: string) => Promise<void>;
  loginMicrosoft: (idToken: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
  const isGoogleConfigured =
    googleClientId.length > 0 && !googleClientId.includes("your-google-client-id");

  const microsoftClientId = process.env.NEXT_PUBLIC_MICROSOFT_CLIENT_ID || "";
  const isMicrosoftConfigured =
    microsoftClientId.length > 0 && !microsoftClientId.includes("your-microsoft-client-id");

  const isDemoMode =
    !isGoogleConfigured && !isMicrosoftConfigured && process.env.NODE_ENV !== "production";

  const demoUser: User = {
    id: "demo-user",
    email: "demo@local",
    display_name: "Demo User",
    profile_picture_url: null,
    is_authorized: true,
  };

  // Restore session on mount
  useEffect(() => {
    restoreSession();
  }, []);

  const restoreSession = async () => {
    try {
      setIsLoading(true);

      if (isDemoMode) {
        setUser(demoUser);
        return;
      }

      const userData = await ssoMe();
      setUser(userData);
    } catch (error) {
      console.error("Session restore error:", error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (idToken: string) => {
    try {
      setIsLoading(true);

      if (isDemoMode) {
        setUser(demoUser);
        return;
      }

      const data = await ssoLoginWithGoogle(idToken);
      setUser(data.user);
      return;
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const loginMicrosoft = async (idToken: string) => {
    try {
      setIsLoading(true);

      if (isDemoMode) {
        setUser(demoUser);
        return;
      }

      const data = await ssoLoginWithMicrosoft(idToken);
      setUser(data.user);
      return;
    } catch (error) {
      console.error("Microsoft login error:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);

      if (isDemoMode) {
        return;
      }

      await ssoLogout();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setUser(null);
      setIsLoading(false);
    }
  };

  const refreshUser = async () => {
    await restoreSession();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: user !== null,
        isAuthorized: user?.is_authorized ?? false,
        isDemoMode,
        oLoginWithGoogle: login,
        oLoginWithMicrosoft: loginMicrosoft,
        login,
        loginMicrosoft,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
