import { describe, expect, it } from "vitest";
import type {
  DailiesSnapshot,
  GoldShopSnapshot,
  MonsterLevelRecord,
} from "./local-db";
import { buildProgressExport, parseProgressExport } from "./progress-io";

const records: MonsterLevelRecord[] = [
  {
    monsterId: "poring",
    level: 7,
    source: "confirmed",
    updatedAt: "2026-08-09T00:00:00.000Z",
  },
  {
    monsterId: "lunatic",
    level: 0,
    source: "estimated",
    updatedAt: "2026-08-09T00:00:00.000Z",
  },
];

describe("progress export/import round trip", () => {
  it("parses its own export", () => {
    const doc = buildProgressExport(records, 1);
    const parsed = parseProgressExport(JSON.stringify(doc));
    expect(parsed.levels).toEqual(records);
    expect(parsed.dataVersion).toBe(1);
  });

  it.each([
    ["not JSON", "hello"],
    ["not an object", "[1,2]"],
    ["wrong app", JSON.stringify({ app: "other", kind: "progress", version: 1, levels: [] })],
    ["wrong version", JSON.stringify({ app: "rooc-kit", kind: "progress", version: 2, levels: [] })],
    ["missing levels", JSON.stringify({ app: "rooc-kit", kind: "progress", version: 1 })],
    [
      "level out of range",
      JSON.stringify({
        app: "rooc-kit",
        kind: "progress",
        version: 1,
        levels: [{ monsterId: "x", level: 11, source: "confirmed", updatedAt: "t" }],
      }),
    ],
    [
      "bad source",
      JSON.stringify({
        app: "rooc-kit",
        kind: "progress",
        version: 1,
        levels: [{ monsterId: "x", level: 1, source: "guessed", updatedAt: "t" }],
      }),
    ],
  ])("rejects %s", (_name, text) => {
    expect(() => parseProgressExport(text)).toThrow();
  });
});

const dailies: DailiesSnapshot = {
  accounts: [
    { id: "acc-1", name: "Main", sortOrder: 0, createdAt: "2026-08-12T00:00:00.000Z" },
  ],
  tasks: [
    {
      id: "task-1",
      name: "Board quests",
      cadence: "daily",
      sortOrder: 0,
      linkedWeeklyId: "task-2",
      createdAt: "2026-08-12T00:00:00.000Z",
      updatedAt: "2026-08-12T00:00:00.000Z",
    },
    {
      id: "task-2",
      name: "Guild dungeon",
      cadence: "weekly",
      sortOrder: 1,
      templateId: "tpl-1",
      targetCount: 2,
      createdAt: "2026-08-12T00:00:00.000Z",
      updatedAt: "2026-08-12T00:00:00.000Z",
    },
  ],
  completions: [
    {
      accountId: "acc-1",
      taskId: "task-1",
      periodKey: "d:2026-08-12",
      completedAt: "2026-08-12T01:00:00.000Z",
    },
    {
      accountId: "acc-1",
      taskId: "task-2",
      periodKey: "w:2026-08-10",
      count: 2,
      completedAt: "2026-08-12T01:00:00.000Z",
    },
  ],
};

describe("dailies in sync payload", () => {
  it("round-trips when provided (cloud-sync path)", () => {
    const doc = buildProgressExport(records, 1, dailies);
    const parsed = parseProgressExport(JSON.stringify(doc));
    expect(parsed.dailies).toEqual(dailies);
  });

  it("omits the field when not provided (file-export path)", () => {
    const doc = buildProgressExport(records, 1);
    expect("dailies" in doc).toBe(false);
    const parsed = parseProgressExport(JSON.stringify(doc));
    expect(parsed.dailies).toBeUndefined();
  });

  it("legacy payload without dailies still parses", () => {
    const parsed = parseProgressExport(
      JSON.stringify({ app: "rooc-kit", kind: "progress", version: 1, levels: [] }),
    );
    expect(parsed.dailies).toBeUndefined();
  });

  it.each([
    ["dailies not an object", { dailies: 5 }],
    ["missing arrays", { dailies: { accounts: [] } }],
    [
      "bad cadence",
      { dailies: { ...dailies, tasks: [{ ...dailies.tasks[0], cadence: "monthly" }] } },
    ],
    [
      "bad periodKey",
      {
        dailies: {
          ...dailies,
          completions: [{ ...dailies.completions[0], periodKey: "2026-08-12" }],
        },
      },
    ],
  ])("rejects %s", (_name, extra) => {
    const doc = { app: "rooc-kit", kind: "progress", version: 1, levels: [], ...extra };
    expect(() => parseProgressExport(JSON.stringify(doc))).toThrow(
      "invalid dailies payload",
    );
  });
});

const goldShop: GoldShopSnapshot = {
  categories: [
    {
      id: "cat-1",
      name: "Growth",
      sortOrder: 0,
      createdAt: "2026-08-12T00:00:00.000Z",
      updatedAt: "2026-08-12T00:00:00.000Z",
    },
  ],
  items: [
    {
      id: "item-1",
      name: "Oridecon",
      categoryId: "cat-1",
      stock: 5,
      price: 100,
      sortOrder: 0,
      templateId: "tpl-1",
      createdAt: "2026-08-12T00:00:00.000Z",
      updatedAt: "2026-08-12T00:00:00.000Z",
    },
    {
      id: "item-2",
      name: "Butterfly Wing",
      categoryId: "cat-1",
      price: 50,
      sortOrder: 1,
      createdAt: "2026-08-12T00:00:00.000Z",
      updatedAt: "2026-08-12T00:00:00.000Z",
    },
  ],
  plans: [
    {
      accountId: "acc-1",
      itemId: "item-1",
      periodKey: "w:2026-08-10",
      quantity: 3,
      updatedAt: "2026-08-12T01:00:00.000Z",
    },
  ],
  incomes: [
    {
      accountId: "acc-1",
      amount: 500,
      per: "day",
      updatedAt: "2026-08-12T01:00:00.000Z",
    },
  ],
  diary: [
    {
      accountId: "acc-1",
      date: "2026-08-12",
      amount: 450,
      updatedAt: "2026-08-12T01:00:00.000Z",
    },
  ],
};

describe("goldShop in sync payload", () => {
  it("round-trips when provided (cloud-sync path)", () => {
    const doc = buildProgressExport(records, 1, dailies, goldShop);
    const parsed = parseProgressExport(JSON.stringify(doc));
    expect(parsed.goldShop).toEqual(goldShop);
    expect(parsed.dailies).toEqual(dailies);
  });

  it("omits the field when not provided (file-export path)", () => {
    const doc = buildProgressExport(records, 1);
    expect("goldShop" in doc).toBe(false);
    const parsed = parseProgressExport(JSON.stringify(doc));
    expect(parsed.goldShop).toBeUndefined();
  });

  it("legacy payload without goldShop still parses", () => {
    const parsed = parseProgressExport(
      JSON.stringify({ app: "rooc-kit", kind: "progress", version: 1, levels: [] }),
    );
    expect(parsed.goldShop).toBeUndefined();
  });

  it.each([
    ["goldShop not an object", { goldShop: 5 }],
    ["missing arrays", { goldShop: { categories: [] } }],
    [
      "zero stock",
      {
        goldShop: {
          ...goldShop,
          items: [{ ...goldShop.items[0], stock: 0 }],
        },
      },
    ],
    [
      "negative price",
      {
        goldShop: {
          ...goldShop,
          items: [{ ...goldShop.items[1], price: -1 }],
        },
      },
    ],
    [
      "daily periodKey on a buy plan",
      {
        goldShop: {
          ...goldShop,
          plans: [{ ...goldShop.plans[0], periodKey: "d:2026-08-12" }],
        },
      },
    ],
    [
      "zero quantity",
      {
        goldShop: {
          ...goldShop,
          plans: [{ ...goldShop.plans[0], quantity: 0 }],
        },
      },
    ],
    [
      "bad income unit",
      {
        goldShop: {
          ...goldShop,
          incomes: [{ ...goldShop.incomes[0], per: "month" }],
        },
      },
    ],
    [
      "diary date with time",
      {
        goldShop: {
          ...goldShop,
          diary: [{ ...goldShop.diary[0], date: "2026-08-12T10:00" }],
        },
      },
    ],
  ])("rejects %s", (_name, extra) => {
    const doc = { app: "rooc-kit", kind: "progress", version: 1, levels: [], ...extra };
    expect(() => parseProgressExport(JSON.stringify(doc))).toThrow(
      "invalid goldShop payload",
    );
  });
});
