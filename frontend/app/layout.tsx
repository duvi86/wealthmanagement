import type { Metadata } from "next";
import { AppShell } from "./app-shell";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "MD Wealth Management",
  description: "Household wealth dashboard for accounts, FIRE planning, tax scenarios, and investment decisions.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
