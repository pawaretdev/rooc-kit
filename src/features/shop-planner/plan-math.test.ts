import { describe, expect, it } from "vitest";

import type { GoldDiaryRecord, ShopItemRecord } from "@/lib/local-db";
import { MAX_PLAN_QTY } from "@/lib/local-db";
import {
  balance,
  clampQuantity,
  diaryAvgPerDay,
  diaryWeeks,
  mondayOf,
  planTotal,
  previousWeeklyKey,
  toPlanMap,
  weekDatesOf,
  weeklyIncomeOf,
} from "./plan-math";

function item(overrides: Partial<ShopItemRecord> = {}): ShopItemRecord {
  return {
    id: "item-1",
    name: "Oridecon",
    categoryId: "cat-1",
    price: 100,
    sortOrder: 0,
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
    ...overrides,
  };
}

function entry(date: string, amount: number): GoldDiaryRecord {
  return { accountId: "acc-1", date, amount, updatedAt: `${date}T12:00:00.000Z` };
}

describe("planTotal", () => {
  it("sums price × planned quantity per item", () => {
    const items = [
      item({ id: "a", price: 100 }),
      item({ id: "b", price: 250 }),
      item({ id: "c", price: 999 }),
    ];
    const plan = new Map([
      ["a", 3],
      ["b", 2],
    ]);
    expect(planTotal(items, plan)).toBe(300 + 500);
  });

  it("is 0 for an empty plan", () => {
    expect(planTotal([item()], new Map())).toBe(0);
  });

  it("ignores plan rows whose item no longer exists", () => {
    expect(planTotal([item({ id: "a", price: 10 })], new Map([["ghost", 5]]))).toBe(
      0,
    );
  });
});

describe("toPlanMap", () => {
  it("keys quantities by itemId", () => {
    const map = toPlanMap([
      {
        accountId: "acc",
        itemId: "a",
        periodKey: "w:2026-08-10",
        quantity: 2,
        updatedAt: "",
      },
    ]);
    expect(map.get("a")).toBe(2);
  });
});

describe("clampQuantity", () => {
  it("clamps to stock", () => {
    expect(clampQuantity({ stock: 5 }, 9)).toBe(5);
    expect(clampQuantity({ stock: 5 }, 5)).toBe(5);
    expect(clampQuantity({ stock: 5 }, 2)).toBe(2);
  });

  it("caps Unlimited items at MAX_PLAN_QTY", () => {
    expect(clampQuantity({}, MAX_PLAN_QTY + 100)).toBe(MAX_PLAN_QTY);
    expect(clampQuantity({}, 42)).toBe(42);
  });

  it("floors fractions and never goes below 0", () => {
    expect(clampQuantity({ stock: 5 }, 2.9)).toBe(2);
    expect(clampQuantity({ stock: 5 }, -3)).toBe(0);
  });
});

describe("weeklyIncomeOf / balance", () => {
  it("normalizes per-day income to a week", () => {
    expect(
      weeklyIncomeOf({ accountId: "a", amount: 100, per: "day", updatedAt: "" }),
    ).toBe(700);
    expect(
      weeklyIncomeOf({ accountId: "a", amount: 900, per: "week", updatedAt: "" }),
    ).toBe(900);
  });

  it("is positive on surplus and negative on shortfall", () => {
    expect(balance(500, 700)).toBe(200);
    expect(balance(900, 700)).toBe(-200);
    expect(balance(700, 700)).toBe(0);
  });
});

describe("mondayOf / weekDatesOf", () => {
  it("floors any weekday to that week's Monday", () => {
    // 2026-08-10 is a Monday.
    expect(mondayOf("2026-08-10")).toBe("2026-08-10");
    expect(mondayOf("2026-08-12")).toBe("2026-08-10");
    expect(mondayOf("2026-08-16")).toBe("2026-08-10"); // Sunday
    expect(mondayOf("2026-08-17")).toBe("2026-08-17"); // next Monday
  });

  it("handles year boundaries", () => {
    // 2026-01-01 is a Thursday; its week starts Monday 2025-12-29.
    expect(mondayOf("2026-01-01")).toBe("2025-12-29");
  });

  it("lists Mon..Sun of the containing week", () => {
    expect(weekDatesOf("2026-08-12")).toEqual([
      "2026-08-10",
      "2026-08-11",
      "2026-08-12",
      "2026-08-13",
      "2026-08-14",
      "2026-08-15",
      "2026-08-16",
    ]);
  });
});

describe("previousWeeklyKey", () => {
  it("steps back exactly one week", () => {
    expect(previousWeeklyKey("w:2026-08-10")).toBe("w:2026-08-03");
  });

  it("crosses a month boundary", () => {
    expect(previousWeeklyKey("w:2026-08-03")).toBe("w:2026-07-27");
  });

  it("crosses a year boundary", () => {
    expect(previousWeeklyKey("w:2026-01-05")).toBe("w:2025-12-29");
  });
});

describe("diaryWeeks", () => {
  it("groups entries by game week, newest first, averaging over logged days only", () => {
    const weeks = diaryWeeks([
      entry("2026-08-10", 100),
      entry("2026-08-11", 200),
      // gap: 12th not logged — must not drag the average down
      entry("2026-08-13", 300),
      entry("2026-08-04", 700), // previous week (Tue)
    ]);
    expect(weeks).toEqual([
      {
        weekStart: "2026-08-10",
        total: 600,
        days: 3,
        avgPerLoggedDay: 200,
      },
      {
        weekStart: "2026-08-03",
        total: 700,
        days: 1,
        avgPerLoggedDay: 700,
      },
    ]);
  });

  it("splits entries across the Sunday/Monday boundary", () => {
    const weeks = diaryWeeks([
      entry("2026-08-09", 50), // Sunday — belongs to the week of Aug 3
      entry("2026-08-10", 60), // Monday — new week
    ]);
    expect(weeks.map((w) => w.weekStart)).toEqual(["2026-08-10", "2026-08-03"]);
  });

  it("returns an empty list for an empty diary", () => {
    expect(diaryWeeks([])).toEqual([]);
  });
});

describe("diaryAvgPerDay", () => {
  it("averages over the most recent N weeks", () => {
    const entries = [
      entry("2026-08-10", 100),
      entry("2026-08-11", 300),
      entry("2026-08-03", 1_000_000), // older week, excluded at N=1
    ];
    expect(diaryAvgPerDay(entries, 1)).toBe(200);
    expect(diaryAvgPerDay(entries, 4)).toBe((100 + 300 + 1_000_000) / 3);
  });

  it("is undefined when nothing is logged", () => {
    expect(diaryAvgPerDay([])).toBeUndefined();
  });
});
