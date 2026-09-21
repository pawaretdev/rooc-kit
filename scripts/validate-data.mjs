#!/usr/bin/env node
/**
 * Validates static game data in src/data/ before it reaches the app.
 * Run with: pnpm data:check
 *
 * Catches the mistakes that are easy to make while hand-authoring:
 * - schema violations (missing fields, wrong types, unknown element)
 * - monster name collisions across files (names become global ids)
 * - map names that differ only in casing/spacing (would split one map in two)
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const dataDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data');
const researchDir = join(dataDir, 'research');
const MONSTER_TYPES = new Set(['Normal', 'Mini', 'MVP']);

const errors = [];
const warnings = [];

const meta = JSON.parse(readFileSync(join(dataDir, 'meta.json'), 'utf8'));
if (!Number.isInteger(meta.version)) errors.push('meta.json: "version" must be an integer');
if (!Array.isArray(meta.elementOrder)) errors.push('meta.json: "elementOrder" must be an array');

// kebab-case so the id doubles as the CDN image filename (peco-peco-egg.png)
const slug = (s) => s.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const seenMonsters = new Map(); // slug -> "file (row N)"
const seenMaps = new Map();     // slug -> Set of exact spellings

const files = existsSync(researchDir)
  ? readdirSync(researchDir).filter((f) => f.endsWith('.json'))
  : [];
if (files.length === 0) errors.push('src/data/research/ has no JSON files');

for (const file of files) {
  const where = `research/${file}`;
  let doc;
  try {
    doc = JSON.parse(readFileSync(join(researchDir, file), 'utf8'));
  } catch (e) {
    errors.push(`${where}: invalid JSON — ${e.message}`);
    continue;
  }

  const expected = file.replace(/\.json$/, '');
  if (typeof doc.element !== 'string' || doc.element.toLowerCase() !== expected) {
    errors.push(`${where}: "element" (${doc.element}) does not match filename "${expected}"`);
  }
  if (Array.isArray(meta.elementOrder) && !meta.elementOrder.includes(doc.element)) {
    errors.push(`${where}: element "${doc.element}" is not in meta.json elementOrder`);
  }

  if (!Array.isArray(doc.rows)) {
    errors.push(`${where}: "rows" must be an array`);
    continue;
  }
  if (doc.rows.length === 0) {
    warnings.push(`${where}: no rows yet — still to be filled in`);
    continue;
  }

  const rowNumbers = new Set();
  for (const row of doc.rows) {
    const rowWhere = `${where} row ${row.row}`;
    if (!Number.isInteger(row.row) || row.row < 1) errors.push(`${rowWhere}: "row" must be a positive integer`);
    if (rowNumbers.has(row.row)) errors.push(`${rowWhere}: duplicate row number`);
    rowNumbers.add(row.row);

    if (!Array.isArray(row.monsters) || row.monsters.length === 0) {
      errors.push(`${rowWhere}: "monsters" must be a non-empty array`);
      continue;
    }
    if (row.monsters.length > 5) warnings.push(`${rowWhere}: has ${row.monsters.length} monsters (in-game rows show ~5)`);

    for (const m of row.monsters) {
      const mWhere = `${rowWhere} · ${m.name ?? '<unnamed>'}`;
      if (typeof m.name !== 'string' || !m.name.trim()) errors.push(`${mWhere}: missing "name"`);
      if (!MONSTER_TYPES.has(m.type)) errors.push(`${mWhere}: "type" must be Normal | Mini | MVP (got ${JSON.stringify(m.type)})`);
      if (m.baseLevel !== undefined && !Number.isInteger(m.baseLevel)) errors.push(`${mWhere}: "baseLevel" must be an integer when present`);
      if (!Array.isArray(m.locations) || m.locations.length === 0 || m.locations.some((l) => typeof l !== 'string' || !l.trim())) {
        errors.push(`${mWhere}: "locations" must be a non-empty array of map names`);
      }

      if (typeof m.name === 'string' && m.name.trim()) {
        const id = slug(m.name);
        if (seenMonsters.has(id)) {
          errors.push(`${mWhere}: monster id "${id}" collides with ${seenMonsters.get(id)} — names must be globally unique`);
        } else {
          seenMonsters.set(id, rowWhere);
        }
      }

      for (const loc of m.locations ?? []) {
        if (typeof loc !== 'string') continue;
        const id = slug(loc);
        if (!seenMaps.has(id)) seenMaps.set(id, new Set());
        seenMaps.get(id).add(loc);
      }
    }
  }
}

// world-map.json — every map a monster spawns on needs a pin, or it vanishes
// from the World Map view with no visible error.
const worldMapPath = join(dataDir, 'world-map.json');
if (!existsSync(worldMapPath)) {
  errors.push('src/data/world-map.json is missing');
} else {
  let wm;
  try {
    wm = JSON.parse(readFileSync(worldMapPath, 'utf8'));
  } catch (e) {
    errors.push(`world-map.json: invalid JSON — ${e.message}`);
  }
  if (wm) {
    const src = wm.image?.sourceWidth;
    if (!Number.isFinite(src) || src <= 0) errors.push('world-map.json: image.sourceWidth must be a positive number');
    if (!Number.isFinite(wm.cellPx) || wm.cellPx <= 0) errors.push('world-map.json: "cellPx" must be a positive number');
    if (!wm.maps || typeof wm.maps !== 'object') {
      errors.push('world-map.json: "maps" must be an object');
    } else {
      for (const [name, a] of Object.entries(wm.maps)) {
        const where = `world-map.json · ${name}`;
        if (!a || typeof a !== 'object') { errors.push(`${where}: anchor must be an object`); continue; }
        for (const axis of ['x', 'y']) {
          if (!Number.isFinite(a[axis])) errors.push(`${where}: "${axis}" must be a number`);
          else if (src && (a[axis] < 0 || a[axis] > src)) errors.push(`${where}: "${axis}" (${a[axis]}) is outside the ${src}px map`);
        }
        if (typeof a.cell !== 'string' || !a.cell.trim()) errors.push(`${where}: missing "cell" (the prefab cell id)`);
        if (typeof a.source !== 'string' || !a.source.trim()) errors.push(`${where}: missing "source" (cell | cave:<name> | area)`);
      }
      // the check that actually matters: no spawn map without a pin
      for (const spellings of seenMaps.values()) {
        const name = [...spellings][0];
        if (!wm.maps[name]) errors.push(`world-map.json: no anchor for map "${name}" — it would be invisible on the World Map`);
      }
      const unused = Object.keys(wm.maps).filter((n) => !seenMaps.has(slug(n)));
      if (unused.length) warnings.push(`world-map.json: ${unused.length} anchor(s) for maps no monster spawns on: ${unused.join(', ')}`);
    }
  }
}

for (const [id, spellings] of seenMaps) {
  if (spellings.size > 1) {
    warnings.push(`map "${id}" is spelled ${spellings.size} ways: ${[...spellings].map((s) => `"${s}"`).join(', ')} — pick one`);
  }
}

for (const w of warnings) console.warn(`⚠︎  ${w}`);
for (const e of errors) console.error(`✗  ${e}`);
console.log(`\n${files.length} file(s), ${seenMonsters.size} monsters, ${seenMaps.size} maps — ${errors.length} error(s), ${warnings.length} warning(s)`);
process.exit(errors.length > 0 ? 1 : 0);
