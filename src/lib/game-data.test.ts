import { describe, expect, it } from "vitest";
import {
  ELEMENTS,
  getMap,
  getMonster,
  maps,
  monsters,
  monsterIdsByMapId,
  mapIdsByCell,
  rows,
  slugify,
  worldMapCellSize,
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

  it("anchors every spawn map on the world map", () => {
    // A map without an anchor silently disappears from the World Map view,
    // so this is a hard requirement, not a nicety.
    for (const map of maps.values()) {
      expect(map.anchor, `${map.name} has no world-map anchor`).toBeDefined();
    }
  });

  it("keeps anchors inside the image as 0..1 fractions", () => {
    for (const map of maps.values()) {
      const a = map.anchor!;
      expect(a.x).toBeGreaterThanOrEqual(0);
      expect(a.x).toBeLessThanOrEqual(1);
      expect(a.y).toBeGreaterThanOrEqual(0);
      expect(a.y).toBeLessThanOrEqual(1);
      expect(a.source).toMatch(/^(cell|cave:.+|area)$/);
      expect(a.cell).toMatch(/^\S+$/);
    }
  });

  it("groups every anchored map under its cell", () => {
    // Orc Village and Orc Cave are the same place on the world map — one pin
    // has to open both, so the cell index must list them together.
    const orc = mapIdsByCell.get(getMap("orc-cave").anchor!.cell);
    expect(orc).toContain("orc-cave");
    expect(orc).toContain("orc-village");

    // and nothing is lost: every map appears in exactly one cell bucket
    const listed = [...mapIdsByCell.values()].flat();
    expect(new Set(listed).size).toBe(listed.length);
    expect(listed.length).toBe(maps.size);
  });

  it("exposes a sane world-map cell size", () => {
    expect(worldMapCellSize).toBeGreaterThan(0);
    expect(worldMapCellSize).toBeLessThan(0.2);
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
