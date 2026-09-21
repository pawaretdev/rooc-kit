import { describe, expect, it } from "vitest";
import {
  getMap,
  getMonster,
  mapIdsByCell,
  maps,
  monsterIdsByMapId,
  worldMapCellSize,
} from "@/lib/game-data";
import { MAX_MR_LEVEL, type MonsterLevelRecord } from "@/lib/local-db";
import { allPins, areaLabel, cellsOf, mapProgress } from "./mapGroups";

function levels(
  entries: readonly (readonly [string, number])[],
): Map<string, MonsterLevelRecord> {
  return new Map(
    entries.map(([monsterId, level]) => [
      monsterId,
      { monsterId, level, source: "confirmed", updatedAt: "2026-01-01" },
    ]),
  );
}
const NONE = levels([]);

describe("areaLabel", () => {
  it.each([
    ["Pyramid F2", "Pyramid"],
    ["Undersea Tunnel F4", "Undersea Tunnel"],
    ["Orc Cave", "Orc Cave"],
    ["Mt.Mjolnir", "Mt.Mjolnir"],
  ])("%s → %s", (input, expected) => {
    expect(areaLabel(input)).toBe(expected);
  });
});

describe("mapProgress", () => {
  const roster = monsterIdsByMapId.get("orc-cave")!;

  it("counts an untouched map as all remaining", () => {
    const p = mapProgress("orc-cave", NONE);
    expect(p.total).toBe(roster.length);
    expect(p.maxed).toBe(0);
    expect(p.levelsLeft).toBe(roster.length * MAX_MR_LEVEL);
  });

  it("counts a fully maxed map as nothing left", () => {
    const p = mapProgress(
      "orc-cave",
      levels(roster.map((id) => [id, MAX_MR_LEVEL] as const)),
    );
    expect(p.maxed).toBe(roster.length);
    expect(p.remaining).toBe(0);
    expect(p.levelsLeft).toBe(0);
  });

  it("never reports negative levels left for an over-max record", () => {
    const p = mapProgress("orc-cave", levels([[roster[0], MAX_MR_LEVEL + 5]]));
    expect(p.maxed).toBe(1);
    expect(p.levelsLeft).toBe((roster.length - 1) * MAX_MR_LEVEL);
  });
});

describe("allPins", () => {
  const pins = allPins(NONE);

  it("makes one pin per occupied cell, covering every map", () => {
    expect(pins).toHaveLength(mapIdsByCell.size);
    const listed = pins.flatMap((pin) => pin.maps.map((m) => m.id));
    expect(new Set(listed).size).toBe(maps.size);
  });

  it("puts a dungeon and the field above it on one pin", () => {
    // Orc Village and Orc Cave are the same square on the world map.
    const pin = pins.find((p) => p.maps.some((m) => m.id === "orc-cave"))!;
    expect(pin.maps.map((m) => m.id).sort()).toEqual(["orc-cave", "orc-village"]);
  });

  it("names a floor group after the area they share", () => {
    const pin = pins.find((p) => p.maps.some((m) => m.id === "payon-cave-f1"))!;
    expect(pin.maps).toHaveLength(3);
    expect(pin.label).toBe("Payon Cave");
  });

  it("lists the cell's own map before its interiors", () => {
    const pin = pins.find((p) => p.maps.some((m) => m.id === "catacomb"))!;
    expect(pin.maps[0].name).toBe("Glast Heim");
  });

  it("names a cell after the map that IS that cell, not whatever sorts first", () => {
    // Glast Heim holds eight interiors; "Catacomb" only led alphabetically
    const pin = pins.find((p) => p.maps.some((m) => m.id === "catacomb"))!;
    expect(pin.label).toBe("Glast Heim");
  });

  it("lists dungeon floors in numeric order", () => {
    const pin = pins.find((p) => p.maps.some((m) => m.id === "payon-cave-f1"))!;
    expect(pin.maps.map((m) => m.name)).toEqual([
      "Payon Cave F1",
      "Payon Cave F2",
      "Payon Cave F3",
    ]);
  });

  it("keeps each dungeon's floors together when two share a cell", () => {
    // Sphinx Crypt and Pyramid sit on the same square — sorting on floor number
    // alone would interleave them as F1, F1, F2, F2
    const pin = pins.find((p) => p.maps.some((m) => m.id === "pyramid-f1"))!;
    expect(pin.maps.map((m) => m.name)).toEqual([
      "Pyramid F1",
      "Pyramid F2",
      "Pyramid F3",
      "Sphinx Crypt",
      "Sphinx Crypt F2",
    ]);
  });

  it("names a mixed cell after the surface map, not the dungeon in it", () => {
    // Culvert sits inside Prontera West Gate — the pin is the place you walk to
    const pin = pins.find((p) => p.maps.some((m) => m.id === "culvert-f1"))!;
    expect(pin.maps.map((m) => m.id)).toContain("prontera-west-gate");
    expect(pin.label).toBe("Prontera West Gate");
    expect(pin.dungeonNames).toEqual(["Culvert"]);
    expect(pin.hasSurface).toBe(true);
  });

  it("groups a crowded cell into places, floors nested under them", () => {
    // Glast Heim holds nine maps — as one flat row of tabs that is unreadable,
    // so the panel picks a place first and only then a floor.
    const pin = pins.find((p) => p.maps.some((m) => m.id === "catacomb"))!;
    expect(pin.maps).toHaveLength(9);
    expect(pin.areas.map((a) => a.name)).toEqual([
      "Glast Heim",
      "Catacomb",
      "Glast Heim Castle",
      "Glast Heim Culvert",
      "Glast Heim Monastery",
      "Glast Heim Order",
      "Underground Prison",
    ]);
    const castle = pin.areas.find((a) => a.name === "Glast Heim Castle")!;
    expect(castle.maps.map((m) => m.name)).toEqual([
      "Glast Heim Castle F1",
      "Glast Heim Castle F2",
    ]);
  });

  it("gives a single-floor place exactly one map", () => {
    const pin = pins.find((p) => p.maps.some((m) => m.id === "orc-cave"))!;
    for (const area of pin.areas) expect(area.maps.length).toBeGreaterThan(0);
    expect(pin.areas.map((a) => a.name).sort()).toEqual([
      "Orc Cave",
      "Orc Village",
    ]);
  });

  it("gives every hidden dungeon its own floating label", () => {
    // Glast Heim hides six — one shared line said nothing about which is which
    const pin = pins.find((p) => p.maps.some((m) => m.id === "catacomb"))!;
    expect(pin.callouts.map((c) => c.name).sort()).toEqual(
      [...pin.dungeonNames].sort(),
    );
    expect(pin.callouts.length).toBeGreaterThan(1);
  });

  it("floats every label over terrain that holds no maps", () => {
    const cellSize = worldMapCellSize;
    const occupied = new Set(
      pins.map(
        (p) =>
          `${Math.round(p.anchor.x / cellSize)},${Math.round(p.anchor.y / cellSize)}`,
      ),
    );
    for (const pin of pins) {
      const gx = Math.round(pin.anchor.x / cellSize);
      const gy = Math.round(pin.anchor.y / cellSize);
      for (const callout of pin.callouts) {
        expect(
          occupied.has(`${gx + callout.dx},${gy + callout.dy}`),
          `${callout.name} floats onto a used cell`,
        ).toBe(false);
      }
    }
  });

  it("fans one cell's labels around it without crossing leader lines", () => {
    // Glast Heim hides six: if they all reach the same way the lines cross
    const pin = pins.find((p) => p.maps.some((m) => m.id === "catacomb"))!;
    const angles = pin.callouts.map((c) => Math.atan2(c.dy, c.dx));

    // two labels sharing a direction is what produced the tangle
    const seen = new Set(angles.map((a) => Math.round(a * 8)));
    expect(seen.size).toBe(pin.callouts.length);

    // and no two of this cell's lines may intersect
    const segments = pin.callouts.map((c) => ({ x: c.dx, y: c.dy }));
    for (let i = 0; i < segments.length; i += 1) {
      for (let j = i + 1; j < segments.length; j += 1) {
        // both start at the cell centre, so they can only cross if collinear
        // and pointing the same way — the angle check above already excludes it
        const cross = segments[i].x * segments[j].y - segments[i].y * segments[j].x;
        const sameRay =
          cross === 0 &&
          segments[i].x * segments[j].x + segments[i].y * segments[j].y > 0;
        expect(sameRay).toBe(false);
      }
    }
  });

  it("never floats two labels onto the same square", () => {
    const cellSize = worldMapCellSize;
    const spots = pins.flatMap((pin) => {
      const gx = Math.round(pin.anchor.x / cellSize);
      const gy = Math.round(pin.anchor.y / cellSize);
      return pin.callouts.map((c) => `${gx + c.dx},${gy + c.dy}`);
    });
    expect(new Set(spots).size).toBe(spots.length);
  });

  it("names the dungeons hidden in a cell, without floor markers", () => {
    // the reveal toggle draws these as callouts, like the game's own map
    const pin = pins.find((p) => p.maps.some((m) => m.id === "pyramid-f1"))!;
    expect(pin.dungeonNames).toEqual(["Pyramid", "Sphinx Crypt"]);
    expect(pin.hasSurface).toBe(false);

    const poring = pins.find((p) => p.maps.some((m) => m.id === "poring-island"))!;
    expect(poring.dungeonNames).toEqual([]);
  });

  it("keeps a real name when a cell mixes unrelated places", () => {
    const pin = pins.find((p) => p.maps.some((m) => m.id === "orc-cave"))!;
    // "Orc Cave" and "Orc Village" share no area name, so no invented label
    expect(["Orc Cave", "Orc Village"]).toContain(pin.label);
  });

  it("counts a monster spawning on several floors once", () => {
    const pin = pins.find((p) => p.maps.some((m) => m.id === "pyramid-f1"))!;
    const union = new Set(
      pin.maps.flatMap((m) => monsterIdsByMapId.get(m.id) ?? []),
    );
    expect(pin.progress.total).toBe(union.size);
    expect(
      pin.progress.monsterIds.filter((id) => id === "drainliar"),
    ).toHaveLength(1);
  });

  it("marks a cell complete only when every monster in it is maxed", () => {
    const pin = pins.find((p) => p.maps.some((m) => m.id === "orc-cave"))!;
    const maxedAll = allPins(
      levels(pin.progress.monsterIds.map((id) => [id, MAX_MR_LEVEL] as const)),
    ).find((p) => p.id === pin.id)!;
    expect(maxedAll.progress.remaining).toBe(0);
    expect(maxedAll.progress.levelsLeft).toBe(0);
  });
});

describe("cellsOf", () => {
  it("collapses a monster's maps to the cells they occupy", () => {
    const drain = getMonster("drainliar");
    const cells = cellsOf(drain.mapIds);
    // Pyramid F1 and F2 share a cell, so there are fewer cells than maps
    expect(cells.size).toBeLessThan(drain.mapIds.length);
    for (const mapId of drain.mapIds) {
      expect(cells).toContain(getMap(mapId).anchor!.cell);
    }
  });
});
