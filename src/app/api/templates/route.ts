import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { taskTemplates } from "@/lib/db/schema";

/**
 * Public list of published Dailies templates — intentionally unauthenticated
 * so anonymous (local-only) users can browse suggestions too. Adoption
 * happens client-side by copying into IndexedDB; nothing is written here.
 */
export async function GET() {
  const rows = await db
    .select({
      id: taskTemplates.id,
      name: taskTemplates.name,
      cadence: taskTemplates.cadence,
      targetCount: taskTemplates.targetCount,
      eventStart: taskTemplates.eventStart,
      eventEnd: taskTemplates.eventEnd,
      linkedTemplateId: taskTemplates.linkedTemplateId,
      sortOrder: taskTemplates.sortOrder,
    })
    .from(taskTemplates)
    .where(eq(taskTemplates.published, true))
    .orderBy(asc(taskTemplates.sortOrder), asc(taskTemplates.createdAt));
  return Response.json({ templates: rows });
}
