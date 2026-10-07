import { describe, expect, it } from "vitest";
import {
  chartLayers,
  hasAnyValue,
  historyKey,
  liveSnapshots,
  mergeHistory,
  parseHistoryEntries,
  statValue,
  toughnessPoint,
  type DefenseHistoryEntry,
  type DefenseSnapshot,
  type DefenseTombstone,
} from "./history";
import { emptyBuild, emptyOpponent, FORMULA_VERSION, type DefenseBuild } from "./model";

function build(equipment: number | null = 2000): DefenseBuild {
  return {
    level: 99,
    pvpReduction: 1000,
    physical: { equipment, percent: 20, refine: 200, dmgReduction: 30 },
    magic: { equipment: 700, percent: 10, refine: 100, dmgReduction: 40 },
  };
}

function snap(id: string, updatedAt: string, extra: Partial<DefenseSnapshot> = {}): DefenseSnapshot {
  return {
    id,
    name: `Build ${id}`,
    build: build(),
    formulaVersion: FORMULA_VERSION,
    savedAt: updatedAt,
    updatedAt,
    ...extra,
  };
}

function tomb(id: string, at: string): DefenseTombstone {
  return { id, deletedAt: at, updatedAt: at };
}

const T1 = "2026-10-01T10:00:00.000Z";
const T2 = "2026-10-02T10:00:00.000Z";
const T3 = "2026-10-03T10:00:00.000Z";

describe("mergeHistory", () => {
  it("unions records from both sides — nothing saved elsewhere is lost", () => {
    const merged = mergeHistory([snap("a", T1)], [snap("b", T2)]);
    expect(merged.map((e) => e.id)).toEqual(["a", "b"]);
  });

  it("keeps the newer edit of the same record", () => {
    const older = snap("a", T1, { name: "old" });
    const newer = snap("a", T2, { name: "new" });
    expect((mergeHistory([older], [newer])[0] as DefenseSnapshot).name).toBe("new");
    expect((mergeHistory([newer], [older])[0] as DefenseSnapshot).name).toBe("new");
  });

  it("a later delete wins, an earlier one loses to a later edit", () => {
    expect(mergeHistory([snap("a", T1)], [tomb("a", T2)])[0]).toEqual(tomb("a", T2));
    expect(mergeHistory([tomb("a", T1)], [snap("a", T2)])[0]).toEqual(snap("a", T2));
  });

  it("a delete wins a timestamp tie", () => {
    expect(mergeHistory([snap("a", T1)], [tomb("a", T1)])[0]).toEqual(tomb("a", T1));
    expect(mergeHistory([tomb("a", T1)], [snap("a", T1)])[0]).toEqual(tomb("a", T1));
  });

  it("is commutative and idempotent", () => {
    const a: DefenseHistoryEntry[] = [snap("a", T1), tomb("b", T2), snap("c", T3)];
    const b: DefenseHistoryEntry[] = [snap("a", T2), snap("b", T1), snap("d", T1)];
    const ab = mergeHistory(a, b);
    expect(historyKey(ab)).toBe(historyKey(mergeHistory(b, a)));
    expect(historyKey(mergeHistory(ab, ab))).toBe(historyKey(ab));
  });
});

describe("liveSnapshots", () => {
  it("drops tombstones and sorts by savedAt", () => {
    const list = liveSnapshots([snap("b", T3), tomb("x", T2), snap("a", T1)]);
    expect(list.map((s) => s.id)).toEqual(["a", "b"]);
  });
});

describe("parseHistoryEntries", () => {
  it("accepts snapshots and tombstones", () => {
    const entries = [snap("a", T1), tomb("b", T2)];
    expect(parseHistoryEntries(JSON.parse(JSON.stringify(entries)))).toHaveLength(2);
  });

  it("rejects malformed or out-of-range data", () => {
    expect(() => parseHistoryEntries({})).toThrow();
    expect(() => parseHistoryEntries([{ ...snap("a", T1), name: " " }])).toThrow();
    const bad = snap("a", T1);
    bad.build.physical.percent = -5;
    expect(() => parseHistoryEntries([bad])).toThrow();
    expect(() => parseHistoryEntries([{ ...snap("a", T1), savedAt: "yesterday" }])).toThrow();
    expect(() => parseHistoryEntries([snap("a", T1), snap("a", T2)])).toThrow("duplicate");
  });

  it("keeps null as null — blank fields survive a round trip", () => {
    const entry = snap("a", T1, { build: { ...build(), pvpReduction: null } });
    const parsed = parseHistoryEntries(JSON.parse(JSON.stringify([entry])));
    expect((parsed[0] as DefenseSnapshot).build.pvpReduction).toBeNull();
  });
});

describe("chart helpers", () => {
  it("statValue reads nested stats", () => {
    expect(statValue(build(), "physical.refine")).toBe(200);
    expect(statValue(build(), "pvpReduction")).toBe(1000);
  });

  it("hasAnyValue", () => {
    expect(hasAnyValue(emptyBuild())).toBe(false);
    expect(hasAnyValue({ ...emptyBuild(), level: 50 })).toBe(true);
  });

  it("chartLayers follows what the opponent has filled", () => {
    const opp = emptyOpponent();
    expect(chartLayers(opp, "physical")).toEqual([]);
    opp.physical = { flatIgnore: 0, ignorePercent: 0, dmgBonus: null };
    opp.pvpBonus = 500;
    expect(chartLayers(opp, "physical")).toEqual(["def", "pvp"]);
  });

  it("toughnessPoint gaps a snapshot that lacks a needed stat", () => {
    const opp = emptyOpponent();
    opp.physical = { flatIgnore: 0, ignorePercent: 0, dmgBonus: null };
    const layers = chartLayers(opp, "physical");
    expect(toughnessPoint(build(), opp, "physical", layers)).toBeCloseTo(
      495 / (2000 + 200 + 495),
      12,
    );
    expect(toughnessPoint(build(null), opp, "physical", layers)).toBeNull();
  });

  it("more DEF in a later snapshot plots lower (tougher)", () => {
    const opp = emptyOpponent();
    opp.physical = { flatIgnore: 300, ignorePercent: 20, dmgBonus: null };
    const layers = chartLayers(opp, "physical");
    const before = toughnessPoint(build(2000), opp, "physical", layers)!;
    const after = toughnessPoint(build(2600), opp, "physical", layers)!;
    expect(after).toBeLessThan(before);
  });
});
