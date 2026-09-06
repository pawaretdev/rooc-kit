import type { GoldDiaryRecord } from "@/lib/local-db";
import { msUntilReset } from "@/features/dailies/period";

/**
 * Pure helpers behind the gold calendar and the "log today's gold" reminder.
 * Dates are game dates ("YYYY-MM-DD", 05:00 Asia/Bangkok boundary) exactly as
 * the diary stores them; a month is "YYYY-MM". No Date-object math on local
 * time anywhere — the strings are already the game's calendar.
 */

const HOUR = 3_600_000;

/** "YYYY-MM" of a game date. */
export function monthOf(date: string): string {
  return date.slice(0, 7);
}

/** Month shifted by `delta` months ("2026-01" − 1 → "2025-12"). */
export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const index = y * 12 + (m - 1) + delta;
  const year = Math.floor(index / 12);
  const mon = (index % 12) + 1;
  return `${year}-${String(mon).padStart(2, "0")}`;
}

function daysInMonth(month: string): number {
  const [y, m] = month.split("-").map(Number);
  // day 0 of the next month = last day of this one (UTC, no DST surprises)
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** 0 = Monday … 6 = Sunday, matching the game week (weekly reset on Monday). */
function mondayIndex(date: string): number {
  const dow = new Date(`${date}T00:00:00Z`).getUTCDay(); // 0 = Sunday
  return (dow + 6) % 7;
}

/**
 * Calendar rows for a month, Monday-first, padded with null so every row has
 * seven cells — the shape a PnL-style calendar renders directly.
 */
export function monthGrid(month: string): (string | null)[][] {
  const total = daysInMonth(month);
  const cells: (string | null)[] = [];
  for (let i = 0; i < mondayIndex(`${month}-01`); i++) cells.push(null);
  for (let d = 1; d <= total; d++) {
    cells.push(`${month}-${String(d).padStart(2, "0")}`);
  }
  while (cells.length % 7 !== 0) cells.push(null);
  const rows: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
  return rows;
}

export interface MonthStats {
  total: number;
  /** days with an entry — the average denominator */
  days: number;
  avgPerLoggedDay: number;
  /** highest single day, null when nothing is logged */
  best: { date: string; amount: number } | null;
}

/** Totals for one month of one account's diary. */
export function monthStats(
  entries: readonly GoldDiaryRecord[],
  month: string,
): MonthStats {
  let total = 0;
  let days = 0;
  let best: MonthStats["best"] = null;
  for (const entry of entries) {
    if (monthOf(entry.date) !== month) continue;
    total += entry.amount;
    days += 1;
    if (!best || entry.amount > best.amount) {
      best = { date: entry.date, amount: entry.amount };
    }
  }
  return { total, days, avgPerLoggedDay: days ? total / days : 0, best };
}

/** Compact gold for a calendar cell: 1234 → "1.2K", 2_500_000 → "2.5M". */
export function formatGoldShort(amount: number): string {
  const abs = Math.abs(amount);
  const trim = (n: number) => n.toFixed(n < 10 ? 1 : 0).replace(/\.0$/, "");
  if (abs >= 1_000_000) return `${trim(amount / 1_000_000)}M`;
  if (abs >= 1_000) return `${trim(amount / 1_000)}K`;
  return String(Math.round(amount));
}

/**
 * The "log today's gold" nudge switches on this many hours before the daily
 * reset (05:00) — i.e. from 21:00 Bangkok, the last stretch of the evening
 * when a missed entry is still cheap to fix from memory.
 */
export const REMINDER_HOURS_BEFORE_RESET = 8;

export function isReminderWindow(nowMs = Date.now()): boolean {
  return msUntilReset("daily", nowMs) <= REMINDER_HOURS_BEFORE_RESET * HOUR;
}
