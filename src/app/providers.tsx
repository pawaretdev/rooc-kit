"use client";

import type { ReactNode } from "react";
import { SessionProvider } from "next-auth/react";
import { AutoSync } from "@/components/AutoSync";
import { DefenseHistorySync } from "@/features/defense/DefenseHistorySync";
import { LocaleProvider } from "@/lib/i18n";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <AutoSync />
      <DefenseHistorySync />
      <LocaleProvider>{children}</LocaleProvider>
    </SessionProvider>
  );
}
