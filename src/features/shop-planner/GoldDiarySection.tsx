"use client";

import { ChevronDown, NotebookPen } from "lucide-react";
import { setDiaryEntry, setSetting, type GoldDiaryRecord } from "@/lib/local-db";
import { useT } from "@/lib/i18n";
import { useSetting } from "@/features/monster-research/useProgress";
import { Input } from "@/components/ui/input";
import { currentGameDate } from "@/features/dailies/period";
import { diaryWeeks, weekDatesOf } from "./plan-math";

/** open/closed is a per-device UI preference — deliberately not synced */
const DIARY_OPEN_KEY = "shop.diaryOpen";

/**
 * The gold diary lives below the plan, collapsed by default, so the advanced
 * habit never clutters the main flow. Entries are keyed by game date (05:00
 * boundary), matching how a play session actually spans midnight.
 */
export function GoldDiarySection({
  accountId,
  entries,
}: {
  accountId: string;
  entries: GoldDiaryRecord[];
}) {
  const t = useT();
  const isOpen = useSetting<boolean>(DIARY_OPEN_KEY, false);

  const today = currentGameDate();
  const thisWeek = weekDatesOf(today);
  const byDate = new Map(entries.map((e) => [e.date, e.amount]));
  // The history list covers finished weeks; the current one is editable above.
  const pastWeeks = diaryWeeks(entries).filter(
    (week) => week.weekStart !== thisWeek[0],
  );

  return (
    <section className="rounded-xl border border-line bg-surface">
      <button
        type="button"
        aria-expanded={isOpen}
        onClick={() => void setSetting(DIARY_OPEN_KEY, !isOpen)}
        className="press flex w-full items-center gap-2 rounded-xl p-4 text-left"
      >
        <NotebookPen className="size-4 text-gold" />
        <span className="text-sm font-bold">{t("shop.diary")}</span>
        <ChevronDown
          className={`ml-auto size-4 text-sub transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="animate-rise-in space-y-4 px-4 pb-4">
          <p className="text-xs text-sub">{t("shop.diaryHint")}</p>

          <div>
            <p className="mb-1 font-mono text-[10px] font-bold tracking-wider text-sub uppercase">
              {t("shop.diaryThisWeek")}
            </p>
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-7">
              {thisWeek.map((date) => {
                const future = date > today;
                const isToday = date === today;
                return (
                  <li
                    key={date}
                    className={`rounded-lg border p-2 ${
                      isToday ? "border-accent" : "border-line"
                    } ${future ? "opacity-40" : ""}`}
                  >
                    <span className="block font-mono text-[10px] text-sub tabular-nums">
                      {date.slice(5)}
                    </span>
                    <Input
                      key={`${date}:${byDate.get(date) ?? ""}`}
                      defaultValue={byDate.get(date) ?? ""}
                      type="number"
                      min={0}
                      inputMode="numeric"
                      placeholder="0"
                      disabled={future}
                      aria-label={date}
                      className="mt-1 h-7 w-full px-1.5 font-mono text-xs tabular-nums"
                      onBlur={(e) => {
                        const raw = e.target.value.trim();
                        const amount = raw === "" ? 0 : Math.floor(Number(raw));
                        if (!Number.isFinite(amount) || amount < 0) {
                          e.target.value = String(byDate.get(date) ?? "");
                          return;
                        }
                        if (amount !== (byDate.get(date) ?? 0)) {
                          void setDiaryEntry(accountId, date, amount);
                        }
                      }}
                    />
                  </li>
                );
              })}
            </ul>
          </div>

          <div>
            <p className="mb-1 font-mono text-[10px] font-bold tracking-wider text-sub uppercase">
              {t("shop.diaryPastWeeks")}
            </p>
            {pastWeeks.length === 0 ? (
              <p className="text-sm text-sub">{t("shop.diaryEmpty")}</p>
            ) : (
              <ul className="divide-y divide-line/60">
                {pastWeeks.map((week) => (
                  <li key={week.weekStart} className="flex items-center gap-3 py-2">
                    <span className="min-w-0 flex-1 text-sm">
                      {t("shop.diaryWeekOf")}{" "}
                      <span className="font-mono tabular-nums">{week.weekStart}</span>
                      <span className="ml-2 text-xs text-sub">
                        {t("shop.diaryDaysLogged").replace("{n}", String(week.days))}
                      </span>
                    </span>
                    <span className="text-right">
                      <span className="block font-mono text-sm font-bold text-gold tabular-nums">
                        {week.total.toLocaleString()}
                        <span className="ml-1 font-sans text-[10px] font-normal text-sub">
                          {t("shop.diaryTotal")}
                        </span>
                      </span>
                      <span className="block font-mono text-xs text-sub tabular-nums">
                        {Math.round(week.avgPerLoggedDay).toLocaleString()}{" "}
                        {t("shop.diaryAvgPerDay")}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
