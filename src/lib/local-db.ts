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

export const localDb = new Dexie("rooc-kit") as Dexie & {
  monsterLevels: EntityTable<MonsterLevelRecord, "monsterId">;
  settings: EntityTable<SettingRecord, "key">;
  gameAccounts: EntityTable<GameAccountRecord, "id">;
  dailyTasks: EntityTable<DailyTaskRecord, "id">;
  // compound PK [accountId+taskId+periodKey] — EntityTable can't express it
  taskCompletions: Table<TaskCompletionRecord, [string, string, string]>;
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
  table: EntityTable<GameAccountRecord, "id"> | EntityTable<DailyTaskRecord, "id">,
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

/** Removes the account, its check-off history, and the selection pointing at it. */
export async function deleteGameAccount(id: string): Promise<void> {
  await localDb.transaction(
    "rw",
    [localDb.gameAccounts, localDb.taskCompletions, localDb.settings],
    async () => {
      await localDb.gameAccounts.delete(id);
      await localDb.taskCompletions.where("accountId").equals(id).delete();
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
