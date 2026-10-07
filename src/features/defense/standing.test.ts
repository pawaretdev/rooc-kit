import { describe, expect, it } from "vitest";
import { evaluateKind } from "./model";
import { blockedShare, evenOutWeakSpots, layerStanding } from "./standing";

describe("layerStanding", () => {
  it("reads DEF as damage cut on a 0–95% scale", () => {
    const s = layerStanding("def", 0.191);
    expect(s.effect).toBeCloseTo(0.809, 12);
    expect(s.position).toBeCloseTo(0.809 / 0.95, 12);
    expect(s.maxed).toBe(false);
    expect(layerStanding("def", 0.05).maxed).toBe(true);
    expect(layerStanding("def", 1).position).toBe(0);
  });

  it("puts an even PvP rating in the middle and the 20% cap at the ends", () => {
    expect(layerStanding("pvp", 1).position).toBe(0.5);
    expect(layerStanding("pvp", 0.8).position).toBeCloseTo(1, 12);
    expect(layerStanding("pvp", 0.8).maxed).toBe(true);
    expect(layerStanding("pvp", 1.2).position).toBeCloseTo(0, 12);
    expect(layerStanding("pvp", 0.96).effect).toBeCloseTo(0.04, 12);
  });

  it("marks the opponent's edge as a negative effect", () => {
    const s = layerStanding("dmg", 1.075);
    expect(s.effect).toBeCloseTo(-0.075, 12);
    expect(s.position).toBeCloseTo(0.35, 12);
    expect(layerStanding("dmg", 0.75).maxed).toBe(true);
  });

  it("blockedShare flips damage-through into damage cut", () => {
    expect(blockedShare(0.172)).toBeCloseTo(0.828, 12);
    expect(blockedShare(1.12)).toBeCloseTo(-0.12, 12);
  });
});

describe("evenOutWeakSpots", () => {
  const build = {
    level: 99,
    pvpReduction: 1000,
    physical: { equipment: 6000, percent: 30, refine: 400, dmgReduction: 40 },
    magic: { equipment: 2000, percent: 20, refine: 150, dmgReduction: 70 },
  };
  const opponent = {
    pvpBonus: 1400,
    physical: { flatIgnore: 800, ignorePercent: 30, dmgBonus: 60 },
    magic: { flatIgnore: 200, ignorePercent: 20, dmgBonus: 13 },
  };

  it("brings every losing layer to even and says what it takes", () => {
    const e = evaluateKind(build, opponent, "physical");
    if (e.status !== "ok") throw new Error("expected ok");
    const fix = evenOutWeakSpots(e)!;
    expect(fix.layers).toEqual(["pvp", "dmg"]);
    expect(fix.total).toBeCloseTo(e.def!.multiplier, 12);
    expect(fix.change).toBeCloseTo(1 - 1 / (e.pvp!.multiplier * e.dmg!.multiplier), 12);
    expect(fix.needs).toEqual({ pvp: 400, dmg: 20 });
  });

  it("returns null when nothing is losing", () => {
    const strong = { ...build, pvpReduction: 2000, physical: { ...build.physical, dmgReduction: 80 } };
    const e = evaluateKind(strong, opponent, "physical");
    if (e.status !== "ok") throw new Error("expected ok");
    expect(evenOutWeakSpots(e)).toBeNull();
  });
});
