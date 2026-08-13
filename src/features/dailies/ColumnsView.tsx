"use client";

import type { DailyTaskRecord, GameAccountRecord } from "@/lib/local-db";
import { Checklist, type UrgencyColors } from "./Checklist";
import type { CurrentPeriods } from "./useDailies";

const EMPTY_COUNTS: ReadonlyMap<string, number> = new Map();

/**
 * One column per account, side by side — the wider the screen, the more
 * columns fit; overflow scrolls horizontally.
 */
export function ColumnsView({
  accounts,
  tasks,
  periods,
  allCounts,
  urgencyColors,
}: {
  accounts: GameAccountRecord[];
  tasks: DailyTaskRecord[];
  periods: CurrentPeriods;
  allCounts: ReadonlyMap<string, ReadonlyMap<string, number>>;
  urgencyColors?: UrgencyColors;
}) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {accounts.map((account) => (
        <div key={account.id} className="min-w-72 flex-1 space-y-3">
          <h2 className="truncate border-b-2 border-accent pb-1.5 text-sm font-bold">
            {account.name}
          </h2>
          <Checklist
            tasks={tasks}
            accountId={account.id}
            periods={periods}
            counts={allCounts.get(account.id) ?? EMPTY_COUNTS}
            urgencyColors={urgencyColors}
          />
        </div>
      ))}
    </div>
  );
}
