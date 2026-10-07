import { describe, expect, it } from "vitest";
import bytecode from "./pvp-bytecode-cases.json";
import {
  applyProbe,
  compareEvaluations,
  defChangeRange,
  defMultiplier,
  effectiveIgnoreRate,
  emptyBuild,
  emptyOpponent,
  evaluateKind,
  fieldState,
  invalidFields,
  isBlank,
  mdmgRelative,
  pdmgMultiplier,
  pvpRatingMultiplier,
  pvpRatingShift,
  rawDef,
  withIgnore,
  type DefInputs,
  type DefenseBuild,
  type Opponent,
  type OkEvaluation,
} from "./model";

function sampleBuild(): DefenseBuild {
  return {
    level: 99,
    pvpReduction: 1200,
    physical: { equipment: 2864, percent: 23, refine: 300, dmgReduction: 40 },
    magic: { equipment: 824, percent: 16, refine: 120, dmgReduction: 55 },
  };
}

function sampleOpponent(): Opponent {
  return {
    pvpBonus: 700,
    physical: { flatIgnore: 500, ignorePercent: 20, dmgBonus: 60 },
    magic: { flatIgnore: 100, ignorePercent: 10, dmgBonus: 70 },
  };
}

function ok(e: ReturnType<typeof evaluateKind>): OkEvaluation {
  if (e.status !== "ok") throw new Error("expected ok evaluation");
  return e;
}

describe("F10 PvP rating", () => {
  it("matches all 150 cases dumped from the original client bytecode", () => {
    expect(bytecode.cases).toHaveLength(150);
    for (const c of bytecode.cases) {
      const got = c.base * pvpRatingMultiplier(c.bonus - c.reduction);
      expect(got).toBeCloseTo(c.result, 12);
    }
  });

  it("hits the seven tooltip breakpoints exactly", () => {
    const expected: [number, number][] = [
      [300, 0.04],
      [600, 0.06],
      [900, 0.08],
      [1200, 0.1],
      [1500, 0.12],
      [1800, 0.15],
      [2100, 0.18],
    ];
    for (const [x, shift] of expected) expect(pvpRatingShift(x)).toBeCloseTo(shift, 12);
  });

  it("keeps the client's slopes and the 20% cap — no linear interpolation", () => {
    expect(pvpRatingShift(500)).toBeCloseTo(0.0475, 12);
    expect(pvpRatingShift(1000)).toBeCloseTo(0.08225, 12);
    expect(pvpRatingShift(2000)).toBeCloseTo(0.1535, 12);
    expect(pvpRatingShift(2399)).toBeCloseTo(0.1822425, 12);
    expect(pvpRatingShift(2400)).toBe(0.2);
    expect(pvpRatingShift(4000)).toBe(0.2);
  });

  it("signs the multiplier by opponent bonus minus our reduction", () => {
    expect(pvpRatingMultiplier(0)).toBe(1);
    expect(pvpRatingMultiplier(-500)).toBeCloseTo(0.9525, 12);
    expect(pvpRatingMultiplier(500)).toBeCloseTo(1.0475, 12);
  });
});

describe("DEF layer (C01)", () => {
  const base: DefInputs = {
    level: 99,
    equipment: 360,
    percent: 0,
    refine: 0,
    flatIgnore: 0,
    ignorePercent: 0,
  };

  it("reproduces the spec example (Lv99, 360 DEF → 495/855)", () => {
    expect(defMultiplier(base)).toBeCloseTo(495 / 855, 12);
  });

  it("estimates Raw DEF from the shown equipment value", () => {
    expect(rawDef(2864, 23)).toBeCloseTo(2328.4552845, 6);
  });

  it("caps Ignore% at 40 for the effective rate", () => {
    expect(effectiveIgnoreRate(25)).toBe(0.25);
    expect(effectiveIgnoreRate(40)).toBe(0.4);
    expect(effectiveIgnoreRate(75)).toBe(0.4);
    expect(defMultiplier({ ...base, ignorePercent: 75 })).toBe(
      defMultiplier({ ...base, ignorePercent: 40 }),
    );
  });

  it("never lets less than 5% through", () => {
    expect(defMultiplier({ ...base, level: 1, equipment: 1_000_000 })).toBe(0.05);
  });

  it("subtracts flat ignore from Raw DEF, then restores DEF%", () => {
    const input = { ...base, equipment: 1230, percent: 23, flatIgnore: 100 };
    // raw 1000 → 900 after flat → ×1.23 = 1107
    const expected = 495 / (1107 + 495);
    expect(defMultiplier(input)).toBeCloseTo(expected, 12);
  });
});

describe("PDMG / MDMG", () => {
  it("uses 0.5 per point of difference with a ±25% sheet cap", () => {
    expect(pdmgMultiplier(40)).toEqual({ multiplier: 1.2, capped: false });
    expect(pdmgMultiplier(-40).multiplier).toBeCloseTo(0.8, 12);
    expect(pdmgMultiplier(60)).toEqual({ multiplier: 1.25, capped: true });
    expect(pdmgMultiplier(-80)).toEqual({ multiplier: 0.75, capped: true });
  });

  it("MDMG is relative to the 50.47 baseline and refuses factors ≤ 0", () => {
    expect(mdmgRelative(50.47)).toBeCloseTo(1, 12);
    expect(mdmgRelative(60.47)).toBeCloseTo(1.072, 12);
    expect(mdmgRelative(-100)).toBeNull();
  });
});

describe("evaluateKind", () => {
  it("never treats a blank field as 0", () => {
    const e = ok(evaluateKind(emptyBuild(), emptyOpponent(), "physical"));
    expect(e.total).toBeNull();
    expect(e.included).toEqual([]);
    expect(e.missing.def).toContain("build.level");
    expect(e.missing.pvp).toEqual(["build.pvpReduction", "opponent.pvpBonus"]);
  });

  it("works with DEF inputs only and names the layers left out", () => {
    const build = { ...emptyBuild(), level: 99 };
    build.physical = { equipment: 360, percent: 0, refine: 0, dmgReduction: null };
    const opponent = emptyOpponent();
    opponent.physical = { flatIgnore: 0, ignorePercent: 0, dmgBonus: null };
    const e = ok(evaluateKind(build, opponent, "physical"));
    expect(e.included).toEqual(["def"]);
    expect(e.total).toBeCloseTo(495 / 855, 12);
    expect(Object.keys(e.missing).sort()).toEqual(["dmg", "pvp"]);
  });

  it("blocks the result when a value is unreadable or out of range", () => {
    const build = sampleBuild();
    build.physical.equipment = Number.NaN;
    const e = evaluateKind(build, sampleOpponent(), "physical");
    expect(e.status).toBe("invalid");
    const inf = sampleBuild();
    inf.level = Number.POSITIVE_INFINITY;
    expect(evaluateKind(inf, sampleOpponent(), "magic").status).toBe("invalid");
    const opp = sampleOpponent();
    opp.physical.ignorePercent = 120;
    expect(evaluateKind(sampleBuild(), opp, "physical").status).toBe("invalid");
  });

  it("multiplies DEF × PvP × PDMG for physical", () => {
    const e = ok(evaluateKind(sampleBuild(), sampleOpponent(), "physical"));
    expect(e.included).toEqual(["def", "pvp", "dmg"]);
    expect(e.total).toBeCloseTo(
      e.def!.multiplier * e.pvp!.multiplier * e.dmg!.multiplier,
      12,
    );
    expect(e.pvp!.diff).toBe(-500);
    expect(e.dmg!.diff).toBe(20);
  });

  it("keeps MDMG out of the magic total", () => {
    const e = ok(evaluateKind(sampleBuild(), sampleOpponent(), "magic"));
    expect(e.included).toEqual(["def", "pvp"]);
    expect(e.mdmg?.diff).toBe(15);
    expect(e.total).toBeCloseTo(e.def!.multiplier * e.pvp!.multiplier, 12);
  });

  it("reports entered vs effective Ignore% when past the cap", () => {
    const opp = sampleOpponent();
    opp.physical.ignorePercent = 55;
    const e = ok(evaluateKind(sampleBuild(), opp, "physical"));
    expect(e.def!.ignore).toEqual({ entered: 55, effective: 40, capped: true });
  });

  it("the range covers the primary assumption", () => {
    const e = ok(evaluateKind(sampleBuild(), sampleOpponent(), "physical"));
    expect(e.def!.range.min).toBeLessThanOrEqual(e.def!.multiplier);
    expect(e.def!.range.max).toBeGreaterThanOrEqual(e.def!.multiplier);
  });
});

describe("comparisons", () => {
  it("equal builds compare to exactly 0", () => {
    const a = ok(evaluateKind(sampleBuild(), sampleOpponent(), "physical"));
    const b = ok(evaluateKind(sampleBuild(), sampleOpponent(), "physical"));
    expect(compareEvaluations(a, b)?.change).toBe(0);
  });

  it("more DEF reads as taking less damage", () => {
    const better = sampleBuild();
    better.physical.equipment = 3500;
    const cur = ok(evaluateKind(better, sampleOpponent(), "physical"));
    const base = ok(evaluateKind(sampleBuild(), sampleOpponent(), "physical"));
    expect(compareEvaluations(cur, base)!.change).toBeGreaterThan(0);
    expect(compareEvaluations(base, cur)!.change).toBeLessThan(0);
  });

  it("compares only the layers both sides have", () => {
    const partial = sampleBuild();
    partial.pvpReduction = null;
    const cur = ok(evaluateKind(partial, sampleOpponent(), "physical"));
    const base = ok(evaluateKind(sampleBuild(), sampleOpponent(), "physical"));
    expect(compareEvaluations(cur, base)?.layers).toEqual(["def", "dmg"]);
  });

  it("DEF change range is 0 for identical inputs under every assumption", () => {
    const input: DefInputs = {
      level: 99,
      equipment: 2000,
      percent: 30,
      refine: 300,
      flatIgnore: 500,
      ignorePercent: 20,
    };
    expect(defChangeRange(input, input)).toEqual({ min: 0, max: 0 });
  });
});

describe("helpers", () => {
  it("fieldState separates empty, invalid and ok", () => {
    expect(fieldState("level", null)).toBe("empty");
    expect(fieldState("level", 99.5)).toBe("invalid");
    expect(fieldState("level", 0)).toBe("invalid");
    expect(fieldState("percent", -1)).toBe("invalid");
    expect(fieldState("ignorePercent", 55)).toBe("ok");
  });

  it("withIgnore only touches the chosen damage type", () => {
    const opp = withIgnore(sampleOpponent(), "physical", 30);
    expect(opp.physical.ignorePercent).toBe(30);
    expect(opp.magic.ignorePercent).toBe(10);
  });

  it("applyProbe adds to the stat and skips blanks", () => {
    expect(applyProbe(sampleBuild(), "physical", "refine", 100)?.physical.refine).toBe(400);
    expect(applyProbe(emptyBuild(), "physical", "refine", 100)).toBeNull();
  });

  it("isBlank / invalidFields", () => {
    expect(isBlank(emptyBuild(), emptyOpponent())).toBe(true);
    expect(isBlank(sampleBuild(), emptyOpponent())).toBe(false);
    const build = sampleBuild();
    build.magic.refine = -5;
    expect(invalidFields(build, sampleOpponent())).toEqual(["build.magic.refine"]);
  });
});
