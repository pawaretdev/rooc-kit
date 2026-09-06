import { eq } from "drizzle-orm";
import { requireSuperAdmin } from "@/lib/admin-api";
import { db } from "@/lib/db/client";
import { taskTemplates } from "@/lib/db/schema";
import { isTaskIconId } from "@/lib/task-icons";

const MAX_NAME_LENGTH = 100;
const MAX_ROUNDS = 99;
/** date-only (legacy) or date-time event bound */
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/;

type TemplatePatch = Partial<{
  name: string;
  cadence: "daily" | "weekly";
  targetCount: number;
  sortOrder: number;
  published: boolean;
  /** null clears the event window */
  eventStart: string | null;
  eventEnd: string | null;
  /** null unlinks */
  linkedTemplateId: string | null;
  /** null = no icon */
  icon: string | null;
}>;

/** Partial update — only whitelisted fields, null when anything is malformed. */
function parseTemplatePatch(raw: unknown): TemplatePatch | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const patch: TemplatePatch = {};
  if (r.name !== undefined) {
    if (
      typeof r.name !== "string" ||
      r.name.trim().length === 0 ||
      r.name.trim().length > MAX_NAME_LENGTH
    ) {
      return null;
    }
    patch.name = r.name.trim();
  }
  if (r.cadence !== undefined) {
    if (r.cadence !== "daily" && r.cadence !== "weekly") return null;
    patch.cadence = r.cadence;
  }
  if (r.targetCount !== undefined) {
    if (
      typeof r.targetCount !== "number" ||
      !Number.isInteger(r.targetCount) ||
      r.targetCount < 1 ||
      r.targetCount > MAX_ROUNDS
    ) {
      return null;
    }
    patch.targetCount = r.targetCount;
  }
  if (r.sortOrder !== undefined) {
    if (typeof r.sortOrder !== "number" || !Number.isFinite(r.sortOrder)) {
      return null;
    }
    patch.sortOrder = r.sortOrder;
  }
  if (r.published !== undefined) {
    if (typeof r.published !== "boolean") return null;
    patch.published = r.published;
  }
  for (const key of ["eventStart", "eventEnd"] as const) {
    const value = r[key];
    if (value === undefined) continue;
    if (value !== null && (typeof value !== "string" || !DATE_PATTERN.test(value))) {
      return null;
    }
    patch[key] = value as string | null;
  }
  if (r.linkedTemplateId !== undefined) {
    if (r.linkedTemplateId !== null && typeof r.linkedTemplateId !== "string") {
      return null;
    }
    patch.linkedTemplateId = r.linkedTemplateId;
  }
  if (r.icon !== undefined) {
    if (r.icon !== null && !isTaskIconId(r.icon)) return null;
    patch.icon = r.icon;
  }
  if (Object.keys(patch).length === 0) return null;
  return patch;
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireSuperAdmin();
  if (!gate.ok) return gate.response;

  let patch;
  try {
    patch = parseTemplatePatch(await req.json());
  } catch {
    patch = null;
  }
  if (!patch) {
    return Response.json({ error: "invalid template payload" }, { status: 400 });
  }

  const { id } = await params;
  const [row] = await db
    .update(taskTemplates)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(taskTemplates.id, id))
    .returning();
  if (!row) {
    return Response.json({ error: "not found" }, { status: 404 });
  }
  return Response.json({ template: row });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireSuperAdmin();
  if (!gate.ok) return gate.response;

  const { id } = await params;
  const rows = await db
    .delete(taskTemplates)
    .where(eq(taskTemplates.id, id))
    .returning({ id: taskTemplates.id });
  if (rows.length === 0) {
    return Response.json({ error: "not found" }, { status: 404 });
  }
  return Response.json({ ok: true });
}
