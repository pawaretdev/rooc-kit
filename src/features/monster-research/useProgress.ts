"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { localDb, type MonsterLevelRecord } from "@/lib/local-db";

const EMPTY_LEVELS = new Map<string, MonsterLevelRecord>();

/** Live map of monsterId → level record; undefined while IndexedDB is loading. */
export function useMonsterLevels():
  | ReadonlyMap<string, MonsterLevelRecord>
  | undefined {
  return useLiveQuery(async () => {
    const all = await localDb.monsterLevels.toArray();
    if (all.length === 0) return EMPTY_LEVELS;
    return new Map(all.map((r) => [r.monsterId, r]));
  }, []);
}

/** Live setting value with fallback; writes go through setSetting(). */
export function useSetting<T>(key: string, fallback: T): T {
  const record = useLiveQuery(() => localDb.settings.get(key), [key]);
  return record === undefined || record.value === undefined
    ? fallback
    : (record.value as T);
}
