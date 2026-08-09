import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { progressSnapshots } from "@/lib/db/schema";
import { parseProgressExport } from "@/lib/progress-io";

/**
 * Cloud progress sync — one ProgressExport snapshot per signed-in user.
 * PUT replaces the snapshot wholesale (same semantics as file import);
 * GET returns it for restore. Both are session-guarded, so anonymous
 * tracker usage never touches this route.
 */

export async function PUT(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  let doc;
  try {
    doc = parseProgressExport(await req.text());
  } catch {
    return Response.json({ error: "invalid progress payload" }, { status: 400 });
  }

  const updatedAt = new Date();
  await db
    .insert(progressSnapshots)
    .values({ userId, data: doc, updatedAt })
    .onConflictDoUpdate({
      target: progressSnapshots.userId,
      set: { data: doc, updatedAt },
    });
  return Response.json({ ok: true });
}

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const [row] = await db
    .select()
    .from(progressSnapshots)
    .where(eq(progressSnapshots.userId, userId))
    .limit(1);
  if (!row) {
    return Response.json({ error: "no snapshot" }, { status: 404 });
  }
  return Response.json(row.data);
}
