import type {
  BuyPlanRecord,
  GoldDiaryRecord,
  GoldIncomeRecord,
  ShopItemRecord,
} from "@/lib/local-db";
import { MAX_PLAN_QTY } from "@/lib/local-db";

/**
 * Pure arithmetic for the Shop Planner — totals, income normalization, and
 * the gold-diary week grouping. Everything here takes plain records so it is
 * unit-testable without Dexie.
 */

/** Map of itemId → planned quantity for one (account, week). */
export type PlanMap = ReadonlyMap<string, number>;

export function toPlanMap(plans: BuyPlanRecord[]): Map<string, number> {
  return new Map(plans.map((p) => [p.itemId, p.quantity]));
}

/** Total gold needed for the planned quantities. */
export function planTotal(items: ShopItemRecord[], plan: PlanMap): number {
  return items.reduce(
    (sum, item) => sum + item.price * (plan.get(item.id) ?? 0),
    0,
  );
}

/** Clamp a requested quantity to [0, stock] (Unlimited caps at MAX_PLAN_QTY). */
export function clampQuantity(
  item: Pick<ShopItemRecord, "stock">,
  quantity: number,
): number {
  const cap = item.stock ?? MAX_PLAN_QTY;
  return Math.max(0, Math.min(Math.floor(quantity), cap));
}

/** Normalize the income estimate to gold per week. */
export function weeklyIncomeOf(income: GoldIncomeRecord): number {
  return income.per === "day" ? income.amount * 7 : income.amount;
}

/** Positive = surplus, negative = shortfall. */
export function balance(total: number, weeklyIncome: number): number {
  return weeklyIncome - total;
}

const DAY = 86_400_000;

function dayIndexOf(gameDate: string): number {
  return Math.floor(Date.parse(`${gameDate}T00:00:00Z`) / DAY);
}

function isoDate(index: number): string {
  return new Date(index * DAY).toISOString().slice(0, 10);
}

/**
 * Monday of the game week containing this game date. Same epoch-day formula
 * as period.ts (epoch day 4, 1970-01-05, is a Monday) — the input is already
 * a game date, so no timezone shifting is needed here.
 */
export function mondayOf(gameDate: string): string {
  const d = dayIndexOf(gameDate);
  return isoDate(d - ((((d + 3) % 7) + 7) % 7));
}

/**
 * The weekly period key one week before this one — the plan offered up for
 * "repeat last week". Same `w:YYYY-MM-DD` shape as period.ts produces.
 */
export function previousWeeklyKey(weeklyKey: string): string {
  const monday = weeklyKey.slice(2);
  return `w:${isoDate(dayIndexOf(monday) - 7)}`;
}

export interface DiaryWeek {
  /** Monday game date "YYYY-MM-DD" */
  weekStart: string;
  total: number;
  /** days that actually have an entry — the average denominator */
  days: number;
  /** total / days — skipped days don't drag the average down */
  avgPerLoggedDay: number;
}

/** Group diary entries into weeks, newest first. */
export function diaryWeeks(entries: GoldDiaryRecord[]): DiaryWeek[] {
  const byWeek = new Map<string, { total: number; days: number }>();
  for (const entry of entries) {
    const weekStart = mondayOf(entry.date);
    const week = byWeek.get(weekStart) ?? { total: 0, days: 0 };
    week.total += entry.amount;
    week.days += 1;
    byWeek.set(weekStart, week);
  }
  return [...byWeek.entries()]
    .map(([weekStart, { total, days }]) => ({
      weekStart,
      total,
      days,
      avgPerLoggedDay: total / days,
    }))
    .sort((a, b) => (a.weekStart < b.weekStart ? 1 : -1));
}

/**
 * Average gold per logged day over the most recent N diary weeks — the
 * "use my diary average as the income estimate" shortcut. Undefined when
 * there is nothing logged.
 */
export function diaryAvgPerDay(
  entries: GoldDiaryRecord[],
  lastNWeeks = 4,
): number | undefined {
  const weeks = diaryWeeks(entries).slice(0, lastNWeeks);
  const days = weeks.reduce((sum, w) => sum + w.days, 0);
  if (days === 0) return undefined;
  const total = weeks.reduce((sum, w) => sum + w.total, 0);
  return total / days;
}
