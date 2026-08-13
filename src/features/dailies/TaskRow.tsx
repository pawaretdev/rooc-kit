"use client";

import { Minus, Plus } from "lucide-react";
import { setTaskCount, type DailyTaskRecord } from "@/lib/local-db";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export function TaskRow({
  task,
  accountId,
  periodKey,
  count,
  skipped = false,
  urgencyColor,
  eventLastDay = false,
}: {
  task: DailyTaskRecord;
  accountId: string;
  periodKey: string;
  /** rounds done this period */
  count: number;
  /** linked weekly already completed — nothing to do for the rest of the week */
  skipped?: boolean;
  /** opt-in reset-countdown tint, applied only while the task is pending */
  urgencyColor?: string;
  /** special event ends today — small warning dot, no text */
  eventLastDay?: boolean;
}) {
  const t = useT();
  const target = task.targetCount ?? 1;
  const done = count >= target;
  const nameTone = done ? "text-sub line-through" : "";
  const nameStyle = done || !urgencyColor ? undefined : { color: urgencyColor };
  const lastDayDot = eventLastDay && !done && (
    <span
      aria-label={t("dailies.eventEndsToday")}
      title={t("dailies.eventEndsToday")}
      className="size-1.5 shrink-0 animate-pulse rounded-full bg-danger"
    />
  );

  if (skipped) {
    return (
      <div className="flex items-center gap-3 rounded-lg px-2 py-2.5 opacity-60">
        <Checkbox checked disabled />
        <span className="min-w-0 flex-1 truncate text-sm text-sub line-through">
          {task.name}
        </span>
        <span className="shrink-0 rounded-[5px] border border-line px-1.5 py-px font-mono text-[9px] font-bold tracking-wider text-gold uppercase">
          {t("dailies.skippedByWeekly")}
        </span>
      </div>
    );
  }

  // multi-round task — checkbox completes/clears in one tap, −/+ steps rounds
  if (target > 1) {
    return (
      <div className="flex items-center gap-3 rounded-lg px-2 py-2">
        <Checkbox
          checked={done ? true : count > 0 ? "indeterminate" : false}
          aria-label={task.name}
          onCheckedChange={(v) =>
            void setTaskCount(
              accountId,
              task.id,
              periodKey,
              v === true ? target : 0,
            )
          }
        />
        {lastDayDot}
        <span
          style={nameStyle}
          className={`min-w-0 flex-1 truncate text-sm transition-colors ${nameTone}`}
        >
          {task.name}
        </span>
        {/* keyed by count: each round ticks the number with a small pop */}
        <span
          key={count}
          className={`animate-lv-pop shrink-0 text-center font-mono text-xs font-bold tabular-nums transition-colors ${
            done ? "text-gold" : "text-sub"
          }`}
        >
          {count}/{target}
        </span>
        <Button
          variant="outline"
          size="icon-xs"
          disabled={count === 0}
          aria-label={`${task.name} −1`}
          onClick={() =>
            void setTaskCount(accountId, task.id, periodKey, count - 1)
          }
        >
          <Minus />
        </Button>
        <Button
          variant="outline"
          size="icon-xs"
          disabled={done}
          aria-label={`${task.name} +1`}
          onClick={() =>
            void setTaskCount(accountId, task.id, periodKey, count + 1)
          }
        >
          <Plus />
        </Button>
      </div>
    );
  }

  return (
    <Label className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-surface-2">
      <Checkbox
        checked={done}
        onCheckedChange={(v) =>
          void setTaskCount(accountId, task.id, periodKey, v === true ? 1 : 0)
        }
      />
      {lastDayDot}
      <span
        style={nameStyle}
        className={`min-w-0 flex-1 truncate text-sm transition-colors ${nameTone}`}
      >
        {task.name}
      </span>
    </Label>
  );
}
