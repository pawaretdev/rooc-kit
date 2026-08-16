import { describe, expect, it } from "vitest";
import { getMonster, rows } from "@/lib/game-data";
import type { MonsterLevelRecord } from "@/lib/local-db";
import { buildRowView, buildRowViews, levelOf, ROW_SIZE } from "./rowStats";

function record(
  monsterId: string,
  level: number,
  source: MonsterLevelRecord["source"] = "confirmed",
): [string, MonsterLevelRecord] {
  return [monsterId, { monsterId, level, source, updatedAt: "2026-01-01" }];
}

// a full row — rows below ROW_SIZE have no row level and are tested separately
const someRow = rows.find((r) => r.monsterIds.length >= ROW_SIZE)!;
const [m1, m2, m3] = someRow.monsterIds;

describe("buildRowView", () => {
  it("defaults unknown monsters to level 0", () => {
    const view = buildRowView(someRow, new Map());
    expect(view.rowLevel).toBe(0);
    expect(view.blockerIds).toEqual(someRow.monsterIds);
  });

  it("row level is the minimum monster level; blockers sit at that minimum", () => {
    const levels = new Map([record(m1, 4), record(m2, 7), record(m3, 4)]);
    const view = buildRowView(someRow, levels);
    // monsters without a record are still level 0, so they are the blockers
    const unset = someRow.monsterIds.filter((id) => !levels.has(id));
    if (unset.length > 0) {
      expect(view.rowLevel).toBe(0);
      expect(view.blockerIds).toEqual(unset);
    } else {
      expect(view.rowLevel).toBe(4);
      expect(view.blockerIds).toEqual([m1, m3]);
    }
  });

});

describe("row stat derivations", () => {
  it("maxSameMapBlockers is a valid set cover: 1..blockerCount, bestMap covers it", () => {
    const view = buildRowView(someRow, new Map());
    expect(view.blockerCount).toBe(someRow.monsterIds.length);
    expect(view.maxSameMapBlockers).toBeGreaterThanOrEqual(1);
    expect(view.maxSameMapBlockers).toBeLessThanOrEqual(view.blockerCount);
    expect(view.bestMapId).not.toBeNull();
  });

  it("completed rows (all level 10) report completed and sink in smart priority", () => {
    const levels = new Map(
      rows.flatMap((r) =>
        r.monsterIds.map((id) => record(id, r.id === someRow.id ? 10 : 3)),
      ),
    );
    expect(buildRowView(someRow, levels).completed).toBe(true);
    // level-less rows sink even deeper, so compare within rows that have a level
    const withLevel = buildRowViews(levels, { sort: "smartPriority" }).filter(
      (v) => v.hasRowLevel,
    );
    expect(withLevel[withLevel.length - 1].row.id).toBe(someRow.id);
  });

  it("smart priority: fewer blockers first, bigger same-map coverage breaks ties", () => {
    const views = buildRowViews(new Map(), { sort: "smartPriority" }).filter(
      (v) => v.hasRowLevel,
    );
    for (let i = 1; i < views.length; i++) {
      const prev = views[i - 1];
      const cur = views[i];
      expect(
        prev.blockerCount < cur.blockerCount ||
          (prev.blockerCount === cur.blockerCount &&
            prev.maxSameMapBlockers >= cur.maxSameMapBlockers),
      ).toBe(true);
    }
  });

  it("hide filter removes rows whose best map has an MVP; demote keeps them last", () => {
    const all = buildRowViews(new Map(), { sort: "rowLevelAsc" });
    const withMvp = all.filter((v) => v.hasMvp).length;
    if (withMvp === 0) return; // dataset without MVP maps — nothing to assert

    const hidden = buildRowViews(new Map(), {
      sort: "rowLevelAsc",
      noMvp: true,
      filterBehavior: "hide",
    });
    expect(hidden.length).toBe(all.length - withMvp);
    expect(hidden.every((v) => !v.hasMvp)).toBe(true);

    const demoted = buildRowViews(new Map(), {
      sort: "rowLevelAsc",
      noMvp: true,
      filterBehavior: "demote",
    });
    expect(demoted.length).toBe(all.length);
    const firstDemoted = demoted.findIndex((v) => v.demoted);
    expect(firstDemoted).toBe(demoted.length - withMvp);
    expect(demoted.slice(firstDemoted).every((v) => v.demoted)).toBe(true);
  });
});

describe("map exclusion", () => {
  const allRowMapIds = new Set(
    someRow.monsterIds.flatMap((id) => getMonster(id).mapIds),
  );

  it("bestMapId never points at an excluded map", () => {
    const before = buildRowView(someRow, new Map());
    const excluded = new Set([before.bestMapId!]);
    const after = buildRowView(someRow, new Map(), excluded);
    expect(after.bestMapId).not.toBe(before.bestMapId);
    expect(after.allMapsExcluded).toBe(after.bestMapId === null);
  });

  it("does not flag rows when nothing relevant is excluded", () => {
    const view = buildRowView(someRow, new Map(), new Set(["no-such-map"]));
    expect(view.allMapsExcluded).toBe(false);
    expect(view.bestMapId).not.toBeNull();
  });

  it("excluding every blocker map flags the row; hide removes it, demote sinks it", () => {
    const view = buildRowView(someRow, new Map(), allRowMapIds);
    expect(view.allMapsExcluded).toBe(true);
    expect(view.bestMapId).toBeNull();
    expect(view.maxSameMapBlockers).toBe(0);

    const hidden = buildRowViews(new Map(), {
      sort: "rowLevelAsc",
      excludedMapIds: allRowMapIds,
      filterBehavior: "hide",
    });
    expect(hidden.some((v) => v.row.id === someRow.id)).toBe(false);

    const demoted = buildRowViews(new Map(), {
      sort: "rowLevelAsc",
      excludedMapIds: allRowMapIds,
      filterBehavior: "demote",
    });
    const target = demoted.find((v) => v.row.id === someRow.id);
    expect(target?.demoted).toBe(true);
  });
});

describe("buildRowViews", () => {
  it("filters by element", () => {
    const element = rows[0].elementId;
    const views = buildRowViews(new Map(), { element, sort: "rowLevelAsc" });
    expect(views.length).toBeGreaterThan(0);
    expect(views.every((v) => v.row.elementId === element)).toBe(true);
  });

  it("sorts by row level in both directions", () => {
    const levels = new Map(
      rows.flatMap((r, i) => r.monsterIds.map((id) => record(id, i % 11))),
    );
    const asc = buildRowViews(levels, { sort: "rowLevelAsc" })
      .filter((v) => v.hasRowLevel)
      .map((v) => v.rowLevel);
    const desc = buildRowViews(levels, { sort: "rowLevelDesc" })
      .filter((v) => v.hasRowLevel)
      .map((v) => v.rowLevel);
    expect(asc).toEqual([...asc].sort((a, b) => a - b));
    expect(desc).toEqual([...desc].sort((a, b) => b - a));
  });

  it("rowOrder mirrors the game listing exactly — level-less rows stay in place", () => {
    const levels = new Map(
      rows.flatMap((r, i) => r.monsterIds.map((id) => record(id, i % 11))),
    );
    const views = buildRowViews(levels, { sort: "rowOrder" });
    expect(views.map((v) => v.row.id)).toEqual(rows.map((r) => r.id));
  });

  it("keeps canonical order for equal levels (stable sort), level-less rows last", () => {
    const views = buildRowViews(new Map(), { sort: "rowLevelAsc" });
    const expected = [
      ...rows.filter((r) => r.monsterIds.length >= ROW_SIZE),
      ...rows.filter((r) => r.monsterIds.length < ROW_SIZE),
    ].map((r) => r.id);
    expect(views.map((v) => v.row.id)).toEqual(expected);
  });
});

describe("rows with fewer than ROW_SIZE monsters", () => {
  const partial = rows.find((r) => r.monsterIds.length < ROW_SIZE);

  it("have no row level, blockers, best trip, or completed state", () => {
    if (!partial) return; // dataset currently has such rows; guard for future data
    const view = buildRowView(partial, new Map());
    expect(view.hasRowLevel).toBe(false);
    expect(view.blockerIds).toEqual([]);
    expect(view.maxSameMapBlockers).toBe(0);
    expect(view.bestMapId).toBeNull();
    // even fully maxed they never report completed — there is no level to finish
    const maxed = new Map(partial.monsterIds.map((id) => record(id, 10)));
    expect(buildRowView(partial, maxed).completed).toBe(false);
  });

  it("noIncomplete hides them; demote sinks them instead", () => {
    if (!partial) return;
    const all = buildRowViews(new Map(), { sort: "rowOrder" });
    const levelless = all.filter((v) => !v.hasRowLevel).length;

    const hidden = buildRowViews(new Map(), {
      sort: "rowOrder",
      noIncomplete: true,
      filterBehavior: "hide",
    });
    expect(hidden.length).toBe(all.length - levelless);
    expect(hidden.every((v) => v.hasRowLevel)).toBe(true);

    const demoted = buildRowViews(new Map(), {
      sort: "rowOrder",
      noIncomplete: true,
      filterBehavior: "demote",
    });
    expect(demoted.length).toBe(all.length);
    expect(demoted.slice(-levelless).every((v) => v.demoted)).toBe(true);
  });

  it("sink below every row that has a level, in all sorts", () => {
    if (!partial) return;
    for (const sort of ["rowLevelAsc", "smartPriority"] as const) {
      const views = buildRowViews(new Map(), { sort });
      const firstLevelless = views.findIndex((v) => !v.hasRowLevel);
      expect(firstLevelless).toBeGreaterThan(-1);
      expect(views.slice(firstLevelless).every((v) => !v.hasRowLevel)).toBe(
        true,
      );
    }
  });
});

describe("levelOf", () => {
  it("reads the record level and defaults to 0", () => {
    const levels = new Map([record(m1, 9)]);
    expect(levelOf(m1, levels)).toBe(9);
    expect(levelOf(m2, levels)).toBe(0);
  });
});
