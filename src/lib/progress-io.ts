import type { MonsterLevelRecord } from "./local-db";
import { MAX_MR_LEVEL } from "./local-db";

/**
 * Backup / device-transfer format (README: Data Entry). This is also the
 * planned payload for account sync — keep the two in lockstep so sync stays
 * "upload this same JSON".
 */
export interface ProgressExport {
  app: "rooc-kit";
  kind: "progress";
  version: 1;
  /** static-data version the export was made against (meta.json) */
  dataVersion: number;
  exportedAt: string;
  levels: MonsterLevelRecord[];
}

export function buildProgressExport(
  levels: MonsterLevelRecord[],
  dataVersion: number,
): ProgressExport {
  return {
    app: "rooc-kit",
    kind: "progress",
    version: 1,
    dataVersion,
    exportedAt: new Date().toISOString(),
    levels,
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
  return {
    app: "rooc-kit",
    kind: "progress",
    version: 1,
    dataVersion: typeof doc.dataVersion === "number" ? doc.dataVersion : 0,
    exportedAt: typeof doc.exportedAt === "string" ? doc.exportedAt : "",
    levels: doc.levels,
  };
}
