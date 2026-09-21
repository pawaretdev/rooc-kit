import meta from "@/data/meta.json";
import worldMapRaw from "@/data/world-map.json";
import neutralRaw from "@/data/research/neutral.json";
import windRaw from "@/data/research/wind.json";
import earthRaw from "@/data/research/earth.json";
import fireRaw from "@/data/research/fire.json";
import waterRaw from "@/data/research/water.json";
import poisonRaw from "@/data/research/poison.json";
import holyRaw from "@/data/research/holy.json";
import shadowRaw from "@/data/research/shadow.json";
import ghostRaw from "@/data/research/ghost.json";
import undeadRaw from "@/data/research/undead.json";

/** Ordered as in the in-game Monster Research sidebar — keep this order in the UI. */
export const ELEMENTS = [
  "Neutral",
  "Wind",
  "Earth",
  "Fire",
  "Water",
  "Poison",
  "Holy",
  "Shadow",
  "Ghost",
  "Undead",
] as const;
export type Element = (typeof ELEMENTS)[number];

export type MonsterKind = "normal" | "mini" | "mvp";

export interface GameMap {
  id: string;
  name: string;
  /** "Payon Cave F2" → "Payon Cave" — for area-level filtering later */
  area?: string;
  /** lowest baseLevel among monsters spawning here — groups maps by level bracket */
  level?: number;
  /** where the map sits on the world map, 0..1 of the image on both axes */
  anchor?: MapAnchor;
}

/**
 * A map's spot on the world map, stored as a fraction of the image so it stays
 * correct at any rendered size. `source` records how the spot was derived:
 * `cell` = its own cell in WorldMap.prefab, `cave:<pinyin>` = a dungeon-entrance
 * label in the prefab, `near:<place>` = a sub-area placed by hand next to its host.
 */
export interface MapAnchor {
  /** 0..1 across the image */
  x: number;
  /** 0..1 down the image */
  y: number;
  /** the prefab cell this map sits in — maps sharing a cell share a pin */
  cell: string;
  source: string;
}

export interface Monster {
  id: string;
  name: string;
  kind: MonsterKind;
  baseLevel?: number;
  mapIds: string[];
  elementId: Element;
  rowId: string;
  /** CDN image filename override when it differs from the derived id */
  image?: string;
}

export interface ResearchRow {
  id: string;
  elementId: Element;
  index: number;
  monsterIds: string[];
}

interface RawMonster {
  name: string;
  type: "Normal" | "Mini" | "MVP";
  baseLevel?: number;
  locations: string[];
  image?: string;
}
interface RawElementFile {
  element: string;
  rows: { row: number; monsters: RawMonster[] }[];
}

// meta.elementOrder is the authority for order; the imports are matched to it below.
const RAW_BY_ELEMENT: Record<Element, RawElementFile> = {
  Neutral: neutralRaw,
  Wind: windRaw,
  Earth: earthRaw,
  Fire: fireRaw,
  Water: waterRaw,
  Poison: poisonRaw,
  Holy: holyRaw,
  Shadow: shadowRaw,
  Ghost: ghostRaw,
  Undead: undeadRaw,
} as Record<Element, RawElementFile>;

/** Keep in sync with the slug() in scripts/validate-data.mjs — ids double as CDN image filenames. */
export function slugify(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const KIND: Record<RawMonster["type"], MonsterKind> = {
  Normal: "normal",
  Mini: "mini",
  MVP: "mvp",
};

function deriveArea(mapName: string): string | undefined {
  const area = mapName.replace(/\s+F\d+$/, "");
  return area === mapName ? undefined : area;
}

interface RawWorldMap {
  image: { file: string; width: number; height: number; sourceWidth: number };
  cellPx: number;
  maps: Record<
    string,
    { x: number; y: number; cell: string; source: string }
  >;
}
const worldMap = worldMapRaw as RawWorldMap;

/** Anchors ship in source-image pixels; store fractions so any render size works. */
const SOURCE_PX = worldMap.image.sourceWidth;
const anchorsByMapName = new Map<string, MapAnchor>(
  Object.entries(worldMap.maps).map(([name, a]) => [
    name,
    { x: a.x / SOURCE_PX, y: a.y / SOURCE_PX, cell: a.cell, source: a.source },
  ]),
);

/** One clickable zone, as a fraction of the world-map image. */
export const worldMapCellSize = worldMap.cellPx / SOURCE_PX;
export const worldMapImageFile = worldMap.image.file;

const mapsById = new Map<string, GameMap>();
const monstersById = new Map<string, Monster>();
const rowsList: ResearchRow[] = [];
const monsterIdsByMap = new Map<string, string[]>();

for (const elementId of ELEMENTS) {
  const file = RAW_BY_ELEMENT[elementId];
  for (const rawRow of file.rows) {
    const rowId = `${slugify(elementId)}-${rawRow.row}`;
    const monsterIds: string[] = [];
    for (const raw of rawRow.monsters) {
      const id = slugify(raw.name);
      const mapIds = raw.locations.map((loc) => {
        const mapId = slugify(loc);
        if (!mapsById.has(mapId)) {
          mapsById.set(mapId, {
            id: mapId,
            name: loc,
            area: deriveArea(loc),
            anchor: anchorsByMapName.get(loc),
          });
        }
        const inMap = monsterIdsByMap.get(mapId) ?? [];
        if (!inMap.includes(id)) monsterIdsByMap.set(mapId, [...inMap, id]);
        return mapId;
      });
      monstersById.set(id, {
        id,
        name: raw.name,
        kind: KIND[raw.type],
        baseLevel: raw.baseLevel,
        mapIds,
        elementId,
        rowId,
        image: raw.image,
      });
      monsterIds.push(id);
    }
    rowsList.push({ id: rowId, elementId, index: rawRow.row, monsterIds });
  }
}

export const dataVersion: number = meta.version;
export const maps = mapsById;
export const monsters = monstersById;
export const rows: readonly ResearchRow[] = rowsList;
export const monsterIdsByMapId = monsterIdsByMap;

/** Maps where an MVP / a Mini spawns — used by the "no MVP / no Mini on map" filters. */
export const mapsWithMvp = new Set<string>();
export const mapsWithMini = new Set<string>();
for (const monster of monstersById.values()) {
  if (monster.kind === "mvp") for (const id of monster.mapIds) mapsWithMvp.add(id);
  if (monster.kind === "mini") for (const id of monster.mapIds) mapsWithMini.add(id);
  if (monster.baseLevel !== undefined) {
    for (const id of monster.mapIds) {
      const map = mapsById.get(id)!;
      map.level =
        map.level === undefined
          ? monster.baseLevel
          : Math.min(map.level, monster.baseLevel);
    }
  }
}

/**
 * Every map sharing a world-map cell, keyed by cell id. Orc Village and Orc Cave
 * are one place on the map, so one pin opens both.
 */
export const mapIdsByCell = new Map<string, string[]>();
for (const map of mapsById.values()) {
  if (!map.anchor) continue;
  const inCell = mapIdsByCell.get(map.anchor.cell);
  if (inCell) inCell.push(map.id);
  else mapIdsByCell.set(map.anchor.cell, [map.id]);
}

export function getMonster(id: string): Monster {
  const m = monstersById.get(id);
  if (!m) throw new Error(`Unknown monster id: ${id}`);
  return m;
}

export function getRow(rowId: string): ResearchRow {
  const row = rowsList.find((r) => r.id === rowId);
  if (!row) throw new Error(`Unknown row id: ${rowId}`);
  return row;
}

export function getMap(mapId: string): GameMap {
  const map = mapsById.get(mapId);
  if (!map) throw new Error(`Unknown map id: ${mapId}`);
  return map;
}
