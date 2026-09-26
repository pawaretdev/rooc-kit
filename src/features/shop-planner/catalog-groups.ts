import type { ShopCategoryRecord, ShopItemRecord } from "@/lib/local-db";
import {
  currentLocalDateTime,
  isWithinEventWindow,
} from "@/features/dailies/period";

/** One block of the catalog editor: a category and the items filed under it. */
export interface CatalogGroup {
  /** null = items whose category no longer exists (see groupItemsByCategory) */
  category: ShopCategoryRecord | null;
  items: ShopItemRecord[];
}

/**
 * Buckets items under their category, categories in their own order, each
 * bucket in the items' sortOrder — the same relative order the player page
 * shows, since it filters the global list per category without re-sorting.
 * Categories with no items are skipped (the Categories dialog already lists
 * them with counts). Items whose category is gone — deleteShopCategory removes
 * its items, but a cloud merge can still leave strays — collect in a trailing
 * null group so they stay reachable instead of silently vanishing.
 */
export function groupItemsByCategory(
  categories: ShopCategoryRecord[],
  items: ShopItemRecord[],
): CatalogGroup[] {
  const bySortOrder = (a: { sortOrder: number }, b: { sortOrder: number }) =>
    a.sortOrder - b.sortOrder;
  const buckets = new Map<string, ShopItemRecord[]>();
  for (const item of [...items].sort(bySortOrder)) {
    const bucket = buckets.get(item.categoryId);
    if (bucket) bucket.push(item);
    else buckets.set(item.categoryId, [item]);
  }

  const groups: CatalogGroup[] = [];
  for (const category of [...categories].sort(bySortOrder)) {
    const bucket = buckets.get(category.id);
    if (!bucket) continue;
    groups.push({ category, items: bucket });
    buckets.delete(category.id);
  }
  const orphans = [...buckets.values()].flat().sort(bySortOrder);
  if (orphans.length > 0) groups.push({ category: null, items: orphans });
  return groups;
}

/**
 * sortOrder patches that lay `nextIds` (one group's ids in their dropped
 * order) over the slots those same rows already occupy. Reordering inside a
 * category therefore never touches rows in other categories, and the global
 * sequence keeps whatever gaps it had. Ids not in the group are ignored.
 */
export function reorderWithinGroup(
  groupItems: ShopItemRecord[],
  nextIds: string[],
): { id: string; sortOrder: number }[] {
  const slots = groupItems.map((item) => item.sortOrder).sort((a, b) => a - b);
  const byId = new Map(groupItems.map((item) => [item.id, item]));
  const patches: { id: string; sortOrder: number }[] = [];
  let index = 0;
  for (const id of nextIds) {
    const item = byId.get(id);
    if (!item) continue;
    const slot = slots[index++];
    if (slot !== undefined && slot !== item.sortOrder) {
      patches.push({ id, sortOrder: slot });
    }
  }
  return patches;
}

/**
 * sortOrder patches that move one category a step earlier (-1) or later (+1)
 * in the strip, renumbering the whole run 0..n-1 so imported data with
 * duplicate or gappy slots settles too. Nothing to do at either edge.
 */
export function moveCategory(
  categories: ShopCategoryRecord[],
  id: string,
  delta: -1 | 1,
): { id: string; sortOrder: number }[] {
  const sorted = [...categories].sort((a, b) => a.sortOrder - b.sortOrder);
  const index = sorted.findIndex((category) => category.id === id);
  const target = index + delta;
  if (index < 0 || target < 0 || target >= sorted.length) return [];
  [sorted[index], sorted[target]] = [sorted[target], sorted[index]];
  return sorted.flatMap((category, slot) =>
    category.sortOrder === slot ? [] : [{ id: category.id, sortOrder: slot }],
  );
}

/**
 * The catalog as the planner shows it: categories still on sale and their
 * items. A category past its eventEnd (Bangkok wall clock, see period.ts)
 * drops out along with its items, so its cards, tabs, totals and last-week
 * offer all disappear together; the editor keeps listing it.
 */
export function openCatalog(
  categories: ShopCategoryRecord[],
  items: ShopItemRecord[],
  nowLocal: string = currentLocalDateTime(),
): { categories: ShopCategoryRecord[]; items: ShopItemRecord[] } {
  const open = categories.filter((category) =>
    isWithinEventWindow({ eventEnd: category.eventEnd }, nowLocal),
  );
  const openIds = new Set(open.map((category) => category.id));
  return {
    categories: open,
    items: items.filter((item) => openIds.has(item.categoryId)),
  };
}
