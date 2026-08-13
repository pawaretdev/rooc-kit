"use client";

import { CalendarCheck, CalendarClock, Check } from "lucide-react";
import {
  setTaskCount,
  type DailyTaskRecord,
  type GameAccountRecord,
} from "@/lib/local-db";
import { useT } from "@/lib/i18n";
import { isEventEndingSoon } from "./period";
import { isTaskDone, type CurrentPeriods } from "./useDailies";

const EMPTY_COUNTS: ReadonlyMap<string, number> = new Map();

/** Tap to advance one round; tapping when full clears back to zero. */
function MatrixCell({
  task,
  accountId,
  periodKey,
  counts,
  skipped,
}: {
  task: DailyTaskRecord;
  accountId: string;
  periodKey: string;
  counts: ReadonlyMap<string, number>;
  skipped: boolean;
}) {
  const t = useT();
  const target = task.targetCount ?? 1;
  const count = counts.get(task.id) ?? 0;
  const done = count >= target;

  if (skipped) {
    return (
      <span
        title={t("dailies.skippedByWeekly")}
        className="inline-flex h-7 w-9 items-center justify-center font-mono text-xs text-gold"
      >
        —
      </span>
    );
  }

  return (
    <button
      type="button"
      aria-label={task.name}
      aria-pressed={done}
      onClick={() =>
        void setTaskCount(
          accountId,
          task.id,
          periodKey,
          done ? 0 : count + 1,
        )
      }
      className={`press inline-flex h-7 w-9 items-center justify-center rounded-md border font-mono text-xs font-bold tabular-nums transition-colors ${
        done
          ? "border-accent bg-accent text-accent-ink"
          : count > 0
            ? "border-line text-ink"
            : "border-line text-sub/60 hover:border-accent hover:text-accent"
      }`}
    >
      {target > 1 ? `${count}/${target}` : done ? <Check className="size-3.5" /> : ""}
    </button>
  );
}

/**
 * Matrix layout: rows = tasks, columns = accounts — every ID's state in one
 * table, made for "which ID has done what?" at a glance.
 */
export function MatrixView({
  accounts,
  tasks,
  periods,
  allCounts,
}: {
  accounts: GameAccountRecord[];
  tasks: DailyTaskRecord[];
  periods: CurrentPeriods;
  allCounts: ReadonlyMap<string, ReadonlyMap<string, number>>;
}) {
  const t = useT();
  const weeklyById = new Map(
    tasks.filter((task) => task.cadence === "weekly").map((task) => [task.id, task]),
  );

  const isSkipped = (task: DailyTaskRecord, accountId: string) => {
    if (task.cadence !== "daily" || !task.linkedWeeklyId) return false;
    const linked = weeklyById.get(task.linkedWeeklyId);
    if (!linked) return false;
    return isTaskDone(linked, allCounts.get(accountId) ?? EMPTY_COUNTS);
  };

  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-surface">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line text-left">
            <th className="sticky left-0 z-10 bg-surface px-4 py-2.5" />
            {accounts.map((account) => (
              <th
                key={account.id}
                className="max-w-32 truncate px-2 py-2.5 text-center text-xs font-bold"
              >
                {account.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line/60">
          {(["daily", "weekly"] as const).map((cadence) => {
            // `tasks` arrives event-filtered from Dailies.
            const group = tasks.filter((task) => task.cadence === cadence);
            if (group.length === 0) return null;
            const periodKey =
              cadence === "daily" ? periods.daily : periods.weekly;
            return [
              <tr key={`${cadence}-head`} className="bg-surface-2/50">
                <td
                  colSpan={accounts.length + 1}
                  className="px-4 py-1.5 font-mono text-[10px] font-bold tracking-wider text-sub uppercase"
                >
                  <span className="inline-flex items-center gap-1.5">
                    {cadence === "daily" ? (
                      <CalendarCheck className="size-3 text-accent" />
                    ) : (
                      <CalendarClock className="size-3 text-accent" />
                    )}
                    {t(cadence === "daily" ? "dailies.daily" : "dailies.weekly")}
                  </span>
                </td>
              </tr>,
              ...group.map((task) => (
                <tr key={task.id} className="hover:bg-surface-2/40">
                  <td className="sticky left-0 z-10 max-w-52 bg-surface px-4 py-1.5 text-sm">
                    <span className="flex items-center gap-2">
                      {isEventEndingSoon(task.eventEnd) && (
                        <span
                          aria-label={t("dailies.eventEndsToday")}
                          title={t("dailies.eventEndsToday")}
                          className="size-1.5 shrink-0 animate-pulse rounded-full bg-danger"
                        />
                      )}
                      <span className="min-w-0 truncate">{task.name}</span>
                    </span>
                  </td>
                  {accounts.map((account) => (
                    <td key={account.id} className="px-2 py-1.5 text-center">
                      <MatrixCell
                        task={task}
                        accountId={account.id}
                        periodKey={periodKey}
                        counts={allCounts.get(account.id) ?? EMPTY_COUNTS}
                        skipped={isSkipped(task, account.id)}
                      />
                    </td>
                  ))}
                </tr>
              )),
            ];
          })}
        </tbody>
      </table>
    </div>
  );
}
