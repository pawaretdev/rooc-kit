import { describe, expect, it } from "vitest";
import type { GoldDiaryRecord } from "@/lib/local-db";
import {
  formatGoldShort,
  isReminderWindow,
  monthGrid,
  monthOf,
  monthStats,
  shiftMonth,
} from "./calendar-math";

function entry(date: string, amount: number): GoldDiaryRecord {
  return { accountId: "a", date, amount, updatedAt: "2026-01-01" };
}

describe("shiftMonth", () => {
  it("moves across year boundaries in both directions", () => {
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2026-03", -15)).toBe("2024-12");
    expect(shiftMonth("2026-03", 0)).toBe("2026-03");
  });
});

describe("monthGrid", () => {
  it("is Monday-first, seven cells per row, padded with null", () => {
    // 2026-09-01 is a Tuesday → one leading null
    const grid = monthGrid("2026-09");
    expect(grid[0]).toEqual([
      null,
      "2026-09-01",
      "2026-09-02",
      "2026-09-03",
      "2026-09-04",
      "2026-09-05",
      "2026-09-06",
    ]);
    expect(grid.every((row) => row.length === 7)).toBe(true);
    const days = grid.flat().filter(Boolean);
    expect(days).toHaveLength(30);
    expect(days[29]).toBe("2026-09-30");
  });

  it("handles a month starting on Monday and a leap February", () => {
    // 2026-06-01 is a Monday → no leading padding
    expect(monthGrid("2026-06")[0][0]).toBe("2026-06-01");
    expect(monthGrid("2024-02").flat().filter(Boolean)).toHaveLength(29);
  });
});

describe("monthStats", () => {
  it("sums only that month and tracks the best day", () => {
    const stats = monthStats(
      [
        entry("2026-09-01", 100),
        entry("2026-09-03", 400),
        entry("2026-08-31", 9_999),
      ],
      "2026-09",
    );
    expect(stats.total).toBe(500);
    expect(stats.days).toBe(2);
    expect(stats.avgPerLoggedDay).toBe(250);
    expect(stats.best).toEqual({ date: "2026-09-03", amount: 400 });
  });

  it("is all zeros with no best day for an empty month", () => {
    expect(monthStats([], "2026-09")).toEqual({
      total: 0,
      days: 0,
      avgPerLoggedDay: 0,
      best: null,
    });
  });
});

describe("formatGoldShort", () => {
  it("abbreviates thousands and millions, trimming a trailing .0", () => {
    expect(formatGoldShort(950)).toBe("950");
    expect(formatGoldShort(1_234)).toBe("1.2K");
    expect(formatGoldShort(12_345)).toBe("12K");
    expect(formatGoldShort(2_000_000)).toBe("2M");
    expect(formatGoldShort(2_500_000)).toBe("2.5M");
  });
});

describe("isReminderWindow", () => {
  // Bangkok = UTC+7; daily reset 05:00 → window opens 21:00 Bangkok
  it("is off during the day and on from 21:00 until the reset", () => {
    expect(isReminderWindow(Date.UTC(2026, 8, 5, 13, 0))).toBe(false); // 20:00
    expect(isReminderWindow(Date.UTC(2026, 8, 5, 14, 0))).toBe(true); // 21:00
    expect(isReminderWindow(Date.UTC(2026, 8, 5, 17, 0))).toBe(true); // 00:00
    expect(isReminderWindow(Date.UTC(2026, 8, 5, 21, 30))).toBe(true); // 04:30
    expect(isReminderWindow(Date.UTC(2026, 8, 5, 22, 0))).toBe(false); // 05:00 next day
  });
});

describe("monthOf", () => {
  it("keeps the year-month of a game date", () => {
    expect(monthOf("2026-09-02")).toBe("2026-09");
  });
});
