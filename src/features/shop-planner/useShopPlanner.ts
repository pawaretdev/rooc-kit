"use client";

import { useLiveQuery } from "dexie-react-hooks";
import {
  localDb,
  type GoldDiaryRecord,
  type GoldIncomeRecord,
  type ShopCategoryRecord,
  type ShopItemRecord,
} from "@/lib/local-db";

/** Sorted live list; undefined while IndexedDB is loading. */
export function useShopCategories(): ShopCategoryRecord[] | undefined {
  return useLiveQuery(
    () => localDb.shopCategories.orderBy("sortOrder").toArray(),
    [],
  );
}

/** Sorted live list; undefined while IndexedDB is loading. */
export function useShopItems(): ShopItemRecord[] | undefined {
  return useLiveQuery(() => localDb.shopItems.orderBy("sortOrder").toArray(), []);
}

/**
 * itemId → planned quantity for the given account in the CURRENT week.
 * Undefined while loading; stale-week rows are ignored by construction.
 */
export function useBuyPlan(
  accountId: string | undefined,
  weeklyKey: string,
): ReadonlyMap<string, number> | undefined {
  return useLiveQuery(async () => {
    if (!accountId) return new Map<string, number>();
    const rows = await localDb.buyPlans
      .where("accountId")
      .equals(accountId)
      .toArray();
    return new Map(
      rows
        .filter((r) => r.periodKey === weeklyKey)
        .map((r) => [r.itemId, r.quantity]),
    );
  }, [accountId, weeklyKey]);
}

/** The account's income estimate; null when none is set, undefined while loading. */
export function useGoldIncome(
  accountId: string | undefined,
): GoldIncomeRecord | null | undefined {
  return useLiveQuery(async () => {
    if (!accountId) return null;
    return (await localDb.goldIncomes.get(accountId)) ?? null;
  }, [accountId]);
}

/** All diary entries for the account; undefined while loading. */
export function useGoldDiary(
  accountId: string | undefined,
): GoldDiaryRecord[] | undefined {
  return useLiveQuery(async () => {
    if (!accountId) return [];
    return localDb.goldDiary.where("accountId").equals(accountId).toArray();
  }, [accountId]);
}

/** templateId → local item id for everything already adopted. */
export function useAdoptedShopTemplates():
  | ReadonlyMap<string, string>
  | undefined {
  return useLiveQuery(async () => {
    const items = await localDb.shopItems.toArray();
    return new Map(
      items.flatMap((item) =>
        item.templateId ? [[item.templateId, item.id] as const] : [],
      ),
    );
  }, []);
}
