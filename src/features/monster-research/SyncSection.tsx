"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { CloudUpload, CloudDownload } from "lucide-react";
import { dataVersion } from "@/lib/game-data";
import {
  localDb,
  readAllDailies,
  replaceAllDailies,
  replaceAllLevels,
} from "@/lib/local-db";
import {
  buildProgressExport,
  parseProgressExport,
  type ProgressExport,
} from "@/lib/progress-io";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type SyncStatus =
  | "idle"
  | "uploading"
  | "downloading"
  | "synced"
  | "restored"
  | "empty"
  | "error";

/**
 * Cloud sync — rendered on /setup only for signed-in users. Upload replaces
 * the account snapshot; restore replaces local progress (confirmed first,
 * same warning as file import).
 */
export function SyncSection() {
  const t = useT();
  const { data: session } = useSession();
  const [status, setStatus] = useState<SyncStatus>("idle");
  /** cloud snapshot waiting for the user to confirm the destructive replace */
  const [pendingRestore, setPendingRestore] = useState<ProgressExport | null>(
    null,
  );

  if (!session?.user) return null;
  const busy = status === "uploading" || status === "downloading";

  const upload = async () => {
    setStatus("uploading");
    try {
      const records = await localDb.monsterLevels.toArray();
      // Dailies ride along on the cloud path only — file backups stay levels-only.
      const doc = buildProgressExport(records, dataVersion, await readAllDailies());
      const res = await fetch("/api/progress", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(doc),
      });
      setStatus(res.ok ? "synced" : "error");
    } catch {
      setStatus("error");
    }
  };

  const download = async () => {
    setStatus("downloading");
    try {
      const res = await fetch("/api/progress");
      if (res.status === 404) {
        setStatus("empty");
        return;
      }
      if (!res.ok) {
        setStatus("error");
        return;
      }
      setPendingRestore(parseProgressExport(await res.text()));
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  };

  const confirmRestore = async () => {
    if (!pendingRestore) return;
    try {
      await replaceAllLevels(pendingRestore.levels);
      // Older snapshots have no dailies — leave local dailies untouched then.
      if (pendingRestore.dailies) {
        await replaceAllDailies(pendingRestore.dailies);
      }
      setStatus("restored");
    } catch {
      setStatus("error");
    } finally {
      setPendingRestore(null);
    }
  };

  const statusLine: Partial<Record<SyncStatus, { text: string; tone: string }>> =
    {
      synced: { text: t("sync.done"), tone: "text-gold" },
      restored: { text: t("sync.restored"), tone: "text-gold" },
      empty: { text: t("sync.none"), tone: "text-sub" },
      error: { text: t("sync.error"), tone: "text-danger" },
    };
  const line = statusLine[status];

  return (
    <section className="rounded-xl border border-line bg-surface p-4">
      <h2 className="mb-1 font-bold">{t("sync.title")}</h2>
      <p className="mb-3 max-w-prose text-sm text-sub">{t("sync.hint")}</p>
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={() => void upload()} disabled={busy}>
          <CloudUpload className="size-4" />
          {status === "uploading" ? t("common.loading") : t("sync.upload")}
        </Button>
        <Button
          variant="outline"
          onClick={() => void download()}
          disabled={busy}
        >
          <CloudDownload className="size-4" />
          {status === "downloading" ? t("common.loading") : t("sync.download")}
        </Button>
        {line && (
          <span className={`text-sm font-medium ${line.tone}`}>
            {line.text}
          </span>
        )}
      </div>

      <AlertDialog
        open={pendingRestore !== null}
        onOpenChange={(open) => {
          if (!open) setPendingRestore(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("sync.download")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("entry.importReplaceWarning")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmRestore()}>
              {t("sync.download")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
