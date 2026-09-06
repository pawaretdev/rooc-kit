"use client";

import { useEffect, useState } from "react";
import { BellRing, CalendarDays, Check } from "lucide-react";
import { GoldCoin } from "@/components/GoldCoin";
import {
  setDiaryEntry,
  type GameAccountRecord,
  type GoldDiaryRecord,
} from "@/lib/local-db";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { msUntilReset } from "@/features/dailies/period";
import { isReminderWindow, REMINDER_HOURS_BEFORE_RESET } from "./calendar-math";

const HOUR = 3_600_000;

/**
 * Whether the evening reminder window is open, re-checked when the tab comes
 * back and on a single timer aimed at the next boundary (window opening or the
 * 05:00 reset) — so a tab left open flips at 21:00 without polling.
 */
function useReminderWindow(): boolean {
  const [due, setDue] = useState(false);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      const now = Date.now();
      setDue(isReminderWindow(now));
      const untilReset = msUntilReset("daily", now);
      const untilWindow = untilReset - REMINDER_HOURS_BEFORE_RESET * HOUR;
      const next = untilWindow > 0 ? untilWindow : untilReset;
      clearTimeout(timer);
      timer = setTimeout(refresh, next + 1_000);
    };
    refresh();
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);
  return due;
}

function AmountInput({
  accountId,
  date,
  amount,
  label,
  className = "",
}: {
  accountId: string;
  date: string;
  amount: number | undefined;
  label: string;
  className?: string;
}) {
  const commit = (input: HTMLInputElement) => {
    const raw = input.value.trim();
    const next = raw === "" ? 0 : Math.floor(Number(raw));
    if (!Number.isFinite(next) || next < 0) {
      input.value = amount === undefined ? "" : String(amount);
      return;
    }
    if (next !== (amount ?? 0)) void setDiaryEntry(accountId, date, next);
  };
  return (
    <Input
      // remount when the stored value changes (sync, calendar edit) so the
      // uncontrolled field never shows a stale number
      key={`${date}:${amount ?? ""}`}
      defaultValue={amount ?? ""}
      type="number"
      min={0}
      inputMode="numeric"
      placeholder="0"
      aria-label={label}
      className={`font-mono tabular-nums ${className}`}
      onBlur={(e) => commit(e.target)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          e.currentTarget.blur();
        }
      }}
    />
  );
}

/**
 * "Today's gold" entry point on the dailies page — the diary lives in the
 * Shop Planner, but the moment a player remembers the number is while they
 * tick off their dailies. One row per visible ID; from 21:00 (game time)
 * the card lights up until every ID has an entry.
 */
export function GoldTodayCard({
  accounts,
  diary,
  today,
  onOpenHistory,
}: {
  /** the IDs shown by the current layout — one in single view, all otherwise */
  accounts: GameAccountRecord[];
  diary: ReadonlyMap<string, GoldDiaryRecord[]>;
  /** current game date "YYYY-MM-DD" */
  today: string;
  onOpenHistory: () => void;
}) {
  const t = useT();
  const windowOpen = useReminderWindow();

  const amountOf = (accountId: string) =>
    diary.get(accountId)?.find((e) => e.date === today)?.amount;
  const missing = accounts.filter((a) => amountOf(a.id) === undefined);
  const due = windowOpen && missing.length > 0;
  const single = accounts.length === 1;

  return (
    <section
      aria-live="polite"
      className={`rounded-xl border bg-surface p-4 transition-colors ${
        due ? "border-gold/70 shadow-[0_0_0_3px_color-mix(in_oklch,var(--gold)_18%,transparent)]" : "border-line"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <GoldCoin />
        <h2 className="text-sm font-bold">{t("gold.today")}</h2>
        <span className="font-mono text-xs text-sub tabular-nums">{today}</span>
        <Button
          variant="outline"
          size="sm"
          className="ml-auto"
          onClick={onOpenHistory}
        >
          <CalendarDays className="size-3.5" />
          {t("gold.history")}
        </Button>
      </div>

      {due && (
        <p
          role="status"
          className="animate-rise-in mt-3 flex items-center gap-2 rounded-lg bg-gold/10 px-3 py-2 text-xs text-ink"
        >
          <BellRing className="size-3.5 shrink-0 text-gold" />
          <span className="min-w-0 flex-1">{t("gold.reminder")}</span>
        </p>
      )}

      <ul className={`mt-3 ${single ? "" : "divide-y divide-line/60"}`}>
        {accounts.map((account) => {
          const amount = amountOf(account.id);
          const logged = amount !== undefined;
          return (
            <li
              key={account.id}
              className={`flex items-center gap-3 ${single ? "" : "py-2"}`}
            >
              {!single && (
                <span className="min-w-0 flex-1 truncate text-sm">
                  {account.name}
                </span>
              )}
              <AmountInput
                accountId={account.id}
                date={today}
                amount={amount}
                label={t("gold.amountFor").replace("{name}", account.name)}
                className={`h-9 ${single ? "flex-1" : "w-36"}`}
              />
              <span
                className={`inline-flex shrink-0 items-center gap-1 text-xs ${
                  logged ? "text-gold" : "text-sub"
                }`}
              >
                {logged ? (
                  <>
                    <Check className="size-3.5" />
                    {t("gold.logged")}
                  </>
                ) : (
                  t("gold.notLogged")
                )}
              </span>
            </li>
          );
        })}
      </ul>
      {single && (
        <p className="mt-2 text-xs text-sub">{t("gold.todayHint")}</p>
      )}
    </section>
  );
}
