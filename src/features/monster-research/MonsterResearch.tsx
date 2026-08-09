"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Archive } from "lucide-react";
import { ELEMENTS, monsters, type Element } from "@/lib/game-data";
import { setSetting, MAX_MR_LEVEL } from "@/lib/local-db";
import { useT } from "@/lib/i18n";
import { ELEMENT_TEXT } from "@/components/ElementBadge";
import { CheckIcon } from "@/components/icons";
import { buildRowViews, levelOf, type RowSort } from "./rowStats";
import { useMonsterLevels, useSetting } from "./useProgress";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RowCard } from "./RowCard";
import { TopPickCard } from "./TopPickCard";
import { MapFilter } from "./MapFilter";

const ROWS_OPTIONS = [5, 10, 20, -1] as const;
const SORTS: RowSort[] = [
  "rowOrder",
  "smartPriority",
  "fewestBlockers",
  "rowLevelAsc",
  "rowLevelDesc",
];
const NO_EXCLUDED_MAPS: string[] = [];

export function MonsterResearch() {
  const t = useT();
  const levels = useMonsterLevels();
  const element = useSetting<Element | "">("mr.elementFilter", "");
  const sort = useSetting<RowSort>("mr.sort", "rowOrder");
  const rowsShown = useSetting<number>("mr.rowsShown", 5);
  const noMvp = useSetting<boolean>("mr.noMvp", false);
  const noMini = useSetting<boolean>("mr.noMini", false);
  const filterBehavior = useSetting<"hide" | "demote">(
    "mr.filterBehavior",
    "hide",
  );
  const excludedMaps = useSetting<string[]>(
    "mr.excludedMaps",
    NO_EXCLUDED_MAPS,
  );
  const hideTopPick = useSetting<boolean>("mr.hideTopPick", false);

  const excludedMapIds = useMemo(() => new Set(excludedMaps), [excludedMaps]);

  const views = useMemo(() => {
    if (!levels) return [];
    return buildRowViews(levels, {
      element: element || undefined,
      sort,
      noMvp,
      noMini,
      excludedMapIds,
      filterBehavior,
    });
  }, [levels, element, sort, noMvp, noMini, excludedMapIds, filterBehavior]);

  /** Tonight's pick — always ranked by smart priority, whatever sort the list uses. */
  const pick = useMemo(() => {
    if (!levels || levels.size === 0 || hideTopPick) return null;
    const top =
      sort === "smartPriority"
        ? views[0]
        : buildRowViews(levels, {
            element: element || undefined,
            sort: "smartPriority",
            noMvp,
            noMini,
            excludedMapIds,
            filterBehavior,
          })[0];
    return top &&
      !top.completed &&
      !top.demoted &&
      top.bestMapId !== null &&
      top.maxSameMapBlockers > 0
      ? top
      : null;
  }, [
    levels,
    hideTopPick,
    sort,
    views,
    element,
    noMvp,
    noMini,
    excludedMapIds,
    filterBehavior,
  ]);

  /** sidebar counts: monsters at Lv 10 / total, per element */
  const progress = useMemo(() => {
    const per = new Map<Element, { maxed: number; total: number }>();
    let maxed = 0;
    let total = 0;
    if (levels) {
      for (const m of monsters.values()) {
        const p = per.get(m.elementId) ?? { maxed: 0, total: 0 };
        p.total += 1;
        total += 1;
        if (levelOf(m.id, levels) >= MAX_MR_LEVEL) {
          p.maxed += 1;
          maxed += 1;
        }
        per.set(m.elementId, p);
      }
    }
    return { per, all: { maxed, total } };
  }, [levels]);

  if (!levels) {
    return <p className="py-16 text-center text-sub">{t("common.loading")}</p>;
  }

  const shown = rowsShown === -1 ? views : views.slice(0, rowsShown);

  const sortLabel: Record<RowSort, string> = {
    rowOrder: t("mr.sort.rowOrder"),
    smartPriority: t("mr.sort.smartPriority"),
    fewestBlockers: t("mr.sort.fewestBlockers"),
    rowLevelAsc: t("mr.sort.rowLevelAsc"),
    rowLevelDesc: t("mr.sort.rowLevelDesc"),
  };

  const sideItem = (el: Element | "") => {
    const active = element === el;
    const p = el === "" ? progress.all : (progress.per.get(el) ?? { maxed: 0, total: 0 });
    const complete = p.total > 0 && p.maxed === p.total;
    return (
      <button
        key={el || "all"}
        type="button"
        aria-pressed={active}
        onClick={() => void setSetting("mr.elementFilter", el)}
        className={`press flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 text-sm ${
          active
            ? "bg-accent font-semibold text-accent-ink"
            : "text-sub hover:bg-surface-2 hover:text-ink"
        }`}
      >
        {el !== "" && (
          <span
            aria-hidden
            className={`inline-block h-2 w-2 rounded-full bg-current ${
              active ? "" : ELEMENT_TEXT[el]
            }`}
          />
        )}
        <span className="truncate">
          {el === "" ? t("mr.element.all") : el}
        </span>
        {complete ? (
          <CheckIcon
            size={13}
            aria-label={t("mr.completedFlag")}
            className={`ml-auto shrink-0 ${active ? "" : "text-gold"}`}
          />
        ) : (
          <span
            className={`ml-auto font-mono text-[11px] tabular-nums ${
              active ? "opacity-80" : "opacity-70"
            }`}
          >
            {p.maxed}/{p.total}
          </span>
        )}
      </button>
    );
  };

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <h1 className="text-2xl font-extrabold tracking-tight text-balance">
          {t("app.tagline")}
        </h1>
        <Button variant="outline" size="sm" className="text-sub" asChild>
          <Link href="/setup">
            <Archive className="size-3.5" />
            {t("nav.dataEntry")}
          </Link>
        </Button>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[200px_1fr]">
          <aside
            aria-label={t("mr.filter.element")}
            className="flex gap-1 overflow-x-auto pb-1 lg:sticky lg:top-16 lg:flex-col lg:overflow-visible lg:rounded-xl lg:border lg:border-line lg:bg-surface lg:p-2 lg:pb-2"
          >
            <span className="hidden px-3 pt-1 pb-1.5 text-[11px] font-semibold tracking-wider text-sub uppercase lg:block">
              {t("mr.filter.element")}
            </span>
            {(["", ...ELEMENTS] as const).map(sideItem)}
          </aside>

          <div className="min-w-0 space-y-4">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
              <h2 className="text-base font-bold">
                {element === "" ? t("mr.element.all") : element}
                <span className="ml-2 font-normal text-sub">
                  {t("mr.rowsCount").replace("{n}", String(views.length))}
                </span>
              </h2>
              <span className="ml-auto inline-flex flex-wrap items-center gap-x-5 gap-y-2">
                <Label className="text-sub">
                  {t("mr.sort.label")}
                  <Select
                    value={sort}
                    onValueChange={(v) => void setSetting("mr.sort", v)}
                  >
                    <SelectTrigger size="sm" className="text-ink">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SORTS.map((s) => (
                        <SelectItem key={s} value={s}>
                          {sortLabel[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Label>
                <Label className="text-sub">
                  {t("mr.rowsShown")}
                  <Select
                    value={String(rowsShown)}
                    onValueChange={(v) =>
                      void setSetting("mr.rowsShown", Number(v))
                    }
                  >
                    <SelectTrigger size="sm" className="text-ink">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROWS_OPTIONS.map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {n === -1 ? t("mr.rows.all") : n}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Label>
              </span>
            </div>

            <fieldset className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
              <legend className="sr-only">{t("mr.filter.label")}</legend>
              <Label className="font-normal">
                <Checkbox
                  checked={noMvp}
                  onCheckedChange={(v) =>
                    void setSetting("mr.noMvp", v === true)
                  }
                />
                {t("mr.filter.noMvp")}
              </Label>
              <Label className="font-normal">
                <Checkbox
                  checked={noMini}
                  onCheckedChange={(v) =>
                    void setSetting("mr.noMini", v === true)
                  }
                />
                {t("mr.filter.noMini")}
              </Label>
              <MapFilter excluded={excludedMapIds} />
              {/* always visible so the hide/demote choice can be made BEFORE
                  a filter is switched on — not only after rows vanished */}
              <Label className="text-sub">
                {t("mr.filter.behaviorLabel")}
                <Select
                  value={filterBehavior}
                  onValueChange={(v) =>
                    void setSetting("mr.filterBehavior", v)
                  }
                >
                  <SelectTrigger size="sm" className="text-ink">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hide">
                      {t("mr.filter.behavior.hide")}
                    </SelectItem>
                    <SelectItem value="demote">
                      {t("mr.filter.behavior.demote")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </Label>
            </fieldset>

            {levels.size === 0 && (
              <p className="rounded-lg border border-dashed border-line bg-surface px-4 py-3 text-sm text-sub">
                {t("mr.emptyState")}
              </p>
            )}

            {shown.length === 0 ? (
              <p className="animate-rise-in py-16 text-center text-sub">
                {t("mr.noRows")}
              </p>
            ) : (
              // keyed by the query signature: a filter/sort change remounts the
              // list so the cards sweep back in staggered (levels edits don't)
              <div
                key={`${element}|${sort}|${String(noMvp)}|${String(noMini)}|${filterBehavior}|${excludedMaps.join(",")}|${rowsShown}`}
                className="space-y-3"
              >
                {pick && (
                  <div className="animate-row-sweep">
                    <TopPickCard view={pick} levels={levels} />
                  </div>
                )}
                {/* avoid the pick stacking directly on its own row card */}
                {(pick && shown[0]?.row.id === pick.row.id
                  ? shown.slice(1)
                  : shown
                ).map((view, i) => (
                  <div
                    key={view.row.id}
                    className="animate-row-sweep"
                    style={
                      {
                        "--sweep-i": Math.min(i + (pick ? 1 : 0), 8),
                      } as React.CSSProperties
                    }
                  >
                    <RowCard view={view} levels={levels} />
                  </div>
                ))}
              </div>
            )}
        </div>
      </div>
    </div>
  );
}
