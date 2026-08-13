import { asc } from "drizzle-orm";
import { requireSuperAdmin } from "@/lib/admin-api";
import { db } from "@/lib/db/client";
import { taskTemplates } from "@/lib/db/schema";

const MAX_NAME_LENGTH = 100;
const MAX_ROUNDS = 99;
/** date-only (legacy) or date-time event bound */
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/;

function isValidRounds(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= MAX_ROUNDS
  );
}

function isValidDate(value: unknown): value is string {
  return typeof value === "string" && DATE_PATTERN.test(value);
}

function parseTemplateInput(raw: unknown): {
  name: string;
  cadence: "daily" | "weekly";
  targetCount: number;
  eventStart: string | null;
  eventEnd: string | null;
} | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (
    typeof r.name !== "string" ||
    r.name.trim().length === 0 ||
    r.name.trim().length > MAX_NAME_LENGTH
  ) {
    return null;
  }
  if (r.cadence !== "daily" && r.cadence !== "weekly") return null;
  if (r.targetCount !== undefined && !isValidRounds(r.targetCount)) return null;
  if (r.eventStart != null && !isValidDate(r.eventStart)) return null;
  if (r.eventEnd != null && !isValidDate(r.eventEnd)) return null;
  return {
    name: r.name.trim(),
    cadence: r.cadence,
    targetCount: r.targetCount ?? 1,
    eventStart: (r.eventStart as string | undefined) ?? null,
    eventEnd: (r.eventEnd as string | undefined) ?? null,
  };
}

/** All templates including drafts — admin editor listing. */
export async function GET() {
  const gate = await requireSuperAdmin();
  if (!gate.ok) return gate.response;

  const rows = await db
    .select()
    .from(taskTemplates)
    .orderBy(asc(taskTemplates.sortOrder), asc(taskTemplates.createdAt));
  return Response.json({ templates: rows });
}

export async function POST(req: Request) {
  const gate = await requireSuperAdmin();
  if (!gate.ok) return gate.response;

  let input;
  try {
    input = parseTemplateInput(await req.json());
  } catch {
    input = null;
  }
  if (!input) {
    return Response.json({ error: "invalid template payload" }, { status: 400 });
  }

  const existing = await db
    .select({ sortOrder: taskTemplates.sortOrder })
    .from(taskTemplates);
  const sortOrder =
    existing.reduce((max, r) => Math.max(max, r.sortOrder), -1) + 1;

  const [row] = await db
    .insert(taskTemplates)
    .values({ ...input, sortOrder })
    .returning();
  return Response.json({ template: row });
}
