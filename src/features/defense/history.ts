import {
  DAMAGE_KINDS,
  LIMITS,
  evaluateKind,
  isValidValue,
  layersFor,
  layerMultiplier,
  type DamageKind,
  type DefenseBuild,
  type DefenseSide,
  type LayerId,
  type LimitKey,
  type Num,
  type Opponent,
} from "./model";

/**
 * Saved builds ("snapshots") for the DEF Planner history. Local-first:
 * they live in IndexedDB and only reach the server when the user turns on
 * history sync. Inputs are stored, never results — the chart recomputes
 * every snapshot against one opponent, so a formula update re-reads old
 * history consistently.
 *
 * Sync merges per record (last write wins on `updatedAt`) instead of the
 * whole-snapshot replace the progress sync uses: a device that opts in late
 * must never wipe history saved elsewhere. Deletes therefore leave a
 * tombstone so they win the merge too.
 */

export interface DefenseSnapshot {
  id: string;
  name: string;
  note?: string;
  build: DefenseBuild;
  /** the opponent on screen when it was saved — reference only */
  opponent?: Opponent;
  formulaVersion: string;
  /** when the stats were recorded — the chart's x axis */
  savedAt: string;
  /** last edit (rename/note) — the merge key */
  updatedAt: string;
}

export interface DefenseTombstone {
  id: string;
  deletedAt: string;
  updatedAt: string;
}

export type DefenseHistoryEntry = DefenseSnapshot | DefenseTombstone;

export const MAX_NAME_LENGTH = 80;
export const MAX_NOTE_LENGTH = 500;
/** live snapshots one user may keep — plenty for years of check-ins */
export const MAX_SNAPSHOTS = 500;
/** snapshots + tombstones in one payload */
export const MAX_HISTORY_ENTRIES = 2_000;

export function isTombstone(entry: DefenseHistoryEntry): entry is DefenseTombstone {
  return "deletedAt" in entry;
}

/** Live snapshots, oldest first (the chart and list order). */
export function liveSnapshots(entries: readonly DefenseHistoryEntry[]): DefenseSnapshot[] {
  return entries
    .filter((entry): entry is DefenseSnapshot => !isTombstone(entry))
    .sort((a, b) => a.savedAt.localeCompare(b.savedAt) || a.id.localeCompare(b.id));
}

/**
 * Per-record last-write-wins union. On a tie a tombstone beats a snapshot so
 * a delete is never resurrected by an equal-timestamp copy.
 */
export function mergeHistory(
  a: readonly DefenseHistoryEntry[],
  b: readonly DefenseHistoryEntry[],
): DefenseHistoryEntry[] {
  const merged = new Map<string, DefenseHistoryEntry>();
  for (const entry of [...a, ...b]) {
    const current = merged.get(entry.id);
    if (
      !current ||
      entry.updatedAt > current.updatedAt ||
      (entry.updatedAt === current.updatedAt && isTombstone(entry) && !isTombstone(current))
    ) {
      merged.set(entry.id, entry);
    }
  }
  return [...merged.values()].sort((x, y) => x.id.localeCompare(y.id));
}

/** Stable string form for "did anything change" checks. */
export function historyKey(entries: readonly DefenseHistoryEntry[]): string {
  return entries
    .map((entry) => `${entry.id}@${entry.updatedAt}${isTombstone(entry) ? "x" : ""}`)
    .sort()
    .join("|");
}

// ── validation (shared by the API route and local import paths) ──

const ISO_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNum(value: unknown, key: LimitKey): value is Num {
  return value === null || (typeof value === "number" && isValidValue(key, value));
}

function isSide(value: unknown): value is DefenseSide {
  return (
    isRecord(value) &&
    isNum(value.equipment, "equipment") &&
    isNum(value.percent, "percent") &&
    isNum(value.refine, "refine") &&
    isNum(value.dmgReduction, "dmgReduction")
  );
}

export function isBuild(value: unknown): value is DefenseBuild {
  return (
    isRecord(value) &&
    isNum(value.level, "level") &&
    isNum(value.pvpReduction, "pvpReduction") &&
    isSide(value.physical) &&
    isSide(value.magic)
  );
}

function isAttack(value: unknown): boolean {
  return (
    isRecord(value) &&
    isNum(value.flatIgnore, "flatIgnore") &&
    isNum(value.ignorePercent, "ignorePercent") &&
    isNum(value.dmgBonus, "dmgBonus")
  );
}

export function isOpponent(value: unknown): value is Opponent {
  return (
    isRecord(value) &&
    isNum(value.pvpBonus, "pvpBonus") &&
    isAttack(value.physical) &&
    isAttack(value.magic)
  );
}

function isIso(value: unknown): value is string {
  return typeof value === "string" && ISO_PATTERN.test(value);
}

function isId(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 64;
}

export function isHistoryEntry(value: unknown): value is DefenseHistoryEntry {
  if (!isRecord(value) || !isId(value.id) || !isIso(value.updatedAt)) return false;
  if ("deletedAt" in value) return isIso(value.deletedAt);
  return (
    typeof value.name === "string" &&
    value.name.trim().length > 0 &&
    value.name.length <= MAX_NAME_LENGTH &&
    (value.note === undefined ||
      (typeof value.note === "string" && value.note.length <= MAX_NOTE_LENGTH)) &&
    isBuild(value.build) &&
    (value.opponent === undefined || isOpponent(value.opponent)) &&
    typeof value.formulaVersion === "string" &&
    value.formulaVersion.length <= 40 &&
    isIso(value.savedAt)
  );
}

/** Throws with a short reason when the payload is not a valid history list. */
export function parseHistoryEntries(raw: unknown): DefenseHistoryEntry[] {
  if (!Array.isArray(raw)) throw new Error("entries must be an array");
  if (raw.length > MAX_HISTORY_ENTRIES) throw new Error("too many entries");
  if (!raw.every(isHistoryEntry)) throw new Error("invalid entry");
  const ids = new Set(raw.map((entry) => entry.id));
  if (ids.size !== raw.length) throw new Error("duplicate ids");
  if (raw.filter((entry) => !isTombstone(entry)).length > MAX_SNAPSHOTS) {
    throw new Error("too many snapshots");
  }
  return raw;
}

/** A snapshot holds something worth keeping — not every field blank. */
export function hasAnyValue(build: DefenseBuild): boolean {
  return [
    build.level,
    build.pvpReduction,
    ...DAMAGE_KINDS.flatMap((kind) => Object.values(build[kind])),
  ].some((value) => value !== null);
}

// ── chart series ──

export type StatMetric = "level" | "pvpReduction" | `${DamageKind}.${keyof DefenseSide}`;

export const STAT_METRICS: readonly StatMetric[] = [
  "physical.equipment",
  "physical.refine",
  "physical.percent",
  "physical.dmgReduction",
  "magic.equipment",
  "magic.refine",
  "magic.percent",
  "magic.dmgReduction",
  "pvpReduction",
  "level",
];

export function statValue(build: DefenseBuild, metric: StatMetric): Num {
  if (metric === "level") return build.level;
  if (metric === "pvpReduction") return build.pvpReduction;
  const [kind, field] = metric.split(".") as [DamageKind, keyof DefenseSide];
  return build[kind][field];
}

/** LIMITS key behind a stat metric (for formatting decisions). */
export function statLimitKey(metric: StatMetric): LimitKey {
  if (metric === "level" || metric === "pvpReduction") return metric;
  return metric.split(".")[1] as keyof typeof LIMITS;
}

/**
 * Layers the toughness chart multiplies for one damage type: those whose
 * opponent inputs are present — the same set for every point, so the line
 * stays comparable. A snapshot missing a needed stat becomes a gap.
 */
export function chartLayers(opponent: Opponent, kind: DamageKind): LayerId[] {
  const attack = opponent[kind];
  return layersFor(kind).filter((id) => {
    if (id === "def") return attack.flatIgnore !== null && attack.ignorePercent !== null;
    if (id === "pvp") return opponent.pvpBonus !== null;
    return attack.dmgBonus !== null;
  });
}

/**
 * Model damage-through (product of `layers`) for each snapshot under one
 * opponent; null where the snapshot lacks an input those layers need or the
 * opponent itself is invalid.
 */
export function toughnessPoint(
  build: DefenseBuild,
  opponent: Opponent,
  kind: DamageKind,
  layers: LayerId[],
): number | null {
  if (layers.length === 0) return null;
  const evaluation = evaluateKind(build, opponent, kind);
  if (evaluation.status !== "ok") return null;
  let product = 1;
  for (const id of layers) {
    const value = layerMultiplier(evaluation, id);
    if (value === null) return null;
    product *= value;
  }
  return product;
}

// ── draft coercion (the in-progress form, stored in local settings) ──

function coerceNum(value: unknown, key: LimitKey): Num {
  return typeof value === "number" && isValidValue(key, value) ? value : null;
}

function coerceSide(raw: unknown): DefenseSide {
  const r = isRecord(raw) ? raw : {};
  return {
    equipment: coerceNum(r.equipment, "equipment"),
    percent: coerceNum(r.percent, "percent"),
    refine: coerceNum(r.refine, "refine"),
    dmgReduction: coerceNum(r.dmgReduction, "dmgReduction"),
  };
}

/** Any stored shape → a build; anything unreadable becomes blank, never 0. */
export function coerceBuild(raw: unknown): DefenseBuild {
  const r = isRecord(raw) ? raw : {};
  return {
    level: coerceNum(r.level, "level"),
    pvpReduction: coerceNum(r.pvpReduction, "pvpReduction"),
    physical: coerceSide(r.physical),
    magic: coerceSide(r.magic),
  };
}

function coerceAttack(raw: unknown) {
  const r = isRecord(raw) ? raw : {};
  return {
    flatIgnore: coerceNum(r.flatIgnore, "flatIgnore"),
    ignorePercent: coerceNum(r.ignorePercent, "ignorePercent"),
    dmgBonus: coerceNum(r.dmgBonus, "dmgBonus"),
  };
}

export function coerceOpponent(raw: unknown): Opponent {
  const r = isRecord(raw) ? raw : {};
  return {
    pvpBonus: coerceNum(r.pvpBonus, "pvpBonus"),
    physical: coerceAttack(r.physical),
    magic: coerceAttack(r.magic),
  };
}

export function hasAnyOpponentValue(opponent: Opponent): boolean {
  return [
    opponent.pvpBonus,
    ...DAMAGE_KINDS.flatMap((kind) => Object.values(opponent[kind])),
  ].some((value) => value !== null);
}
