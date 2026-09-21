import {
  getMap,
  mapIdsByCell,
  monsterIdsByMapId,
  worldMapCellSize,
  type GameMap,
  type MapAnchor,
} from "@/lib/game-data";
import { MAX_MR_LEVEL, type MonsterLevelRecord } from "@/lib/local-db";
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

/**
 * One dungeon's floating name. Each cave gets its own label and its own leader
 * line back to the square — Glast Heim hides six, and collapsing them into one
 * line said nothing about which is which. The offset is in cells and may be
 * diagonal or several out: the label goes wherever it finds empty terrain.
 */
export interface Callout {
  /** the dungeon's area name, e.g. "Glast Heim Castle" */
  name: string;
  dx: number;
  dy: number;
}

/** One place inside a cell, with its floors if it has more than one. */
export interface MapArea {
  /** "Glast Heim Castle", "Pyramid", "Prontera West Gate" */
  name: string;
  /** its maps, in floor order — a single entry when the place has no floors */
  maps: GameMap[];
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
    const area = areas.find((a) => a.name === name);
    if (area) area.maps.push(map);
    else areas.push({ name, maps: [map] });
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

/**
 * Candidate spots for a callout, nearest and most readable first: straight up,
 * then the diagonals, then further out. A label may float anywhere it fits, so
 * a crowded corner of the map can still place every name.
 */
/**
 * Candidate spots for a label, nearest first and straight-out before diagonal.
 * Generated rather than hand-listed because a cell hiding six dungeons needs
 * six free spots, and the near ring alone does not have them.
 */
const SLOTS: readonly { dx: number; dy: number }[] = (() => {
  const slots: { dx: number; dy: number }[] = [];
  for (let ring = 1; ring <= 3; ring += 1) {
    for (let dy = -ring; dy <= ring; dy += 1) {
      for (let dx = -ring; dx <= ring; dx += 1) {
        // only the ring's edge; inner rings were emitted already
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== ring) continue;
        slots.push({ dx, dy });
      }
    }
  }
  // prefer spots close to the cell, and straight lines over diagonals
  return slots.sort(
    (a, b) =>
      Math.hypot(a.dx, a.dy) - Math.hypot(b.dx, b.dy) ||
      Number(a.dx !== 0 && a.dy !== 0) - Number(b.dx !== 0 && b.dy !== 0),
  );
})();

/** Roughly how many cells wide a label renders at the map's label size. */
function labelWidthInCells(name: string): number {
  // ~5.6px per character at CELL_PX * 0.15, plus the chip's padding
  return Math.max(1, Math.round((name.length * 0.55 * 0.15 + 0.18) * 10) / 10);
}

/**
 * Floats every dungeon name over empty terrain: never over a square that holds
 * maps, and never over a label already placed. Labels are wider than one cell,
 * so the strip each one covers is reserved rather than just its centre.
 */
function assignCallouts(pins: MapPin[], cellSize: number): void {
  const key = (gx: number, gy: number) => `${gx},${gy}`;
  const occupied = new Set(
    pins.map((pin) =>
      key(
        Math.round(pin.anchor.x / cellSize),
        Math.round(pin.anchor.y / cellSize),
      ),
    ),
  );
  const claimed = new Set<string>();

  // The view frames the cells that hold maps, so a label placed outside that
  // box sits on blank art off the edge of the screen. Keep labels inside it,
  // with one cell of slack.
  const gridX = pins.map((p) => Math.round(p.anchor.x / cellSize));
  const gridY = pins.map((p) => Math.round(p.anchor.y / cellSize));
  // Two cells of slack around the squares that hold maps: Glast Heim sits on
  // the left edge and hides six dungeons, which simply do not fit in one ring.
  // Turning the cave names on re-fits the camera to include them.
  const bounds = {
    minX: Math.min(...gridX) - 2,
    maxX: Math.max(...gridX) + 2,
    minY: Math.min(...gridY) - 2,
    maxY: Math.max(...gridY) + 2,
  };
  const inView = (gx: number, gy: number) =>
    gx >= bounds.minX &&
    gx <= bounds.maxX &&
    gy >= bounds.minY &&
    gy <= bounds.maxY;

  // place the busiest cells first — they have the least room to manoeuvre
  const ordered = [...pins]
    .filter((pin) => pin.dungeonNames.length > 0)
    .sort((a, b) => b.dungeonNames.length - a.dungeonNames.length);

  for (const pin of ordered) {
    const gx = Math.round(pin.anchor.x / cellSize);
    const gy = Math.round(pin.anchor.y / cellSize);
    pin.callouts = [];

    // Fan the labels of one cell around it instead of letting each grab the
    // nearest free slot: six names all reaching for "straight up" is what made
    // the leader lines cross each other. Each name gets its own arc of sky, and
    // its slots are tried in order of how close they sit to that direction.
    const count = pin.dungeonNames.length;
    // directions this cell has already sent a label in — two labels on the same
    // bearing stack one behind the other and their lines run together
    const used: number[] = [];
    pin.dungeonNames.forEach((name, index) => {
      const reach = Math.ceil(labelWidthInCells(name) / 2);
      const strip = (slot: { dx: number; dy: number }) => {
        const cells: string[] = [];
        for (let d = -reach; d <= reach; d += 1) {
          cells.push(key(gx + slot.dx + d, gy + slot.dy));
        }
        return cells;
      };

      const fits = (candidate: { dx: number; dy: number }) =>
        inView(gx + candidate.dx - reach, gy + candidate.dy) &&
        inView(gx + candidate.dx + reach, gy + candidate.dy);

      // start at the top and sweep clockwise, one share of the circle each
      const wanted = -Math.PI / 2 + (index / count) * Math.PI * 2;
      const byDirection = [...SLOTS].sort((a, b) => {
        const da = Math.abs(
          Math.atan2(
            Math.sin(Math.atan2(a.dy, a.dx) - wanted),
            Math.cos(Math.atan2(a.dy, a.dx) - wanted),
          ),
        );
        const db = Math.abs(
          Math.atan2(
            Math.sin(Math.atan2(b.dy, b.dx) - wanted),
            Math.cos(Math.atan2(b.dy, b.dx) - wanted),
          ),
        );
        // closest to the wanted direction first, then nearest to the cell
        return da - db || Math.hypot(a.dx, a.dy) - Math.hypot(b.dx, b.dy);
      });

      // keep at least ~25° between this cell's labels
      const clear = (candidate: { dx: number; dy: number }) => {
        const bearing = Math.atan2(candidate.dy, candidate.dx);
        return used.every((taken) => {
          const delta = Math.abs(
            Math.atan2(
              Math.sin(bearing - taken),
              Math.cos(bearing - taken),
            ),
          );
          return delta > 0.44;
        });
      };

      const slot =
        byDirection.find(
          (candidate) =>
            clear(candidate) &&
            fits(candidate) &&
            strip(candidate).every(
              (cell) => !occupied.has(cell) && !claimed.has(cell),
            ),
        ) ??
        byDirection.find(
          (candidate) =>
            fits(candidate) &&
            strip(candidate).every(
              (cell) => !occupied.has(cell) && !claimed.has(cell),
            ),
        ) ??
        // crowded: still on screen and still off the maps, just closer in
        byDirection.find(
          (candidate) =>
            fits(candidate) &&
            strip(candidate).every((cell) => !occupied.has(cell)),
        ) ??
        byDirection.find(
          (candidate) =>
            fits(candidate) &&
            !occupied.has(key(gx + candidate.dx, gy + candidate.dy)),
        ) ??
        SLOTS[0];

      for (const cell of strip(slot)) claimed.add(cell);
      used.push(Math.atan2(slot.dy, slot.dx));
      pin.callouts.push({ name, dx: slot.dx, dy: slot.dy });
    });
  }
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
  assignCallouts(pins, worldMapCellSize);
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
