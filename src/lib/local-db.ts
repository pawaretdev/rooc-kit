import Dexie, { type EntityTable } from "dexie";

/**
 * User progress lives here (IndexedDB) — never in the static game data and
 * never uploaded unless the user signs in and syncs. Levels are 0–10;
 * `source` follows the README data-entry spec: Quick mode writes `estimated`,
 * individually entered/corrected levels are `confirmed`.
 */

export interface MonsterLevelRecord {
  monsterId: string;
  level: number;
  source: "estimated" | "confirmed";
  updatedAt: string;
}

export interface SettingRecord {
  key: string;
  value: unknown;
}

export const localDb = new Dexie("rooc-kit") as Dexie & {
  monsterLevels: EntityTable<MonsterLevelRecord, "monsterId">;
  settings: EntityTable<SettingRecord, "key">;
};

localDb.version(1).stores({
  monsterLevels: "monsterId",
  settings: "key",
});

export const MAX_MR_LEVEL = 10;

export function clampLevel(level: number): number {
  return Math.max(0, Math.min(MAX_MR_LEVEL, Math.round(level)));
}

export async function setMonsterLevel(
  monsterId: string,
  level: number,
  source: MonsterLevelRecord["source"],
): Promise<void> {
  await localDb.monsterLevels.put({
    monsterId,
    level: clampLevel(level),
    source,
    updatedAt: new Date().toISOString(),
  });
}

/** Quick mode / "fill row with level X" — one write per monster, marked estimated. */
export async function fillMonsterLevels(
  monsterIds: string[],
  level: number,
  source: MonsterLevelRecord["source"] = "estimated",
): Promise<void> {
  const updatedAt = new Date().toISOString();
  await localDb.monsterLevels.bulkPut(
    monsterIds.map((monsterId) => ({
      monsterId,
      level: clampLevel(level),
      source,
      updatedAt,
    })),
  );
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  await localDb.settings.put({ key, value });
}

/** Import = restore: replaces ALL current progress with the file's records. */
export async function replaceAllLevels(
  records: MonsterLevelRecord[],
): Promise<void> {
  await localDb.transaction("rw", localDb.monsterLevels, async () => {
    await localDb.monsterLevels.clear();
    await localDb.monsterLevels.bulkPut(records);
  });
}
