"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  setDiaryEntry,
  type GameAccountRecord,
  type GoldDiaryRecord,
} from "@/lib/local-db";
import { useLocale, useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  formatGoldShort,
  monthGrid,
  monthOf,
  monthStats,
  shiftMonth,
} from "./calendar-math";

const EMPTY: GoldDiaryRecord[] = [];
// 2024-01-01 is a Monday — the anchor for locale weekday labels
const WEEKDAY_ANCHOR = Date.UTC(2024, 0, 1);
const DAY = 86_400_000;

function localeTag(locale: string): string {
  // Thai defaults to the Buddhist calendar; the diary is Gregorian throughout
  return locale === "th" ? "th-TH-u-ca-gregory" : "en-US";
}

function StatTile({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-lg border border-line bg-surface-2/60 px-3 py-2">
      <p className="font-mono text-[10px] font-bold tracking-wider text-sub uppercase">
        {label}
      </p>
      <p className="font-mono text-sm font-bold text-gold tabular-nums">
        {value}
      </p>
      {sub && (
        <p className="font-mono text-[10px] text-sub tabular-nums">{sub}</p>
      )}
    </div>
  );
}

export interface GoldCalendarProps {
  accounts: GameAccountRecord[];
  initialAccountId: string | undefined;
  diary: ReadonlyMap<string, GoldDiaryRecord[]>;
  /** current game date "YYYY-MM-DD" */
  today: string;
  /** day whose edit row is open on mount — the inline page view opens on today */
  initialSelected?: string | null;
}

/**
 * PnL-calendar style month view of the gold diary — one cell per game day,
 * tinted gold by how the day compares with the month's best. Past days are
 * editable in place so a forgotten evening can be filled in later. Local
 * state only; mount it fresh (key it) when the context changes.
 */
export function GoldCalendar({
  accounts,
  initialAccountId,
  diary,
  today,
  initialSelected = null,
}: GoldCalendarProps) {
  const t = useT();
  const { locale } = useLocale();
  const tag = localeTag(locale);

  const currentMonth = monthOf(today);
  const [accountId, setAccountId] = useState(initialAccountId);
  const [month, setMonth] = useState(currentMonth);
  const [selected, setSelected] = useState<string | null>(initialSelected);
  // focus the edit field only after a tap — a preselected day on page load
  // must not yank the viewport down to the calendar
  const [focusEdit, setFocusEdit] = useState(false);

  const account = accounts.find((a) => a.id === accountId) ?? accounts[0];
  const entries = account ? (diary.get(account.id) ?? EMPTY) : EMPTY;
  const byDate = new Map(entries.map((e) => [e.date, e.amount]));
  const stats = monthStats(entries, month);
  const max = stats.best?.amount ?? 0;
  const grid = monthGrid(month);

  const [y, m] = month.split("-").map(Number);
  const monthLabel = new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString(tag, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  const weekdays = Array.from({ length: 7 }, (_, i) =>
    new Date(WEEKDAY_ANCHOR + i * DAY).toLocaleDateString(tag, {
      weekday: "short",
      timeZone: "UTC",
    }),
  );
  const dayLabel = (date: string) =>
    new Date(`${date}T00:00:00Z`).toLocaleDateString(tag, {
      weekday: "short",
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    });

  const selectedAmount = selected ? byDate.get(selected) : undefined;

  return (
    <>
      {accounts.length > 1 && (
        <span className="inline-flex max-w-full overflow-x-auto rounded-lg border border-line">
          {accounts.map((a) => (
            <button
              key={a.id}
              type="button"
              aria-pressed={a.id === account?.id}
              onClick={() => {
                setAccountId(a.id);
                setSelected(null);
              }}
              className={`press max-w-40 truncate px-3.5 py-1.5 text-sm ${
                a.id === account?.id
                  ? "bg-accent font-semibold text-accent-ink"
                  : "text-sub hover:text-ink"
              }`}
            >
              {a.name}
            </button>
          ))}
        </span>
      )}

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon-sm"
          aria-label={t("gold.prevMonth")}
          title={t("gold.prevMonth")}
          onClick={() => {
            setMonth((cur) => shiftMonth(cur, -1));
            setSelected(null);
          }}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <h3 className="min-w-0 flex-1 truncate text-center text-sm font-bold">
          {monthLabel}
        </h3>
        <Button
          variant="outline"
          size="icon-sm"
          aria-label={t("gold.nextMonth")}
          title={t("gold.nextMonth")}
          disabled={month >= currentMonth}
          onClick={() => {
            setMonth((cur) => shiftMonth(cur, 1));
            setSelected(null);
          }}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
      {month !== currentMonth && (
        <div className="-mt-2 text-center">
          <Button
            variant="link"
            size="xs"
            onClick={() => {
              setMonth(currentMonth);
              setSelected(null);
            }}
          >
            {t("gold.thisMonth")}
          </Button>
        </div>
      )}

      <div role="grid" className="space-y-1">
        <div role="row" className="grid grid-cols-7 gap-1">
          {weekdays.map((label) => (
            <span
              key={label}
              role="columnheader"
              className="text-center font-mono text-[10px] font-bold tracking-wider text-sub uppercase"
            >
              {label}
            </span>
          ))}
        </div>
        {grid.map((row, i) => (
          <div key={i} role="row" className="grid grid-cols-7 gap-1">
            {row.map((date, j) => {
              if (!date) return <span key={j} role="gridcell" aria-hidden />;
              const amount = byDate.get(date);
              const future = date > today;
              const isToday = date === today;
              const isSelected = date === selected;
              const tint = amount !== undefined && max > 0 ? amount / max : 0;
              return (
                <button
                  key={date}
                  type="button"
                  role="gridcell"
                  disabled={future}
                  aria-selected={isSelected}
                  aria-label={`${dayLabel(date)}${
                    amount !== undefined ? ` — ${amount.toLocaleString()}` : ""
                  }`}
                  onClick={() => {
                    setSelected(isSelected ? null : date);
                    setFocusEdit(!isSelected);
                  }}
                  style={
                    tint > 0
                      ? {
                          backgroundColor: `color-mix(in oklch, var(--gold) ${Math.round(
                            12 + tint * 55,
                          )}%, transparent)`,
                        }
                      : undefined
                  }
                  className={`press flex h-12 flex-col items-stretch rounded-lg border px-1 py-0.5 text-left disabled:opacity-40 sm:h-14 ${
                    isSelected
                      ? "border-accent"
                      : isToday
                        ? "border-accent/60"
                        : amount === undefined && !future
                          ? "border-dashed border-line"
                          : "border-line"
                  } ${amount === undefined ? "text-sub" : "text-ink"}`}
                >
                  <span
                    className={`font-mono text-[10px] tabular-nums ${
                      isToday ? "font-bold text-accent" : ""
                    }`}
                  >
                    {Number(date.slice(8))}
                  </span>
                  <span className="mt-auto truncate text-center font-mono text-[11px] font-bold tabular-nums sm:text-xs">
                    {amount !== undefined ? formatGoldShort(amount) : ""}
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {selected && account && (
        <label className="animate-rise-in flex items-center gap-3 rounded-lg border border-accent/40 bg-surface-2/60 px-3 py-2">
          <span className="min-w-0 flex-1 text-sm">
            {t("gold.editDay").replace("{date}", dayLabel(selected))}
            {selected === today && (
              <span className="ml-2 rounded-md bg-accent px-1.5 py-0.5 font-mono text-[10px] font-bold text-accent-ink">
                {t("gold.today.badge")}
              </span>
            )}
          </span>
          <Input
            key={`${selected}:${selectedAmount ?? ""}`}
            autoFocus={focusEdit}
            defaultValue={selectedAmount ?? ""}
            type="number"
            min={0}
            inputMode="numeric"
            placeholder="0"
            aria-label={t("gold.editDay").replace("{date}", selected)}
            className="h-9 w-36 font-mono tabular-nums"
            onBlur={(e) => {
              const raw = e.target.value.trim();
              const next = raw === "" ? 0 : Math.floor(Number(raw));
              if (!Number.isFinite(next) || next < 0) {
                e.target.value =
                  selectedAmount === undefined ? "" : String(selectedAmount);
                return;
              }
              if (next !== (selectedAmount ?? 0)) {
                void setDiaryEntry(account.id, selected, next);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                e.currentTarget.blur();
              }
            }}
          />
        </label>
      )}

      {stats.days === 0 ? (
        <p className="text-center text-sm text-sub">{t("gold.noEntries")}</p>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <StatTile
            label={t("gold.monthTotal")}
            value={stats.total.toLocaleString()}
          />
          <StatTile label={t("gold.daysLogged")} value={String(stats.days)} />
          <StatTile
            label={t("gold.avgPerDay")}
            value={Math.round(stats.avgPerLoggedDay).toLocaleString()}
          />
          {stats.best && (
            <StatTile
              label={t("gold.bestDay")}
              value={stats.best.amount.toLocaleString()}
              sub={dayLabel(stats.best.date)}
            />
          )}
        </div>
      )}
    </>
  );
}
