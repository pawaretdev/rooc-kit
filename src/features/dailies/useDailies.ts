"use client";

import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  localDb,
  type DailyTaskRecord,
  type GameAccountRecord,
} from "@/lib/local-db";
import { currentPeriodKey } from "./period";

/** Sorted live list; undefined while IndexedDB is loading. */
export function useGameAccounts(): GameAccountRecord[] | undefined {
  return useLiveQuery(
    () => localDb.gameAccounts.orderBy("sortOrder").toArray(),
    [],
  );
}

/** Sorted live list; undefined while IndexedDB is loading. */
export function useDailyTasks(): DailyTaskRecord[] | undefined {
  return useLiveQuery(() => localDb.dailyTasks.orderBy("sortOrder").toArray(), []);
}

export interface CurrentPeriods {
  daily: string;
  weekly: string;
}

/**
 * Current period keys, refreshed on mount and whenever the tab regains
 * focus/visibility — event-driven so a tab left open across the 05:00 reset
 * corrects itself on the next interaction without any timers.
 */
export function useCurrentPeriods(): CurrentPeriods {
  const [periods, setPeriods] = useState<CurrentPeriods>(() => ({
    daily: currentPeriodKey("daily"),
    weekly: currentPeriodKey("weekly"),
  }));

  useEffect(() => {
    const refresh = () => {
      setPeriods((prev) => {
        const daily = currentPeriodKey("daily");
        const weekly = currentPeriodKey("weekly");
        return prev.daily === daily && prev.weekly === weekly
          ? prev
          : { daily, weekly };
      });
    };
    refresh();
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);

  return periods;
}

/**
 * taskId → rounds done by the given account in the CURRENT periods.
 * Undefined while loading; stale-period rows are ignored by construction.
 * A task is complete when its count reaches `targetCount ?? 1`.
 */
export function useCompletionCounts(
  accountId: string | undefined,
  periods: CurrentPeriods,
): ReadonlyMap<string, number> | undefined {
  return useLiveQuery(async () => {
    if (!accountId) return new Map<string, number>();
    const rows = await localDb.taskCompletions
      .where("accountId")
      .equals(accountId)
      .toArray();
    const current = new Set([periods.daily, periods.weekly]);
    return new Map(
      rows
        .filter((r) => current.has(r.periodKey))
        .map((r) => [r.taskId, r.count ?? 1]),
    );
  }, [accountId, periods.daily, periods.weekly]);
}

/** A task is complete when its rounds reach `targetCount ?? 1`. */
export function isTaskDone(
  task: DailyTaskRecord,
  counts: ReadonlyMap<string, number>,
): boolean {
  return (counts.get(task.id) ?? 0) >= (task.targetCount ?? 1);
}

/**
 * accountId → (taskId → rounds done) for the CURRENT periods — the
 * all-accounts variant used by the columns and matrix layouts.
 */
export function useAllCompletionCounts(
  periods: CurrentPeriods,
): ReadonlyMap<string, ReadonlyMap<string, number>> | undefined {
  return useLiveQuery(async () => {
    const rows = await localDb.taskCompletions.toArray();
    const current = new Set([periods.daily, periods.weekly]);
    const byAccount = new Map<string, Map<string, number>>();
    for (const row of rows) {
      if (!current.has(row.periodKey)) continue;
      let inner = byAccount.get(row.accountId);
      if (!inner) {
        inner = new Map();
        byAccount.set(row.accountId, inner);
      }
      inner.set(row.taskId, row.count ?? 1);
    }
    return byAccount;
  }, [periods.daily, periods.weekly]);
}

/**
 * templateId → local task id for everything already adopted. Drives both the
 * "hide what's already added" filter and link resolution on adoption.
 */
export function useAdoptedTemplates():
  | ReadonlyMap<string, string>
  | undefined {
  return useLiveQuery(async () => {
    const tasks = await localDb.dailyTasks.toArray();
    return new Map(
      tasks.flatMap((task) =>
        task.templateId ? [[task.templateId, task.id] as const] : [],
      ),
    );
  }, []);
}
