import { describe, expect, it } from "vitest";
import {
  ELEMENTS,
  getMap,
  getMonster,
  maps,
  monsters,
  monsterIdsByMapId,
  rows,
  slugify,
} from "./game-data";

describe("slugify", () => {
  // Must stay in sync with scripts/validate-data.mjs — ids double as CDN filenames.
  it.each([
    ["Peco Peco Egg", "peco-peco-egg"],
    ["Payon Cave F2", "payon-cave-f2"],
    ["  Lunatic  ", "lunatic"],
    ["Baphomet Jr.", "baphomet-jr"],
  ])("%s → %s", (input, expected) => {
    expect(slugify(input)).toBe(expected);
  });
});

describe("game data integrity", () => {
  it("loads every element", () => {
    const seen = new Set(rows.map((r) => r.elementId));
    expect([...seen].sort()).toEqual([...ELEMENTS].sort());
  });

  it("row ids are unique and monsters resolve", () => {
    const rowIds = rows.map((r) => r.id);
    expect(new Set(rowIds).size).toBe(rowIds.length);
    for (const row of rows) {
      for (const id of row.monsterIds) {
        expect(getMonster(id).rowId).toBe(row.id);
      }
    }
  });

  it("every monster's maps exist and back-reference the monster", () => {
    for (const monster of monsters.values()) {
      expect(monster.mapIds.length).toBeGreaterThan(0);
      for (const mapId of monster.mapIds) {
        expect(getMap(mapId)).toBeDefined();
        expect(monsterIdsByMapId.get(mapId)).toContain(monster.id);
      }
    }
  });

  it("derives floor areas from map names", () => {
    for (const map of maps.values()) {
      if (/\sF\d+$/.test(map.name)) {
        expect(map.area).toBe(map.name.replace(/\s+F\d+$/, ""));
      } else {
        expect(map.area).toBeUndefined();
      }
    }
  });
});
