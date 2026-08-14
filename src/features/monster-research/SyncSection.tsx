"use client";

import { useSession } from "next-auth/react";
import { CloudUpload } from "lucide-react";
import { useAutoSyncStatus, type AutoSyncStatus } from "@/components/AutoSync";
import { useT } from "@/lib/i18n";

/**
 * Cloud sync status — rendered on /setup only for signed-in users. Sync is
 * automatic (AutoSync in Providers); this card just tells the user so and
 * shows the live state.
 */
export function SyncSection() {
  const t = useT();
  const { data: session } = useSession();
  const syncStatus = useAutoSyncStatus();

  if (!session?.user) return null;

  // idle only flashes before the first reconcile kicks in — read it as syncing
  const line: Record<AutoSyncStatus, { text: string; tone: string }> = {
    idle: { text: t("sync.syncing"), tone: "text-sub" },
    syncing: { text: t("sync.syncing"), tone: "text-sub" },
    synced: { text: t("sync.synced"), tone: "text-gold" },
    error: { text: t("sync.error"), tone: "text-danger" },
  };

  return (
    <section className="rounded-xl border border-line bg-surface p-4">
      <h2 className="mb-1 font-bold">{t("sync.title")}</h2>
      <p className="mb-3 max-w-prose text-sm text-sub">{t("sync.hint")}</p>
      <p
        className={`flex items-center gap-2 text-sm font-medium ${line[syncStatus].tone}`}
      >
        <CloudUpload className="size-4" />
        {line[syncStatus].text}
      </p>
    </section>
  );
}
