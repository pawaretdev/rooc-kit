"use client";

import Link from "next/link";
import { Archive } from "lucide-react";
import { setSetting } from "@/lib/local-db";
import { useT } from "@/lib/i18n";
import { useSetting } from "@/features/monster-research/useProgress";
import { LocaleSegment } from "@/components/LocaleSegment";
import { ThemeSegment } from "@/components/ThemeToggle";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

function SettingRow({
  label,
  hint,
  control,
}: {
  label: string;
  hint?: string;
  control: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-4 py-3">
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{label}</span>
        {hint && <span className="block text-xs text-sub">{hint}</span>}
      </span>
      {control}
    </div>
  );
}

/**
 * System-wide preferences. Stored in the same local settings table as the
 * tracker's own options — tracker-context controls (sort, filters, rows
 * shown) stay on the tracker; only cross-cutting preferences live here.
 */
export function SettingsPage() {
  const t = useT();
  const hideTopPick = useSetting<boolean>("mr.hideTopPick", false);

  return (
    <div className="mx-auto w-full max-w-2xl space-y-5">
      <h1 className="text-2xl font-extrabold tracking-tight">
        {t("nav.settings")}
      </h1>

      <section className="rounded-xl border border-line bg-surface px-4 py-1">
        <h2 className="border-b border-line py-3 text-sm font-bold">
          {t("settings.display")}
        </h2>
        <div className="divide-y divide-line">
          <SettingRow label={t("theme.label")} control={<ThemeSegment />} />
          <SettingRow label={t("locale.label")} control={<LocaleSegment />} />
          <SettingRow
            label={t("settings.showTopPick")}
            hint={t("settings.showTopPickHint")}
            control={
              <Label className="gap-0">
                <Checkbox
                  checked={!hideTopPick}
                  onCheckedChange={(v) =>
                    void setSetting("mr.hideTopPick", v !== true)
                  }
                  aria-label={t("settings.showTopPick")}
                />
              </Label>
            }
          />
        </div>
      </section>

      <section className="rounded-xl border border-line bg-surface p-4">
        <h2 className="mb-1 text-sm font-bold">{t("entry.title")}</h2>
        <p className="mb-3 text-xs text-sub">{t("entry.backupHint")}</p>
        <Link
          href="/setup"
          className="press inline-flex items-center gap-2 rounded-lg border border-line px-3.5 py-1.5 text-sm hover:border-accent hover:text-accent"
        >
          <Archive className="size-4" />
          {t("entry.title")}
        </Link>
      </section>
    </div>
  );
}
