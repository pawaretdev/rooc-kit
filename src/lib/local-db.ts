import Dexie, { type EntityTable, type Table } from "dexie";

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

export type Cadence = "daily" | "weekly";

/** A game ID/character the user plays — Dailies check-offs are kept per account. */
export interface GameAccountRecord {
  id: string;
  name: string;
  sortOrder: number;
  createdAt: string;
}

/** One checklist activity, shared across all accounts. */
export interface DailyTaskRecord {
  id: string;
  name: string;
  cadence: Cadence;
  sortOrder: number;
  /** Set when adopted from an admin template — later template edits never touch this copy. */
  templateId?: string;
  /**
   * Daily tasks only: id of a weekly task that caps this one — once that
   * weekly is checked, this daily is skippable for the rest of the week
   * (e.g. a weekly quest completed through daily runs).
   */
  linkedWeeklyId?: string;
  /** Rounds per period (absent = 1). >1 renders as a counter instead of a checkbox. */
  targetCount?: number;
  /**
   * Special-event window (daily tasks): shown on the checklist only from
   * eventStart to eventEnd (game dates, "YYYY-MM-DD"); the last day gets a
   * warning indicator.
   */
  eventStart?: string;
  eventEnd?: string;
  /** in-game event art id from TASK_ICONS (task-icons.ts); absent = none */
  icon?: string;
  createdAt: string;
  updatedAt: string;
}

/** Check-off for (account, task) within one reset period; stale periods simply stop counting. */
export interface TaskCompletionRecord {
  accountId: string;
  taskId: string;
  periodKey: string;
  /** rounds done this period (absent = 1); the task is complete at targetCount */
  count?: number;
  completedAt: string;
}

/** Gold Shop category — shared across accounts, user-editable (e.g. Growth, Kafra Shop). */
export interface ShopCategoryRecord {
  id: string;
  name: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

/** One item sold in the weekly Gold Shop — shared across accounts. */
export interface ShopItemRecord {
  id: string;
  name: string;
  categoryId: string;
  /** units offered per week; absent = Unlimited */
  stock?: number;
  /** gold per unit */
  price: number;
  /** in-game art id from ITEM_ICONS (item-icons.ts); absent = generic tile */
  icon?: string;
  /** rarity frame id from ITEM_FRAMES (item-frames.ts); absent = plain tile */
  frame?: string;
  sortOrder: number;
  /** Set when adopted from an admin template — later template edits never touch this copy. */
  templateId?: string;
  createdAt: string;
  updatedAt: string;
}

/** "Buy N of this item this week" — per account, per weekly period; stale weeks stop counting. */
export interface BuyPlanRecord {
  accountId: string;
  itemId: string;
  periodKey: string;
  /** >= 1 — a quantity of 0 deletes the row */
  quantity: number;
  updatedAt: string;
}

/** Average gold income estimate per account — a table (not a setting) because it syncs. */
export interface GoldIncomeRecord {
  accountId: string;
  amount: number;
  per: "day" | "week";
  updatedAt: string;
}

/** Gold received on one game day — permanent history, never pruned. */
export interface GoldDiaryRecord {
  accountId: string;
  /** game date "YYYY-MM-DD" (05:00 Asia/Bangkok boundary, not calendar midnight) */
  date: string;
  amount: number;
  updatedAt: string;
}

export const localDb = new Dexie("rooc-kit") as Dexie & {
  monsterLevels: EntityTable<MonsterLevelRecord, "monsterId">;
  settings: EntityTable<SettingRecord, "key">;
  gameAccounts: EntityTable<GameAccountRecord, "id">;
  dailyTasks: EntityTable<DailyTaskRecord, "id">;
  // compound PK [accountId+taskId+periodKey] — EntityTable can't express it
  taskCompletions: Table<TaskCompletionRecord, [string, string, string]>;
  shopCategories: EntityTable<ShopCategoryRecord, "id">;
  shopItems: EntityTable<ShopItemRecord, "id">;
  // compound PK [accountId+itemId+periodKey]
  buyPlans: Table<BuyPlanRecord, [string, string, string]>;
  goldIncomes: EntityTable<GoldIncomeRecord, "accountId">;
  // compound PK [accountId+date]
  goldDiary: Table<GoldDiaryRecord, [string, string]>;
};

localDb.version(1).stores({
  monsterLevels: "monsterId",
  settings: "key",
});

localDb.version(2).stores({
  monsterLevels: "monsterId",
  settings: "key",
  gameAccounts: "id, sortOrder",
  dailyTasks: "id, sortOrder, templateId",
  taskCompletions: "[accountId+taskId+periodKey], accountId, taskId",
});

localDb.version(3).stores({
  monsterLevels: "monsterId",
  settings: "key",
  gameAccounts: "id, sortOrder",
  dailyTasks: "id, sortOrder, templateId",
  taskCompletions: "[accountId+taskId+periodKey], accountId, taskId",
  shopCategories: "id, sortOrder",
  shopItems: "id, sortOrder, categoryId, templateId",
  buyPlans: "[accountId+itemId+periodKey], accountId, itemId",
  goldIncomes: "accountId",
  goldDiary: "[accountId+date], accountId",
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

export const SELECTED_ACCOUNT_KEY = "dailies.selectedAccountId";

async function nextSortOrder(
  table:
    | EntityTable<GameAccountRecord, "id">
    | EntityTable<DailyTaskRecord, "id">
    | EntityTable<ShopCategoryRecord, "id">
    | EntityTable<ShopItemRecord, "id">,
): Promise<number> {
  const rows = await table.toArray();
  return rows.reduce((max, r) => Math.max(max, r.sortOrder), -1) + 1;
}

export async function addGameAccount(name: string): Promise<string> {
  const id = crypto.randomUUID();
  await localDb.gameAccounts.add({
    id,
    name,
    sortOrder: await nextSortOrder(localDb.gameAccounts),
    createdAt: new Date().toISOString(),
  });
  return id;
}

export async function renameGameAccount(
  id: string,
  name: string,
): Promise<void> {
  await localDb.gameAccounts.update(id, { name });
}

/** Removes the account, its per-account data (check-offs, buy plans, income, diary), and the selection pointing at it. */
export async function deleteGameAccount(id: string): Promise<void> {
  await localDb.transaction(
    "rw",
    [
      localDb.gameAccounts,
      localDb.taskCompletions,
      localDb.buyPlans,
      localDb.goldIncomes,
      localDb.goldDiary,
      localDb.settings,
    ],
    async () => {
      await localDb.gameAccounts.delete(id);
      await localDb.taskCompletions.where("accountId").equals(id).delete();
      await localDb.buyPlans.where("accountId").equals(id).delete();
      await localDb.goldIncomes.delete(id);
      await localDb.goldDiary.where("accountId").equals(id).delete();
      const selected = await localDb.settings.get(SELECTED_ACCOUNT_KEY);
      if (selected?.value === id) {
        await localDb.settings.delete(SELECTED_ACCOUNT_KEY);
      }
    },
  );
}

export async function addDailyTask(input: {
  name: string;
  cadence: Cadence;
  templateId?: string;
  targetCount?: number;
  eventStart?: string;
  eventEnd?: string;
  linkedWeeklyId?: string;
  icon?: string;
}): Promise<string> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await localDb.dailyTasks.add({
    id,
    name: input.name,
    cadence: input.cadence,
    sortOrder: await nextSortOrder(localDb.dailyTasks),
    ...(input.templateId ? { templateId: input.templateId } : {}),
    ...(input.targetCount && input.targetCount > 1
      ? { targetCount: input.targetCount }
      : {}),
    ...(input.eventStart ? { eventStart: input.eventStart } : {}),
    ...(input.eventEnd ? { eventEnd: input.eventEnd } : {}),
    ...(input.linkedWeeklyId ? { linkedWeeklyId: input.linkedWeeklyId } : {}),
    ...(input.icon ? { icon: input.icon } : {}),
    createdAt: now,
    updatedAt: now,
  });
  return id;
}

export async function updateDailyTask(
  id: string,
  patch: Partial<
    Pick<
      DailyTaskRecord,
      | "name"
      | "cadence"
      | "sortOrder"
      | "linkedWeeklyId"
      | "targetCount"
      | "eventStart"
      | "eventEnd"
      | "icon"
    >
  >,
): Promise<void> {
  await localDb.transaction("rw", localDb.dailyTasks, async () => {
    if (patch.cadence === "daily") {
      // No longer weekly — dailies pointing at this task lose their cap.
      await localDb.dailyTasks
        .filter((task) => task.linkedWeeklyId === id)
        .modify({ linkedWeeklyId: undefined });
    }
    await localDb.dailyTasks.update(id, {
      ...patch,
      // A weekly task can't be capped by another weekly.
      ...(patch.cadence === "weekly" ? { linkedWeeklyId: undefined } : {}),
      updatedAt: new Date().toISOString(),
    });
  });
}

/** Removes the task, its check-off history, and any links pointing at it. */
export async function deleteDailyTask(id: string): Promise<void> {
  await localDb.transaction(
    "rw",
    [localDb.dailyTasks, localDb.taskCompletions],
    async () => {
      await localDb.dailyTasks.delete(id);
      await localDb.dailyTasks
        .filter((task) => task.linkedWeeklyId === id)
        .modify({ linkedWeeklyId: undefined });
      await localDb.taskCompletions.where("taskId").equals(id).delete();
    },
  );
}

/** Sets rounds done this period; 0 removes the row (checkbox = 0 ↔ 1). */
export async function setTaskCount(
  accountId: string,
  taskId: string,
  periodKey: string,
  count: number,
): Promise<void> {
  if (count <= 0) {
    await localDb.taskCompletions.delete([accountId, taskId, periodKey]);
    return;
  }
  await localDb.taskCompletions.put({
    accountId,
    taskId,
    periodKey,
    ...(count > 1 ? { count } : {}),
    completedAt: new Date().toISOString(),
  });
}

/** Drops completion rows from past periods — they no longer count anyway. */
export async function pruneStaleCompletions(
  currentKeys: string[],
): Promise<void> {
  const keep = new Set(currentKeys);
  await localDb.taskCompletions
    .filter((r) => !keep.has(r.periodKey))
    .delete();
}

export interface DailiesSnapshot {
  accounts: GameAccountRecord[];
  tasks: DailyTaskRecord[];
  completions: TaskCompletionRecord[];
}

/** Import = restore: replaces ALL dailies data with the snapshot's records. */
export async function replaceAllDailies(
  snapshot: DailiesSnapshot,
): Promise<void> {
  await localDb.transaction(
    "rw",
    [localDb.gameAccounts, localDb.dailyTasks, localDb.taskCompletions],
    async () => {
      await localDb.gameAccounts.clear();
      await localDb.dailyTasks.clear();
      await localDb.taskCompletions.clear();
      await localDb.gameAccounts.bulkPut(snapshot.accounts);
      await localDb.dailyTasks.bulkPut(snapshot.tasks);
      await localDb.taskCompletions.bulkPut(snapshot.completions);
    },
  );
}

/** Read all three dailies tables — the export/sync counterpart of replaceAllDailies. */
export async function readAllDailies(): Promise<DailiesSnapshot> {
  const [accounts, tasks, completions] = await Promise.all([
    localDb.gameAccounts.toArray(),
    localDb.dailyTasks.toArray(),
    localDb.taskCompletions.toArray(),
  ]);
  return { accounts, tasks, completions };
}

// --- Shop Planner (Gold Shop) ---

/**
 * Upper bound for shop quantities — stock per item and the buy quantity of
 * Unlimited items. In-game weekly limits reach the thousands (Mora Coin caps at
 * 5,000), so this only exists to keep a typo from becoming a nine-digit plan.
 */
export const MAX_PLAN_QTY = 99_999;

export async function addShopCategory(name: string): Promise<string> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await localDb.shopCategories.add({
    id,
    name,
    sortOrder: await nextSortOrder(localDb.shopCategories),
    createdAt: now,
    updatedAt: now,
  });
  return id;
}

export async function updateShopCategory(
  id: string,
  patch: Partial<Pick<ShopCategoryRecord, "name" | "sortOrder">>,
): Promise<void> {
  await localDb.shopCategories.update(id, {
    ...patch,
    updatedAt: new Date().toISOString(),
  });
}

/** Removes the category, every item in it, and those items' buy-plan rows. */
export async function deleteShopCategory(id: string): Promise<void> {
  await localDb.transaction(
    "rw",
    [localDb.shopCategories, localDb.shopItems, localDb.buyPlans],
    async () => {
      const itemIds = (
        await localDb.shopItems.where("categoryId").equals(id).toArray()
      ).map((item) => item.id);
      await localDb.shopCategories.delete(id);
      await localDb.shopItems.where("categoryId").equals(id).delete();
      if (itemIds.length > 0) {
        await localDb.buyPlans.where("itemId").anyOf(itemIds).delete();
      }
    },
  );
}

export async function addShopItem(input: {
  name: string;
  categoryId: string;
  price: number;
  stock?: number;
  icon?: string;
  frame?: string;
  templateId?: string;
}): Promise<string> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await localDb.shopItems.add({
    id,
    name: input.name,
    categoryId: input.categoryId,
    price: input.price,
    ...(input.stock !== undefined ? { stock: input.stock } : {}),
    ...(input.icon ? { icon: input.icon } : {}),
    ...(input.frame ? { frame: input.frame } : {}),
    ...(input.templateId ? { templateId: input.templateId } : {}),
    sortOrder: await nextSortOrder(localDb.shopItems),
    createdAt: now,
    updatedAt: now,
  });
  return id;
}

export async function updateShopItem(
  id: string,
  patch: Partial<
    Pick<
      ShopItemRecord,
      "name" | "categoryId" | "price" | "stock" | "icon" | "frame" | "sortOrder"
    >
  >,
): Promise<void> {
  await localDb.transaction(
    "rw",
    [localDb.shopItems, localDb.buyPlans],
    async () => {
      const stock = patch.stock;
      if (stock !== undefined) {
        // Lowered stock must drag existing plans down with it.
        await localDb.buyPlans
          .where("itemId")
          .equals(id)
          .modify((plan) => {
            if (plan.quantity > stock) plan.quantity = stock;
          });
      }
      await localDb.shopItems.update(id, {
        ...patch,
        updatedAt: new Date().toISOString(),
      });
    },
  );
}

/** Setting stock back to Unlimited — Dexie's update() can't remove a field via undefined. */
export async function clearShopItemStock(id: string): Promise<void> {
  await localDb.shopItems
    .where("id")
    .equals(id)
    .modify((item) => {
      delete item.stock;
      item.updatedAt = new Date().toISOString();
    });
}

/** null clears the icon — the record drops the key rather than storing null. */
export async function setShopItemIcon(
  id: string,
  icon: string | null,
): Promise<void> {
  await localDb.shopItems
    .where("id")
    .equals(id)
    .modify((item) => {
      if (icon) item.icon = icon;
      else delete item.icon;
      item.updatedAt = new Date().toISOString();
    });
}

/** null clears the frame — same key-dropping rule as setShopItemIcon. */
export async function setShopItemFrame(
  id: string,
  frame: string | null,
): Promise<void> {
  await localDb.shopItems
    .where("id")
    .equals(id)
    .modify((item) => {
      if (frame) item.frame = frame;
      else delete item.frame;
      item.updatedAt = new Date().toISOString();
    });
}

/**
 * Re-syncs an adopted item with its template: every field in the patch is
 * overwritten, null drops stock (→ Unlimited) or icon, and a lowered stock
 * drags existing plans down with it — one transaction per item.
 */
export async function applyShopTemplate(
  id: string,
  patch: {
    name?: string;
    categoryId?: string;
    price?: number;
    stock?: number | null;
    icon?: string | null;
    frame?: string | null;
  },
): Promise<void> {
  await localDb.transaction(
    "rw",
    [localDb.shopItems, localDb.buyPlans],
    async () => {
      const stock = patch.stock;
      if (typeof stock === "number") {
        await localDb.buyPlans
          .where("itemId")
          .equals(id)
          .modify((plan) => {
            if (plan.quantity > stock) plan.quantity = stock;
          });
      }
      await localDb.shopItems
        .where("id")
        .equals(id)
        .modify((item) => {
          if (patch.name !== undefined) item.name = patch.name;
          if (patch.categoryId !== undefined) item.categoryId = patch.categoryId;
          if (patch.price !== undefined) item.price = patch.price;
          if (patch.stock !== undefined) {
            if (patch.stock === null) delete item.stock;
            else item.stock = patch.stock;
          }
          if (patch.icon !== undefined) {
            if (patch.icon === null) delete item.icon;
            else item.icon = patch.icon;
          }
          if (patch.frame !== undefined) {
            if (patch.frame === null) delete item.frame;
            else item.frame = patch.frame;
          }
          item.updatedAt = new Date().toISOString();
        });
    },
  );
}

/** Removes the item and its buy-plan rows across all accounts and periods. */
export async function deleteShopItem(id: string): Promise<void> {
  await localDb.transaction(
    "rw",
    [localDb.shopItems, localDb.buyPlans],
    async () => {
      await localDb.shopItems.delete(id);
      await localDb.buyPlans.where("itemId").equals(id).delete();
    },
  );
}

/** Sets this week's buy quantity; 0 removes the row. Clamps to the item's stock. */
export async function setPlanQuantity(
  accountId: string,
  itemId: string,
  periodKey: string,
  quantity: number,
): Promise<void> {
  await localDb.transaction(
    "rw",
    [localDb.shopItems, localDb.buyPlans],
    async () => {
      if (quantity <= 0) {
        await localDb.buyPlans.delete([accountId, itemId, periodKey]);
        return;
      }
      const item = await localDb.shopItems.get(itemId);
      const cap = item?.stock ?? MAX_PLAN_QTY;
      await localDb.buyPlans.put({
        accountId,
        itemId,
        periodKey,
        quantity: Math.min(quantity, cap),
        updatedAt: new Date().toISOString(),
      });
    },
  );
}

export async function setGoldIncome(
  accountId: string,
  amount: number,
  per: GoldIncomeRecord["per"],
): Promise<void> {
  await localDb.goldIncomes.put({
    accountId,
    amount,
    per,
    updatedAt: new Date().toISOString(),
  });
}

export async function clearGoldIncome(accountId: string): Promise<void> {
  await localDb.goldIncomes.delete(accountId);
}

/** Records gold received on one game day; 0/negative removes the entry. */
export async function setDiaryEntry(
  accountId: string,
  date: string,
  amount: number,
): Promise<void> {
  if (amount <= 0) {
    await localDb.goldDiary.delete([accountId, date]);
    return;
  }
  await localDb.goldDiary.put({
    accountId,
    date,
    amount,
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Drops buy-plan rows outside the weeks worth keeping. Last week's rows survive
 * on purpose: a weekly shop plan repeats almost unchanged, so the previous plan
 * is the fastest way to rebuild this one. The diary is never pruned.
 */
export async function pruneStaleBuyPlans(keepKeys: string[]): Promise<void> {
  const keep = new Set(keepKeys);
  await localDb.buyPlans.filter((plan) => !keep.has(plan.periodKey)).delete();
}

/**
 * Copies one week's plan onto another (the "repeat last week" path), clamped to
 * each item's current stock and skipping items that no longer exist.
 */
export async function repeatBuyPlan(
  accountId: string,
  fromPeriodKey: string,
  toPeriodKey: string,
): Promise<void> {
  await localDb.transaction(
    "rw",
    [localDb.shopItems, localDb.buyPlans],
    async () => {
      const source = (
        await localDb.buyPlans.where("accountId").equals(accountId).toArray()
      ).filter((plan) => plan.periodKey === fromPeriodKey);
      if (source.length === 0) return;
      const items = new Map(
        (await localDb.shopItems.toArray()).map((item) => [item.id, item]),
      );
      const now = new Date().toISOString();
      const rows: BuyPlanRecord[] = [];
      for (const plan of source) {
        const item = items.get(plan.itemId);
        if (!item) continue;
        const quantity = Math.min(plan.quantity, item.stock ?? MAX_PLAN_QTY);
        if (quantity < 1) continue;
        rows.push({
          accountId,
          itemId: plan.itemId,
          periodKey: toPeriodKey,
          quantity,
          updatedAt: now,
        });
      }
      await localDb.buyPlans.bulkPut(rows);
    },
  );
}

export interface GoldShopSnapshot {
  categories: ShopCategoryRecord[];
  items: ShopItemRecord[];
  plans: BuyPlanRecord[];
  incomes: GoldIncomeRecord[];
  diary: GoldDiaryRecord[];
}

/** Import = restore: replaces ALL Shop Planner data with the snapshot's records. */
export async function replaceAllGoldShop(
  snapshot: GoldShopSnapshot,
): Promise<void> {
  await localDb.transaction(
    "rw",
    [
      localDb.shopCategories,
      localDb.shopItems,
      localDb.buyPlans,
      localDb.goldIncomes,
      localDb.goldDiary,
    ],
    async () => {
      await localDb.shopCategories.clear();
      await localDb.shopItems.clear();
      await localDb.buyPlans.clear();
      await localDb.goldIncomes.clear();
      await localDb.goldDiary.clear();
      await localDb.shopCategories.bulkPut(snapshot.categories);
      await localDb.shopItems.bulkPut(snapshot.items);
      await localDb.buyPlans.bulkPut(snapshot.plans);
      await localDb.goldIncomes.bulkPut(snapshot.incomes);
      await localDb.goldDiary.bulkPut(snapshot.diary);
    },
  );
}

/** Read all five Shop Planner tables — the sync counterpart of replaceAllGoldShop. */
export async function readAllGoldShop(): Promise<GoldShopSnapshot> {
  const [categories, items, plans, incomes, diary] = await Promise.all([
    localDb.shopCategories.toArray(),
    localDb.shopItems.toArray(),
    localDb.buyPlans.toArray(),
    localDb.goldIncomes.toArray(),
    localDb.goldDiary.toArray(),
  ]);
  return { categories, items, plans, incomes, diary };
}
