"use client";

import type { ReactNode } from "react";
import { SessionProvider } from "next-auth/react";
import { AutoSync } from "@/components/AutoSync";
import { LocaleProvider } from "@/lib/i18n";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <AutoSync />
      <LocaleProvider>{children}</LocaleProvider>
    </SessionProvider>
  );
}
