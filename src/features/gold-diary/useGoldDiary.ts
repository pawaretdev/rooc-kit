"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { localDb, type GoldDiaryRecord } from "@/lib/local-db";

const EMPTY = new Map<string, GoldDiaryRecord[]>();

/**
 * Every account's diary at once — accountId → entries. The dailies page shows
 * all IDs side by side in its multi-account layouts, so one query beats one
 * per account. Undefined while IndexedDB is loading.
 */
export function useGoldDiaryByAccount():
  | ReadonlyMap<string, GoldDiaryRecord[]>
  | undefined {
  return useLiveQuery(async () => {
    const all = await localDb.goldDiary.toArray();
    if (all.length === 0) return EMPTY;
    const byAccount = new Map<string, GoldDiaryRecord[]>();
    for (const entry of all) {
      const list = byAccount.get(entry.accountId);
      if (list) list.push(entry);
      else byAccount.set(entry.accountId, [entry]);
    }
    return byAccount;
  }, []);
}
