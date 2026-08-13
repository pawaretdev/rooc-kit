"use client";

import { useEffect, useState } from "react";
import { CalendarRange, Plus, Sparkles } from "lucide-react";
import { addDailyTask, type Cadence } from "@/lib/local-db";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { isWithinEventWindow } from "./period";
import { useAdoptedTemplates } from "./useDailies";

interface TemplateItem {
  id: string;
  name: string;
  cadence: Cadence;
  targetCount: number;
  eventStart: string | null;
  eventEnd: string | null;
  linkedTemplateId: string | null;
  sortOrder: number;
}

type FetchStatus = "loading" | "done" | "error";

/**
 * Suggested tasks curated by the app owner. Read-only fetch (public route) so
 * anonymous users see suggestions too; adopting copies the template into the
 * local task list — the copy never changes when the template does. Fetch
 * failure only hides suggestions, never the rest of the editor (local-first).
 */
export function TemplateBrowser() {
  const t = useT();
  const [status, setStatus] = useState<FetchStatus>("loading");
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const adopted = useAdoptedTemplates();

  // Already-adopted suggestions disappear until the local copy is deleted,
  // and event templates whose window has passed drop out on their own.
  const available =
    status === "done"
      ? templates.filter(
          (tpl) =>
            !adopted?.has(tpl.id) &&
            (!tpl.eventEnd || isWithinEventWindow({ eventEnd: tpl.eventEnd })),
        )
      : [];

  const copy = (tpl: TemplateItem, linkedWeeklyId?: string) =>
    addDailyTask({
      name: tpl.name,
      cadence: tpl.cadence,
      templateId: tpl.id,
      targetCount: tpl.targetCount,
      eventStart: tpl.eventStart ?? undefined,
      eventEnd: tpl.eventEnd ?? undefined,
      linkedWeeklyId,
    });

  /**
   * Adopting a linked daily brings its weekly along: the local copy has to
   * point at the user's own task id, so an unadopted partner is copied first.
   * A dangling linkedTemplateId (partner deleted) just adopts unlinked.
   */
  const adopt = async (tpl: TemplateItem) => {
    if (!tpl.linkedTemplateId) return void (await copy(tpl));
    const existing = adopted?.get(tpl.linkedTemplateId);
    if (existing) return void (await copy(tpl, existing));
    const partner = templates.find((t2) => t2.id === tpl.linkedTemplateId);
    if (!partner) return void (await copy(tpl));
    const partnerId = await copy(partner);
    await copy(tpl, partnerId);
  };

  // Sequential on purpose — addDailyTask assigns sortOrder from the current
  // table state, so parallel adds would race into duplicate orders. Weeklies
  // go first so their dailies can link to freshly created ids.
  const adoptAll = async () => {
    const ordered = [
      ...available.filter((tpl) => tpl.cadence === "weekly"),
      ...available.filter((tpl) => tpl.cadence === "daily"),
    ];
    const localIds = new Map(adopted ?? []);
    for (const tpl of ordered) {
      if (localIds.has(tpl.id)) continue;
      const linked = tpl.linkedTemplateId
        ? localIds.get(tpl.linkedTemplateId)
        : undefined;
      localIds.set(tpl.id, await copy(tpl, linked));
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/templates");
        if (!res.ok) throw new Error();
        const body = (await res.json()) as { templates: TemplateItem[] };
        if (!cancelled) {
          setTemplates(body.templates);
          setStatus("done");
        }
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="rounded-xl border border-line bg-surface p-4">
      <h2 className="mb-1 flex items-center gap-2 text-sm font-bold">
        <Sparkles className="size-4 text-gold" />
        {t("dailies.templates")}
        {available.length > 1 && (
          <Button
            variant="outline"
            size="sm"
            className="ml-auto"
            onClick={() => void adoptAll()}
          >
            <Plus className="size-3.5" />
            {t("dailies.adoptAll")}
          </Button>
        )}
      </h2>
      {status === "loading" && (
        <p className="text-sm text-sub">{t("common.loading")}</p>
      )}
      {status === "error" && (
        <p className="text-sm text-sub">{t("dailies.templatesError")}</p>
      )}
      {status === "done" && available.length === 0 && (
        <p className="text-sm text-sub">{t("dailies.templatesEmpty")}</p>
      )}
      {status === "done" && available.length > 0 && (
        <ul className="divide-y divide-line/60">
          {available.map((tpl) => (
            <li key={tpl.id} className="flex items-center gap-3 py-2">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm">{tpl.name}</span>
                {(tpl.eventStart || tpl.eventEnd) && (
                  <span className="flex items-center gap-1 font-mono text-[10px] text-gold">
                    <CalendarRange className="size-3" />
                    {(tpl.eventStart ?? "…").replace("T", " ")} –{" "}
                    {(tpl.eventEnd ?? "…").replace("T", " ")}
                  </span>
                )}
              </span>
              <span className="rounded-[5px] border border-line px-1.5 py-px font-mono text-[9px] font-bold tracking-wider text-sub uppercase">
                {t(tpl.cadence === "daily" ? "dailies.daily" : "dailies.weekly")}
                {tpl.targetCount > 1 ? ` ×${tpl.targetCount}` : ""}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void adopt(tpl)}
              >
                <Plus className="size-3.5" />
                {t("dailies.adopt")}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
