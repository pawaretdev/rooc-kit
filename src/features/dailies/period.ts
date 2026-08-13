/**
 * Period keys for the Dailies checklist. A completion only counts while its
 * periodKey matches the current one, so "reset" needs no timers or cron —
 * stale rows simply stop matching.
 *
 * Game reset: daily 05:00 Asia/Bangkok, weekly Monday 05:00 Asia/Bangkok.
 * Bangkok is fixed UTC+7 with no DST, so this is pure epoch arithmetic.
 */

export type Cadence = "daily" | "weekly";

const HOUR = 3_600_000;
const DAY = 86_400_000;
/** Shift into Bangkok wall clock (+7h), then back by the 05:00 reset offset. */
const SHIFT = 7 * HOUR - 5 * HOUR;

function dayIndex(nowMs: number): number {
  return Math.floor((nowMs + SHIFT) / DAY);
}

function isoDate(index: number): string {
  return new Date(index * DAY).toISOString().slice(0, 10);
}

/** e.g. "d:2026-08-12" (daily) or "w:2026-08-10" (Monday of the game week). */
export function currentPeriodKey(cadence: Cadence, nowMs = Date.now()): string {
  const d = dayIndex(nowMs);
  if (cadence === "daily") return `d:${isoDate(d)}`;
  // Epoch day 4 (1970-01-05) is a Monday; floor to the most recent Monday.
  const monday = d - ((((d + 3) % 7) + 7) % 7);
  return `w:${isoDate(monday)}`;
}

export const PERIOD_KEY_PATTERN = /^[dw]:\d{4}-\d{2}-\d{2}$/;

/**
 * Event-window bounds are Bangkok wall clock, stored either as "YYYY-MM-DD"
 * (legacy, whole day) or "YYYY-MM-DDTHH:mm". Both normalize to the same
 * fixed-width, lexicographically comparable string.
 */
export const EVENT_BOUND_PATTERN = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/;

function eventBound(value: string, isEnd: boolean): string {
  return value.length <= 10
    ? `${value}T${isEnd ? "23:59" : "00:00"}`
    : value.slice(0, 16);
}

/** Current Bangkok wall clock as "YYYY-MM-DDTHH:mm". */
export function currentLocalDateTime(nowMs = Date.now()): string {
  return new Date(nowMs + 7 * HOUR).toISOString().slice(0, 16);
}

/**
 * Special-event window check. Tasks outside their window vanish from every
 * user-facing surface — the edit modal and the admin table still list them so
 * they can be cleaned up.
 */
export function isWithinEventWindow(
  range: { eventStart?: string | null; eventEnd?: string | null },
  nowLocal: string = currentLocalDateTime(),
): boolean {
  if (range.eventStart && nowLocal < eventBound(range.eventStart, false)) {
    return false;
  }
  if (range.eventEnd && nowLocal > eventBound(range.eventEnd, true)) {
    return false;
  }
  return true;
}

/** Epoch ms of an event bound (Bangkok is a fixed UTC+7 offset). */
function eventBoundMs(value: string, isEnd: boolean): number {
  return Date.parse(`${eventBound(value, isEnd)}:00+07:00`);
}

/**
 * True when the event closes before the next daily reset — i.e. this is the
 * player's last chance, which the UI flags with a small warning dot.
 */
export function isEventEndingSoon(
  eventEnd: string | null | undefined,
  nowMs = Date.now(),
): boolean {
  if (!eventEnd) return false;
  const endMs = eventBoundMs(eventEnd, true);
  if (Number.isNaN(endMs) || endMs < nowMs) return false;
  return endMs - nowMs <= msUntilReset("daily", nowMs);
}

/** Current game date ("YYYY-MM-DD") — the day part of the daily period. */
export function currentGameDate(nowMs = Date.now()): string {
  return isoDate(dayIndex(nowMs));
}

/** Milliseconds until the next reset of the given cadence. */
export function msUntilReset(cadence: Cadence, nowMs = Date.now()): number {
  const d = dayIndex(nowMs);
  if (cadence === "daily") return (d + 1) * DAY - SHIFT - nowMs;
  const monday = d - ((((d + 3) % 7) + 7) % 7);
  return (monday + 7) * DAY - SHIFT - nowMs;
}

export type ResetUrgency = "none" | "soon" | "critical";

const URGENCY_THRESHOLDS: Record<Cadence, { soon: number; critical: number }> = {
  daily: { soon: 6 * HOUR, critical: 2 * HOUR },
  weekly: { soon: 24 * HOUR, critical: 6 * HOUR },
};

/** Optional "urgency colors" feature: how close the next reset is. */
export function resetUrgency(cadence: Cadence, nowMs = Date.now()): ResetUrgency {
  const remaining = msUntilReset(cadence, nowMs);
  const { soon, critical } = URGENCY_THRESHOLDS[cadence];
  if (remaining <= critical) return "critical";
  if (remaining <= soon) return "soon";
  return "none";
}
