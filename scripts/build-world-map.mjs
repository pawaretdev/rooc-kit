#!/usr/bin/env node
/**
 * Regenerates src/data/world-map.json from the extracted Unity prefab.
 * Run with: node scripts/build-world-map.mjs
 *
 * Every tracker map is bound to a REAL cell from WorldMap.prefab, by cell id.
 * Binding to cells rather than to hand-picked pixels is what keeps the
 * highlight squares aligned with the grid painted into the map art — the
 * cave_labels in the prefab are captions drawn *beside* their entrance, not
 * cell centres, so using them directly leaves the box visibly off-grid.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = '/Users/pawaret/rooc/rooc-assets/maps/worldmap_cells.json';
if (!existsSync(SOURCE)) {
  console.error(`missing ${SOURCE} — the rooc-assets repo must be checked out next to rooc-kit`);
  process.exit(1);
}
const prefab = JSON.parse(readFileSync(SOURCE, 'utf8'));
const world = prefab.maps.Panel_DefaultWorldMap;

const byId = new Map(world.cells.map((c) => [c.id, c]));

/**
 * tracker map name -> cell id it sits in.
 * `cell`  the map IS that prefab cell
 * `cave`  a dungeon whose entrance sits in that cell (pinyin label in the prefab)
 * `area`  a sub-area of a larger place that has no cell of its own
 */
const BIND = {
  // — maps that are their own cell —
  'Western Geffen':        ['12', 'cell'],
  'Poring Island':         ['13', 'cell'],
  'Orc Village':           ['34', 'cell'],
  'Glast Heim Outskirts':  ['54', 'cell'],
  'Eastern Payon':         ['36', 'cell'],
  'Larva Canyon':          ['9',  'cell'],
  'Geffen Field':          ['53', 'cell'],
  'Prontera South Gate':   ['4',  'cell'],
  'Northern Geffen':       ['10', 'cell'],
  'Prontera West Gate':    ['1',  'cell'],
  'Glast Heim':            ['55', 'cell'],
  'Eastern Geffen':        ['23', 'cell'],
  'Payon Forest':          ['37', 'cell'],
  'Goblin Forest':         ['8',  'cell'],
  'Garden':                ['17', 'cell'],
  'Bridge of Desert':      ['35', 'cell'],
  'Desert Crossroad':      ['11', 'cell'],
  'Kordt Forest':          ['56', 'cell'],
  'Prontera North Gate':   ['5',  'cell'],

  // — dungeons: the cell holding the entrance (pinyin caption in the prefab) —
  'Ant Hell':              ['19',  'cave:Mayidong'],
  'Pyramid F1':            ['25',  'cave:Jinzita'],
  'Pyramid F2':            ['25',  'cave:Jinzita'],
  'Pyramid F3':            ['25',  'cave:Jinzita'],
  'Culvert F1':            ['1',   'cave:Xiashuidao'],
  'Culvert F2':            ['1',   'cave:Xiashuidao'],
  'Orc Cave':              ['34',  'cave:Oukemigong'],
  'Undersea Tunnel F1':    ['20',  'cave:Haididongku'],
  'Undersea Tunnel F2':    ['20',  'cave:Haididongku'],
  'Undersea Tunnel F3':    ['20',  'cave:Haididongku'],
  'Undersea Tunnel F4':    ['20',  'cave:Haididongku'],
  'Payon Cave F1':         ['52',  'cave:Jiangshidong'],
  'Payon Cave F2':         ['52',  'cave:Jiangshidong'],
  'Payon Cave F3':         ['52',  'cave:Jiangshidong'],
  'Labyrinth Forest F1':   ['5',   'cave:Beisen'],
  'Labyrinth Forest F2':   ['5',   'cave:Beisen'],
  'Labyrinth Forest F3':   ['5',   'cave:Beisen'],
  'Mjolnir Abandoned Mine':['17',  'cave:Feiqikuangkeng'],
  'Shipwreck Labyrinth':   ['22',  'cave:Chenmozhichuan'],
  'Shipwreck Labyrinth F2':['22',  'cave:Chenmozhichuan'],

  // — sub-areas that share a cell with their host —
  'Mt.Mjolnir':            ['68', 'cell'],
  'Southern Payon':        ['45', 'cell'],
  'Southeast Payon':       ['48', 'area'],
  'Deep Payon Forest':     ['67', 'cell'],
  'Geffen Underground F1': ['16', 'area'],
  'Geffen Underground F2': ['16', 'area'],
  'Geffen Underground F3': ['16', 'area'],
  'Southern Morroc':       ['28', 'area'],
  'Sograt Desert':         ['19', 'cell'],
  'Southern Sograt':       ['38', 'cell'],
  'Sphinx Crypt':          ['25', 'cave:Sphinx'],
  'Sphinx Crypt F2':       ['25', 'cave:Sphinx'],
  // Glast Heim is the place you walk to; everything else in its cell is an
  // interior you enter from there, so they are caves, not sub-areas.
  'Glast Heim Castle F1':  ['55', 'cave:GlastHeim'],
  'Glast Heim Castle F2':  ['55', 'cave:GlastHeim'],
  'Glast Heim Monastery':  ['55', 'cave:GlastHeim'],
  'Glast Heim Order':      ['55', 'cave:GlastHeim'],
  'Glast Heim Order F2':   ['55', 'cave:GlastHeim'],
  'Glast Heim Culvert':    ['55', 'cave:GlastHeim'],
  'Underground Prison':    ['55', 'cave:GlastHeim'],
  'Catacomb':              ['55', 'cave:GlastHeim'],
};

// every map a monster actually spawns on
const ELEMENTS = ['neutral','wind','earth','fire','water','poison','holy','shadow','ghost','undead'];
const spawnMaps = new Set();
for (const el of ELEMENTS) {
  const file = JSON.parse(readFileSync(join(root, 'src/data/research', `${el}.json`), 'utf8'));
  for (const row of file.rows) for (const m of row.monsters) for (const loc of m.locations) spawnMaps.add(loc);
}

const errors = [];
const maps = {};
for (const name of [...spawnMaps].sort()) {
  const bind = BIND[name];
  if (!bind) { errors.push(`no cell bound for map "${name}"`); continue; }
  const [cellId, source] = bind;
  const cell = byId.get(cellId);
  if (!cell) { errors.push(`map "${name}" binds to unknown cell id "${cellId}"`); continue; }
  maps[name] = {
    x: Math.round(cell.center_px[0] * 10) / 10,
    y: Math.round(cell.center_px[1] * 10) / 10,
    cell: cellId,
    source,
  };
}
for (const name of Object.keys(BIND)) {
  if (!spawnMaps.has(name)) errors.push(`BIND has "${name}" but no monster spawns there`);
}
if (errors.length) { for (const e of errors) console.error(`✗ ${e}`); process.exit(1); }

const doc = {
  image: { file: 'worldmap.jpg', width: 1536, height: 1536, sourceWidth: prefab.image.width },
  cellPx: prefab.grid.cell_px,
  note: 'Generated by scripts/build-world-map.mjs from WorldMap.prefab — do not hand-edit. x/y are pixels on the original 2048px art and are always a real prefab cell centre, so highlight squares land on the grid painted into the map. `cell` is that prefab cell id; `source` says why: cell = the map is that cell, cave:<pinyin> = a dungeon entrance inside it, area = a sub-area sharing its host cell.',
  maps,
};
writeFileSync(join(root, 'src/data/world-map.json'), JSON.stringify(doc, null, 2) + '\n');

const bySource = {};
for (const v of Object.values(maps)) {
  const k = v.source.split(':')[0];
  bySource[k] = (bySource[k] ?? 0) + 1;
}
console.log(`wrote src/data/world-map.json — ${Object.keys(maps).length} maps`, bySource);
