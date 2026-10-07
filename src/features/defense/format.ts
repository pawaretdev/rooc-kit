/** Number formatting for the DEF Planner — mono, fixed decimals, en grouping. */

const grouped = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

/** 2,864 / 23.5 — input echoes and stats */
export function formatStat(value: number): string {
  return grouped.format(value);
}

/** 0.4823 → "48.2%" */
export function formatPercent(fraction: number, digits = 1): string {
  return `${(fraction * 100).toFixed(digits)}%`;
}

/** 0.9525 → "×0.953" */
export function formatMultiplier(value: number): string {
  return `×${value.toFixed(3)}`;
}

/** signed rating/percent difference: "+500" / "−500" (true minus) / "0" */
export function formatSigned(value: number, suffix = ""): string {
  if (value === 0) return `0${suffix}`;
  const body = grouped.format(Math.abs(value));
  return `${value > 0 ? "+" : "−"}${body}${suffix}`;
}

/** Below this a change rounds to "about the same" (0.05%). */
export const SAME_THRESHOLD = 0.0005;
