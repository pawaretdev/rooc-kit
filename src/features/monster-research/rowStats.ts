import {
  getMonster,
  mapsWithMini,
  mapsWithMvp,
  rows,
  type ResearchRow,
} from "@/lib/game-data";
import type { MonsterLevelRecord } from "@/lib/local-db";
import { MAX_MR_LEVEL } from "@/lib/local-db";

/** Monsters without a record default to level 0 (nothing researched yet). */
export const DEFAULT_LEVEL = 0;

/** A research row holds 5 monsters; with fewer known, the game grants no row level. */
export const ROW_SIZE = 5;

export interface RowView {
  row: ResearchRow;
  /** false when the row has fewer than ROW_SIZE monsters — no row level exists,
   * so blockers / best-trip / completed don't apply either */
  hasRowLevel: boolean;
  /** min monster level in the row — the row's level per game rules
   * (meaningless when hasRowLevel is false) */
  rowLevel: number;
  /** monster ids sitting at rowLevel — they hold the row back */
  blockerIds: string[];
  blockerCount: number;
  /**
   * Largest number of blockers sharing one map (mini set-cover per
   * PROPOSALS §5) — "one trip to bestMapId advances this many".
   */
  maxSameMapBlockers: number;
  bestMapId: string | null;
  /** the best-trip map spawns an MVP / a Mini */
  hasMvp: boolean;
  hasMini: boolean;
  /** row fully at level 10 — nothing left to farm */
  completed: boolean;
  /** set by buildRowViews when a soft filter demoted this row */
  demoted: boolean;
  /** every map the blockers spawn on is user-excluded — no trip can advance this row */
  allMapsExcluded: boolean;
}

export function levelOf(
  monsterId: string,
  levels: ReadonlyMap<string, MonsterLevelRecord>,
): number {
  return levels.get(monsterId)?.level ?? DEFAULT_LEVEL;
}

export function buildRowView(
  row: ResearchRow,
  levels: ReadonlyMap<string, MonsterLevelRecord>,
  excludedMapIds?: ReadonlySet<string>,
): RowView {
  const hasRowLevel = row.monsterIds.length >= ROW_SIZE;
  let rowLevel = Infinity;
  for (const id of row.monsterIds) {
    rowLevel = Math.min(rowLevel, levelOf(id, levels));
  }
  if (!Number.isFinite(rowLevel)) rowLevel = DEFAULT_LEVEL;
  // no row level → no blockers holding it back, nothing to plan a trip around
  const blockerIds = hasRowLevel
    ? row.monsterIds.filter((id) => levelOf(id, levels) === rowLevel)
    : [];

  const coverage = new Map<string, number>();
  let anyMapExcluded = false;
  for (const id of blockerIds) {
    for (const mapId of getMonster(id).mapIds) {
      if (excludedMapIds?.has(mapId)) {
        anyMapExcluded = true;
        continue;
      }
      coverage.set(mapId, (coverage.get(mapId) ?? 0) + 1);
    }
  }
  let bestMapId: string | null = null;
  let maxSameMapBlockers = 0;
  for (const [mapId, count] of coverage) {
    if (count > maxSameMapBlockers) {
      maxSameMapBlockers = count;
      bestMapId = mapId;
    }
  }

  return {
    row,
    hasRowLevel,
    rowLevel,
    blockerIds,
    blockerCount: blockerIds.length,
    maxSameMapBlockers,
    bestMapId,
    hasMvp: bestMapId !== null && mapsWithMvp.has(bestMapId),
    hasMini: bestMapId !== null && mapsWithMini.has(bestMapId),
    completed: hasRowLevel && rowLevel >= MAX_MR_LEVEL,
    demoted: false,
    allMapsExcluded: anyMapExcluded && coverage.size === 0,
  };
}

export type RowSort =
  | "rowOrder"
  | "rowLevelAsc"
  | "rowLevelDesc"
  | "fewestBlockers"
  | "smartPriority";

function compareViews(a: RowView, b: RowView, sort: RowSort): number {
  switch (sort) {
    case "rowOrder":
      // the game's own listing — rows[] is already canonical, stable sort keeps it
      return 0;
    case "rowLevelAsc":
      return a.rowLevel - b.rowLevel;
    case "rowLevelDesc":
      return b.rowLevel - a.rowLevel;
    case "fewestBlockers":
      return a.blockerCount - b.blockerCount || a.rowLevel - b.rowLevel;
    case "smartPriority":
      // completed rows have nothing left to farm — sink them regardless of stats
      return (
        Number(a.completed) - Number(b.completed) ||
        a.blockerCount - b.blockerCount ||
        b.maxSameMapBlockers - a.maxSameMapBlockers ||
        a.rowLevel - b.rowLevel
      );
  }
}

export interface RowViewOptions {
  element?: ResearchRow["elementId"];
  sort: RowSort;
  /** hide/demote rows whose best-trip map spawns an MVP / a Mini */
  noMvp?: boolean;
  noMini?: boolean;
  /** hide/demote rows with fewer than ROW_SIZE monsters — they have no row level */
  noIncomplete?: boolean;
  /** maps the user never wants to farm — removed from best-trip planning; rows
   * that can only advance on these maps fail the filter */
  excludedMapIds?: ReadonlySet<string>;
  /** what to do with rows that fail a filter (spec: per-filter hard/soft toggle) */
  filterBehavior?: "hide" | "demote";
}

export function buildRowViews(
  levels: ReadonlyMap<string, MonsterLevelRecord>,
  options: RowViewOptions,
): RowView[] {
  let views = rows
    .filter((r) => !options.element || r.elementId === options.element)
    .map((r) => buildRowView(r, levels, options.excludedMapIds));

  const fails = (v: RowView) =>
    Boolean(
      (options.noMvp && v.hasMvp) ||
        (options.noMini && v.hasMini) ||
        (options.noIncomplete && !v.hasRowLevel) ||
        v.allMapsExcluded,
    );

  if (
    options.noMvp ||
    options.noMini ||
    options.noIncomplete ||
    options.excludedMapIds?.size
  ) {
    if (options.filterBehavior === "demote") {
      views = views.map((v) => (fails(v) ? { ...v, demoted: true } : v));
    } else {
      views = views.filter((v) => !fails(v));
    }
  }

  // rows[] is in canonical element/row order, so equal keys keep it (stable sort);
  // level-less rows (fewer than ROW_SIZE monsters) sink below rows that can
  // progress — except in rowOrder, which mirrors the game's listing as-is —
  // and demoted rows keep their relative order below everything.
  const sinkLevelless = options.sort !== "rowOrder";
  views.sort(
    (a, b) =>
      Number(a.demoted) - Number(b.demoted) ||
      (sinkLevelless
        ? Number(!a.hasRowLevel) - Number(!b.hasRowLevel)
        : 0) ||
      compareViews(a, b, options.sort),
  );
  return views;
}
