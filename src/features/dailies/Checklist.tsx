"use client";

import { CalendarCheck, CalendarClock } from "lucide-react";
import type { DailyTaskRecord } from "@/lib/local-db";
import { useT, type MessageKey } from "@/lib/i18n";
import { TaskRow } from "./TaskRow";
import { isEventEndingSoon } from "./period";
import { isTaskDone, type CurrentPeriods } from "./useDailies";

/** Per-cadence urgency tint colors; undefined = feature off / far from reset. */
export interface UrgencyColors {
  daily?: string;
  weekly?: string;
}

function Section({
  titleKey,
  icon,
  tasks,
  accountId,
  periodKey,
  counts,
  skippedIds,
  urgencyColor,
  lastDayIds,
}: {
  titleKey: MessageKey;
  icon: React.ReactNode;
  tasks: DailyTaskRecord[];
  accountId: string;
  periodKey: string;
  counts: ReadonlyMap<string, number>;
  /** dailies whose linked weekly is already done — shown but not counted */
  skippedIds?: ReadonlySet<string>;
  /** reset-countdown tint for pending rows (opt-in feature) */
  urgencyColor?: string;
  /** event tasks whose window ends today */
  lastDayIds?: ReadonlySet<string>;
}) {
  const t = useT();
  if (tasks.length === 0) return null;
  const countable = tasks.filter((task) => !skippedIds?.has(task.id));
  const doneCount = countable.filter((task) => isTaskDone(task, counts)).length;
  const allDone = doneCount === countable.length;
  // Unfinished always on top; done sinks, skipped sinks below done.
  // Array.sort is stable, so sortOrder is preserved within each band.
  const rank = (task: DailyTaskRecord) =>
    skippedIds?.has(task.id) ? 2 : isTaskDone(task, counts) ? 1 : 0;
  const displayTasks = [...tasks].sort((a, b) => rank(a) - rank(b));

  return (
    <section className="rounded-xl border border-line bg-surface px-3 py-1">
      <header className="flex items-center gap-2 border-b border-line px-2 py-3">
        {icon}
        <h2 className="text-sm font-bold">{t(titleKey)}</h2>
        {/* keyed by the count so the badge pops on every check-off, and lands
            on the gold "all done" state with the same beat */}
        <span
          key={`${doneCount}/${countable.length}`}
          className={`animate-lv-pop ml-auto font-mono text-xs font-bold transition-colors ${
            allDone ? "text-gold" : "text-sub"
          }`}
        >
          {allDone
            ? t("dailies.allDone")
            : `${doneCount}/${countable.length}`}
        </span>
      </header>
      <div className="divide-y divide-line/60 py-1">
        {displayTasks.map((task, i) => (
          <div
            key={task.id}
            className="animate-stagger-in"
            style={{ "--stagger-i": i } as React.CSSProperties}
          >
          <TaskRow
            task={task}
            accountId={accountId}
            periodKey={periodKey}
            count={counts.get(task.id) ?? 0}
            skipped={skippedIds?.has(task.id)}
            urgencyColor={urgencyColor}
            eventLastDay={lastDayIds?.has(task.id)}
          />
          </div>
        ))}
      </div>
    </section>
  );
}

/** Day-to-day check-off view for one account: Daily then Weekly section. */
export function Checklist({
  tasks,
  accountId,
  periods,
  counts,
  urgencyColors,
}: {
  tasks: DailyTaskRecord[];
  accountId: string;
  periods: CurrentPeriods;
  counts: ReadonlyMap<string, number>;
  /** reset-countdown tints per cadence; omitted = feature off */
  urgencyColors?: UrgencyColors;
}) {
  // `tasks` is already event-filtered by Dailies — this view only splits it.
  const daily = tasks.filter((task) => task.cadence === "daily");
  const weekly = tasks.filter((task) => task.cadence === "weekly");
  const lastDayIds = new Set(
    tasks
      .filter((task) => isEventEndingSoon(task.eventEnd))
      .map((task) => task.id),
  );
  const weeklyById = new Map(weekly.map((task) => [task.id, task]));
  // A daily whose linked weekly already hit its target this week is a no-op
  // for the remaining days — shown struck-through and left out of the counts.
  const skippedDailyIds = new Set(
    daily
      .filter((task) => {
        if (!task.linkedWeeklyId) return false;
        const linked = weeklyById.get(task.linkedWeeklyId);
        return linked !== undefined && isTaskDone(linked, counts);
      })
      .map((task) => task.id),
  );

  return (
    <div className="space-y-4">
      <Section
        titleKey="dailies.daily"
        icon={<CalendarCheck className="size-4 text-accent" />}
        tasks={daily}
        accountId={accountId}
        periodKey={periods.daily}
        counts={counts}
        skippedIds={skippedDailyIds}
        urgencyColor={urgencyColors?.daily}
        lastDayIds={lastDayIds}
      />
      <Section
        titleKey="dailies.weekly"
        icon={<CalendarClock className="size-4 text-accent" />}
        tasks={weekly}
        accountId={accountId}
        periodKey={periods.weekly}
        counts={counts}
        urgencyColor={urgencyColors?.weekly}
        lastDayIds={lastDayIds}
      />
    </div>
  );
}
