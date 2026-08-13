import { msUntilReset } from "./period";
import type { Cadence } from "@/lib/local-db";

/**
 * "Reset urgency colors" — pending tasks tint as their reset approaches.
 * Opt-in and fully user-tunable (hours + color per stage). Lives in the local
 * settings table only: it is a per-device display preference and is
 * deliberately NOT part of the progress snapshot synced to Postgres.
 */

export interface UrgencyStage {
  /** hours before reset at which this stage kicks in */
  hours: number;
  /** CSS color (hex from the color input) */
  color: string;
}

export interface UrgencyConfig {
  enabled: boolean;
  /** stages ordered widest → tightest window */
  daily: UrgencyStage[];
  weekly: UrgencyStage[];
}

export const URGENCY_STAGE_COUNT = 3;

/**
 * Three stages by default, on a yellow → orange → red ramp with the hues kept
 * far enough apart to tell the first two apart at a glance.
 */
const RAMP = ["#e8d24a", "#e8862d", "#e0524a"] as const;

export const DEFAULT_URGENCY: UrgencyConfig = {
  enabled: false,
  daily: [
    { hours: 12, color: RAMP[0] },
    { hours: 6, color: RAMP[1] },
    { hours: 2, color: RAMP[2] },
  ],
  weekly: [
    { hours: 48, color: RAMP[0] },
    { hours: 24, color: RAMP[1] },
    { hours: 6, color: RAMP[2] },
  ],
};

export const URGENCY_KEY = "dailies.urgency";
const MAX_HOURS = 336; // two weeks — beyond any reset window

function stage(raw: unknown, fallback: UrgencyStage): UrgencyStage {
  if (typeof raw !== "object" || raw === null) return fallback;
  const r = raw as Record<string, unknown>;
  const hours =
    typeof r.hours === "number" && Number.isFinite(r.hours)
      ? Math.max(0, Math.min(MAX_HOURS, r.hours))
      : fallback.hours;
  const color =
    typeof r.color === "string" && /^#[0-9a-fA-F]{6}$/.test(r.color)
      ? r.color
      : fallback.color;
  return { hours, color };
}

/** Fills in defaults for anything missing or malformed in stored settings. */
export function normalizeUrgency(raw: unknown): UrgencyConfig {
  if (typeof raw !== "object" || raw === null) return DEFAULT_URGENCY;
  const r = raw as Record<string, unknown>;
  const stages = (key: Cadence) => {
    const stored = r[key];
    const list = Array.isArray(stored) ? stored : [];
    return DEFAULT_URGENCY[key].map((fallback, i) =>
      stage(list[i], fallback),
    );
  };
  return {
    enabled: r.enabled === true,
    daily: stages("daily"),
    weekly: stages("weekly"),
  };
}

const HOUR = 3_600_000;

/**
 * Color for a pending task of this cadence, or undefined when the feature is
 * off or the reset is still farther away than every stage.
 */
export function urgencyColor(
  config: UrgencyConfig,
  cadence: Cadence,
  nowMs = Date.now(),
): string | undefined {
  if (!config.enabled) return undefined;
  const remaining = msUntilReset(cadence, nowMs);
  // Tightest matching stage wins, whatever order the user left them in.
  let best: UrgencyStage | undefined;
  for (const s of config[cadence]) {
    if (remaining <= s.hours * HOUR && (!best || s.hours < best.hours)) {
      best = s;
    }
  }
  return best?.color;
}
