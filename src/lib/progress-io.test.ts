import { describe, expect, it } from "vitest";
import type { MonsterLevelRecord } from "./local-db";
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
