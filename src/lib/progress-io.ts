import type {
  DailiesSnapshot,
  GoldShopSnapshot,
  MonsterLevelRecord,
} from "./local-db";
import { MAX_MR_LEVEL } from "./local-db";
import { PERIOD_KEY_PATTERN } from "@/features/dailies/period";

/**
 * Backup / device-transfer format (README: Data Entry). This is also the
 * payload for account sync — keep the two in lockstep so sync stays
 * "upload this same JSON".
 *
 * `dailies` and `goldShop` travel ONLY on the cloud-sync path: file export
 * never includes them and file import ignores them (product decision — that
 * data is per-browser + Postgres, not part of backup files).
 */
export interface ProgressExport {
  app: "rooc-kit";
  kind: "progress";
  version: 1;
  /** static-data version the export was made against (meta.json) */
  dataVersion: number;
  exportedAt: string;
  levels: MonsterLevelRecord[];
  dailies?: DailiesSnapshot;
  goldShop?: GoldShopSnapshot;
}

export function buildProgressExport(
  levels: MonsterLevelRecord[],
  dataVersion: number,
  dailies?: DailiesSnapshot,
  goldShop?: GoldShopSnapshot,
): ProgressExport {
  return {
    app: "rooc-kit",
    kind: "progress",
    version: 1,
    dataVersion,
    exportedAt: new Date().toISOString(),
    levels,
    ...(dailies ? { dailies } : {}),
    ...(goldShop ? { goldShop } : {}),
  };
}

function isLevelRecord(value: unknown): value is MonsterLevelRecord {
  if (typeof value !== "object" || value === null) return false;
  const r = value as Record<string, unknown>;
  return (
    typeof r.monsterId === "string" &&
    r.monsterId.length > 0 &&
    typeof r.level === "number" &&
    Number.isInteger(r.level) &&
    r.level >= 0 &&
    r.level <= MAX_MR_LEVEL &&
    (r.source === "estimated" || r.source === "confirmed") &&
    typeof r.updatedAt === "string"
  );
}

/** date-only (legacy) or date-time event bound */
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/;

function isGameAccount(value: unknown): boolean {
  if (typeof value !== "object" || value === null) return false;
  const r = value as Record<string, unknown>;
  return (
    typeof r.id === "string" &&
    r.id.length > 0 &&
    typeof r.name === "string" &&
    typeof r.sortOrder === "number" &&
    Number.isFinite(r.sortOrder) &&
    typeof r.createdAt === "string"
  );
}

function isDailyTask(value: unknown): boolean {
  if (typeof value !== "object" || value === null) return false;
  const r = value as Record<string, unknown>;
  return (
    typeof r.id === "string" &&
    r.id.length > 0 &&
    typeof r.name === "string" &&
    (r.cadence === "daily" || r.cadence === "weekly") &&
    typeof r.sortOrder === "number" &&
    Number.isFinite(r.sortOrder) &&
    (r.templateId === undefined || typeof r.templateId === "string") &&
    (r.linkedWeeklyId === undefined || typeof r.linkedWeeklyId === "string") &&
    (r.targetCount === undefined ||
      (typeof r.targetCount === "number" &&
        Number.isInteger(r.targetCount) &&
        r.targetCount >= 1)) &&
    (r.eventStart === undefined ||
      (typeof r.eventStart === "string" && DATE_PATTERN.test(r.eventStart))) &&
    (r.eventEnd === undefined ||
      (typeof r.eventEnd === "string" && DATE_PATTERN.test(r.eventEnd))) &&
    typeof r.createdAt === "string" &&
    typeof r.updatedAt === "string"
  );
}

function isTaskCompletion(value: unknown): boolean {
  if (typeof value !== "object" || value === null) return false;
  const r = value as Record<string, unknown>;
  return (
    typeof r.accountId === "string" &&
    r.accountId.length > 0 &&
    typeof r.taskId === "string" &&
    r.taskId.length > 0 &&
    typeof r.periodKey === "string" &&
    PERIOD_KEY_PATTERN.test(r.periodKey) &&
    (r.count === undefined ||
      (typeof r.count === "number" &&
        Number.isInteger(r.count) &&
        r.count >= 1)) &&
    typeof r.completedAt === "string"
  );
}

function isDailiesSnapshot(value: unknown): value is DailiesSnapshot {
  if (typeof value !== "object" || value === null) return false;
  const r = value as Record<string, unknown>;
  return (
    Array.isArray(r.accounts) &&
    r.accounts.every(isGameAccount) &&
    Array.isArray(r.tasks) &&
    r.tasks.every(isDailyTask) &&
    Array.isArray(r.completions) &&
    r.completions.every(isTaskCompletion)
  );
}

const GAME_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isShopCategory(value: unknown): boolean {
  if (typeof value !== "object" || value === null) return false;
  const r = value as Record<string, unknown>;
  return (
    typeof r.id === "string" &&
    r.id.length > 0 &&
    typeof r.name === "string" &&
    typeof r.sortOrder === "number" &&
    Number.isFinite(r.sortOrder) &&
    typeof r.createdAt === "string" &&
    typeof r.updatedAt === "string"
  );
}

function isShopItem(value: unknown): boolean {
  if (typeof value !== "object" || value === null) return false;
  const r = value as Record<string, unknown>;
  return (
    typeof r.id === "string" &&
    r.id.length > 0 &&
    typeof r.name === "string" &&
    typeof r.categoryId === "string" &&
    r.categoryId.length > 0 &&
    (r.stock === undefined ||
      (typeof r.stock === "number" &&
        Number.isInteger(r.stock) &&
        r.stock >= 1)) &&
    typeof r.price === "number" &&
    Number.isFinite(r.price) &&
    r.price >= 0 &&
    typeof r.sortOrder === "number" &&
    Number.isFinite(r.sortOrder) &&
    (r.templateId === undefined || typeof r.templateId === "string") &&
    (r.icon === undefined || typeof r.icon === "string") &&
    typeof r.createdAt === "string" &&
    typeof r.updatedAt === "string"
  );
}

function isBuyPlan(value: unknown): boolean {
  if (typeof value !== "object" || value === null) return false;
  const r = value as Record<string, unknown>;
  return (
    typeof r.accountId === "string" &&
    r.accountId.length > 0 &&
    typeof r.itemId === "string" &&
    r.itemId.length > 0 &&
    typeof r.periodKey === "string" &&
    PERIOD_KEY_PATTERN.test(r.periodKey) &&
    r.periodKey.startsWith("w:") &&
    typeof r.quantity === "number" &&
    Number.isInteger(r.quantity) &&
    r.quantity >= 1 &&
    typeof r.updatedAt === "string"
  );
}

function isGoldIncome(value: unknown): boolean {
  if (typeof value !== "object" || value === null) return false;
  const r = value as Record<string, unknown>;
  return (
    typeof r.accountId === "string" &&
    r.accountId.length > 0 &&
    typeof r.amount === "number" &&
    Number.isFinite(r.amount) &&
    r.amount > 0 &&
    (r.per === "day" || r.per === "week") &&
    typeof r.updatedAt === "string"
  );
}

function isGoldDiaryEntry(value: unknown): boolean {
  if (typeof value !== "object" || value === null) return false;
  const r = value as Record<string, unknown>;
  return (
    typeof r.accountId === "string" &&
    r.accountId.length > 0 &&
    typeof r.date === "string" &&
    GAME_DATE_PATTERN.test(r.date) &&
    typeof r.amount === "number" &&
    Number.isFinite(r.amount) &&
    r.amount > 0 &&
    typeof r.updatedAt === "string"
  );
}

function isGoldShopSnapshot(value: unknown): value is GoldShopSnapshot {
  if (typeof value !== "object" || value === null) return false;
  const r = value as Record<string, unknown>;
  return (
    Array.isArray(r.categories) &&
    r.categories.every(isShopCategory) &&
    Array.isArray(r.items) &&
    r.items.every(isShopItem) &&
    Array.isArray(r.plans) &&
    r.plans.every(isBuyPlan) &&
    Array.isArray(r.incomes) &&
    r.incomes.every(isGoldIncome) &&
    Array.isArray(r.diary) &&
    r.diary.every(isGoldDiaryEntry)
  );
}

/** Throws with a short reason when the file is not a valid progress export. */
export function parseProgressExport(text: string): ProgressExport {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error("not JSON");
  }
  if (typeof raw !== "object" || raw === null) throw new Error("not an object");
  const doc = raw as Record<string, unknown>;
  if (doc.app !== "rooc-kit" || doc.kind !== "progress") {
    throw new Error("not a rooc-kit progress export");
  }
  if (doc.version !== 1) throw new Error(`unsupported version ${doc.version}`);
  if (!Array.isArray(doc.levels) || !doc.levels.every(isLevelRecord)) {
    throw new Error("invalid levels payload");
  }
  if (doc.dailies !== undefined && !isDailiesSnapshot(doc.dailies)) {
    throw new Error("invalid dailies payload");
  }
  if (doc.goldShop !== undefined && !isGoldShopSnapshot(doc.goldShop)) {
    throw new Error("invalid goldShop payload");
  }
  return {
    app: "rooc-kit",
    kind: "progress",
    version: 1,
    dataVersion: typeof doc.dataVersion === "number" ? doc.dataVersion : 0,
    exportedAt: typeof doc.exportedAt === "string" ? doc.exportedAt : "",
    levels: doc.levels,
    ...(doc.dailies !== undefined ? { dailies: doc.dailies } : {}),
    ...(doc.goldShop !== undefined ? { goldShop: doc.goldShop } : {}),
  };
}
