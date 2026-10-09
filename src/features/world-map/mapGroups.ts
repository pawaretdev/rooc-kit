import {
  getMap,
  mapIdsByCell,
  monsterIdsByMapId,
  type GameMap,
  type MapAnchor,
} from "@/lib/game-data";
import { MAX_MR_LEVEL, type MonsterLevelRecord } from "@/lib/local-db";
import type { CaveArrowPosition } from "./caveLayout";
import cavePositions from "./cave-label-positions.json";
import { levelOf } from "../monster-research/rowStats";

/** Research progress for one map's roster. */
export interface MapProgress {
  /** monster ids spawning here, in data order */
  monsterIds: string[];
  total: number;
  /** monsters already at MAX_MR_LEVEL */
  maxed: number;
  /** monsters still short of max */
  remaining: number;
  /** levels still to gain before the whole map is maxed */
  levelsLeft: number;
  /** every monster here is maxed — nothing left to farm, so no reason to go */
  complete: boolean;
}

/**
 * One clickable square on the world map — a prefab cell.
 *
 * Several tracker maps can share a cell: dungeon floors (Pyramid F1/F2/F3), a
 * dungeon and the field above it (Orc Village + Orc Cave), or sub-areas of one
 * place (the eight Glast Heim interiors). They all open from the same pin and
 * split into tabs in the panel, so nothing is stacked out of reach.
 */
export interface MapPin {
  /** prefab cell id — stable and unique per square */
  id: string;
  anchor: MapAnchor;
  /** what to write under the pin */
  label: string;
  /** every map in this cell — surface first, then floors in numeric order */
  maps: GameMap[];
  /**
   * The cell's maps grouped by place. One cell can hold nine maps (Glast Heim
   * and its eight interiors), which is far too many tabs to scan, so the panel
   * picks a place first and only then a floor.
   */
  areas: MapArea[];
  /** progress across the whole cell */
  progress: MapProgress;
  /**
   * Dungeons hidden inside this cell, by area name and without floor markers —
   * "Pyramid", not "Pyramid F1/F2/F3". The game's own world map reveals these
   * as callouts, so the names are what the reveal toggle draws.
   */
  dungeonNames: string[];
  /**
   * Which way the cave callout should point, chosen so its label lands on empty
   * terrain instead of covering a neighbouring cell that holds real maps.
   */
  callouts: Callout[];
  /** the cell holds a map that is not a dungeon */
  hasSurface: boolean;
}

/** One dungeon label and its own arrow; offsets are in map cells. */
export interface Callout {
  /** the dungeon's area name, e.g. "Glast Heim Castle" */
  name: string;
  dx: number;
  dy: number;
  arrow?: CaveArrowPosition;
}

/** One place inside a cell, with its floors if it has more than one. */
export interface MapArea {
  /** "Glast Heim Castle", "Pyramid", "Prontera West Gate" */
  name: string;
  /** its maps, in floor order — a single entry when the place has no floors */
  maps: GameMap[];
  /** every floor of this place is complete */
  complete: boolean;
}

export function mapProgress(
  mapId: string,
  levels: ReadonlyMap<string, MonsterLevelRecord>,
): MapProgress {
  return progressFor(monsterIdsByMapId.get(mapId) ?? [], levels);
}

function progressFor(
  monsterIds: readonly string[],
  levels: ReadonlyMap<string, MonsterLevelRecord>,
): MapProgress {
  let maxed = 0;
  let levelsLeft = 0;
  for (const id of monsterIds) {
    const level = levelOf(id, levels);
    if (level >= MAX_MR_LEVEL) maxed += 1;
    levelsLeft += Math.max(0, MAX_MR_LEVEL - level);
  }
  return {
    monsterIds: [...monsterIds],
    total: monsterIds.length,
    maxed,
    remaining: monsterIds.length - maxed,
    levelsLeft,
    // an empty roster has nothing to finish, so it is never "done"
    complete: monsterIds.length > 0 && maxed === monsterIds.length,
  };
}

/**
 * What to call one floor of a place. Some first floors carry no marker at all
 * ("Glast Heim Order" sits beside "Glast Heim Order F2"), so when the place has
 * several floors an unmarked one is floor 1 — printing its full name again next
 * to "F2" reads as a different place.
 */
export function floorLabel(name: string, floorsInArea: number): string {
  const marker = /\sF\d+$/.exec(name)?.[0].trim();
  if (marker) return marker;
  return floorsInArea > 1 ? "F1" : name;
}

/** Strips a trailing floor marker: "Pyramid F2" → "Pyramid". */
export function areaLabel(name: string): string {
  return name.replace(/\s+F\d+$/, "");
}

/**
 * Names a cell holding several maps. Floors of one dungeon collapse to the
 * shared area name ("Pyramid"); genuinely different places keep the first
 * map's own name, since no shorter name would be honest.
 */
function labelFor(maps: readonly GameMap[]): string {
  if (maps.length === 1) return maps[0].name;
  const areas = new Set(maps.map((m) => areaLabel(m.name)));
  if (areas.size === 1) return [...areas][0];

  // A cell can hold several places (Prontera West Gate + Culvert) or one place
  // plus its interiors (Glast Heim + Catacomb + Underground Prison). The map
  // whose anchor came from the prefab cell itself IS that place, so it names
  // the pin — otherwise "Catacomb" led the Glast Heim cell purely by sorting
  // first alphabetically.
  const own = maps.find((m) => m.anchor?.source === "cell");
  if (own) return areaLabel(own.name);

  // otherwise name it for the place you walk through, not the dungeon inside it
  const surface = maps.find((m) => !m.anchor?.source.startsWith("cave:"));
  return areaLabel((surface ?? maps[0]).name);
}

/** The map that IS this cell sorts ahead of dungeons and sub-areas inside it. */
function rank(map: GameMap): number {
  return map.anchor?.source === "cell" ? 0 : 1;
}

/** "Pyramid F2" → 2, so floors list in order instead of data order. */
function floorNumber(name: string): number {
  const match = /\sF(\d+)$/.exec(name);
  return match ? Number(match[1]) : 0;
}

function pinFor(
  cell: string,
  levels: ReadonlyMap<string, MonsterLevelRecord>,
): MapPin | null {
  const maps = (mapIdsByCell.get(cell) ?? [])
    .map(getMap)
    .sort(
      (a, b) =>
        // the place the cell actually is comes first, then its interiors —
        // otherwise "Catacomb" leads the Glast Heim tabs just by sorting first
        rank(a) - rank(b) ||
        // keep each dungeon's floors together: two dungeons can share a cell
        // (Sphinx Crypt + Pyramid), and sorting on floor number alone would
        // interleave them as F1, F1, F2, F2
        areaLabel(a.name).localeCompare(areaLabel(b.name)) ||
        // then that dungeon's floors in numeric order (F1 before F2)
        floorNumber(a.name) - floorNumber(b.name),
    );
  if (maps.length === 0 || !maps[0].anchor) return null;
  // a monster on two floors of the same dungeon is still one monster
  const union: string[] = [];
  for (const map of maps) {
    for (const id of monsterIdsByMapId.get(map.id) ?? []) {
      if (!union.includes(id)) union.push(id);
    }
  }
  // group by place, keeping the order the maps are already sorted into
  const areas: MapArea[] = [];
  for (const map of maps) {
    const name = areaLabel(map.name);
    const done = mapProgress(map.id, levels).complete;
    const area = areas.find((a) => a.name === name);
    if (area) {
      area.maps.push(map);
      area.complete &&= done;
    } else areas.push({ name, maps: [map], complete: done });
  }

  return {
    id: cell,
    anchor: maps[0].anchor,
    label: labelFor(maps),
    maps,
    areas,
    progress: progressFor(union, levels),
    dungeonNames: [
      ...new Set(
        maps
          .filter((m) => m.anchor?.source.startsWith("cave:"))
          .map((m) => areaLabel(m.name)),
      ),
    ],
    hasSurface: maps.some((m) => !m.anchor?.source.startsWith("cave:")),
    // filled in by assignCallouts once every pin is known
    callouts: [],
  };
}

/** Shared map-space dimensions keep placement and arrow geometry in sync. */
export function caveLabelWidth(name: string): number {
  return name.length * 0.6 * 0.15 + 0.24;
}

/** User-arranged positions are authoritative; never run automatic placement. */
function assignCallouts(pins: MapPin[]): void {
  for (const pin of pins) {
    pin.callouts = pin.dungeonNames.map((name) => {
      const position = cavePositions.labels.find((label) => label.pinId === pin.id && label.name === name);
      return { name, dx: position?.dx ?? 0, dy: position?.dy ?? -1, arrow: position?.arrow };
    });
  }
}

/** Closest points on the label and cell edges, in cell-relative coordinates. */
export function caveArrow(callout: Callout) {
  const axis = (offset: number, halfLabel: number) => {
    if (Math.abs(offset) > 0.5 + halfLabel) {
      const sign = Math.sign(offset);
      return { label: offset - sign * halfLabel, cell: sign * 0.5 };
    }
    const shared = Math.max(-0.5, Math.min(0.5, offset));
    return { label: shared, cell: shared };
  };
  const x = axis(callout.dx, caveLabelWidth(callout.name) / 2);
  const y = axis(callout.dy, 0.16);
  return {
    startX: x.label - callout.dx, startY: y.label - callout.dy,
    endX: x.cell - callout.dx, endY: y.cell - callout.dy,
  };
}

/** Every cell on the world map that holds at least one tracker map. */
export function allPins(
  levels: ReadonlyMap<string, MonsterLevelRecord>,
): MapPin[] {
  const pins: MapPin[] = [];
  for (const cell of mapIdsByCell.keys()) {
    const pin = pinFor(cell, levels);
    if (pin) pins.push(pin);
  }
  assignCallouts(pins);
  return pins;
}

/** The cells a monster spawns in — the ones highlighted when it is selected. */
export function cellsOf(mapIds: readonly string[]): Set<string> {
  const cells = new Set<string>();
  for (const mapId of mapIds) {
    const anchor = getMap(mapId).anchor;
    if (anchor) cells.add(anchor.cell);
  }
  return cells;
}
