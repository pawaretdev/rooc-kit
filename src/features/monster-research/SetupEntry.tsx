"use client";

import { useState } from "react";
import { dataVersion, monsters } from "@/lib/game-data";
import {
  fillMonsterLevels,
  localDb,
  replaceAllLevels,
  MAX_MR_LEVEL,
} from "@/lib/local-db";
import {
  buildProgressExport,
  parseProgressExport,
  type ProgressExport,
} from "@/lib/progress-io";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { SyncSection } from "./SyncSection";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

function BackupSection() {
  const t = useT();
  const [status, setStatus] = useState<"idle" | "done" | "invalid">("idle");
  /** parsed file waiting for the user to confirm the destructive replace */
  const [pendingImport, setPendingImport] = useState<ProgressExport | null>(
    null,
  );

  const exportJson = async () => {
    const records = await localDb.monsterLevels.toArray();
    const doc = buildProgressExport(records, dataVersion);
    const blob = new Blob([JSON.stringify(doc, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rooc-kit-progress-${doc.exportedAt.slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const readFile = async (file: File) => {
    setStatus("idle");
    try {
      setPendingImport(parseProgressExport(await file.text()));
    } catch {
      setStatus("invalid");
    }
  };

  const confirmImport = async () => {
    if (!pendingImport) return;
    await replaceAllLevels(pendingImport.levels);
    setPendingImport(null);
    setStatus("done");
  };

  return (
    <section className="rounded-xl border border-line bg-surface p-4">
      <h2 className="mb-1 font-bold">{t("entry.backupTitle")}</h2>
      <p className="mb-3 max-w-prose text-sm text-sub">
        {t("entry.backupHint")}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={() => void exportJson()}>{t("common.export")}</Button>
        <Button variant="outline" asChild>
          <label className="cursor-pointer">
            {t("common.import")}
            <input
              type="file"
              accept="application/json,.json"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void readFile(file);
                e.target.value = "";
              }}
            />
          </label>
        </Button>
        {status === "done" && (
          <span className="text-sm font-medium text-gold">
            {t("entry.importDone")}
          </span>
        )}
        {status === "invalid" && (
          <span className="text-sm font-medium text-danger">
            {t("entry.importInvalid")}
          </span>
        )}
      </div>

      <AlertDialog
        open={pendingImport !== null}
        onOpenChange={(open) => {
          if (!open) setPendingImport(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("common.import")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("entry.importReplaceWarning")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmImport()}>
              {t("common.import")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

export function SetupEntry() {
  const t = useT();

  /** Minis are usually maxed via Bloody Branch, so one click covers them all. */
  const fillAllMinis = () => {
    const miniIds = [...monsters.values()]
      .filter((m) => m.kind === "mini")
      .map((m) => m.id);
    void fillMonsterLevels(miniIds, MAX_MR_LEVEL, "confirmed");
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">
          {t("entry.title")}
        </h1>
        <p className="mt-1 max-w-prose text-sm text-sub">
          {t("entry.movedHint")}
        </p>
      </div>

      <BackupSection />

      <SyncSection />

      <section className="rounded-xl border border-line bg-surface p-4">
        <h2 className="mb-1 font-bold">{t("entry.fillMinis")}</h2>
        <p className="mb-3 max-w-prose text-sm text-sub">
          {t("entry.fillMinisConfirm")}
        </p>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline">{t("entry.fillMinis")}</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("entry.fillMinis")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("entry.fillMinisConfirm")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
              <AlertDialogAction onClick={fillAllMinis}>
                {t("entry.fillMinis")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </section>
    </div>
  );
}
