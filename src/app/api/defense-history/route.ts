import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { defenseHistories } from "@/lib/db/schema";
import {
  liveSnapshots,
  MAX_SNAPSHOTS,
  mergeHistory,
  parseHistoryEntries,
} from "@/features/defense/history";

/**
 * DEF Planner history sync — only called by browsers whose user turned
 * history sync on. Unlike /api/progress, PUT merges the upload into the
 * stored list per record (last write wins, tombstones for deletes) and
 * answers with the merged list, so concurrent devices converge instead of
 * overwriting each other. DELETE drops the cloud copy when sync is turned off.
 */

/** ~500 snapshots of a few hundred bytes each fit comfortably under this */
const MAX_BODY_BYTES = 2_000_000;

async function userId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

const unauthorized = () => Response.json({ error: "unauthorized" }, { status: 401 });

export async function GET() {
  const id = await userId();
  if (!id) return unauthorized();

  const [row] = await db
    .select()
    .from(defenseHistories)
    .where(eq(defenseHistories.userId, id))
    .limit(1);
  return Response.json({ entries: row?.entries ?? [] });
}

export async function PUT(req: Request) {
  const id = await userId();
  if (!id) return unauthorized();

  const text = await req.text();
  if (text.length > MAX_BODY_BYTES) {
    return Response.json({ error: "payload too large" }, { status: 413 });
  }
  let incoming;
  try {
    const body: unknown = JSON.parse(text);
    incoming = parseHistoryEntries(
      typeof body === "object" && body !== null ? (body as { entries?: unknown }).entries : undefined,
    );
  } catch {
    return Response.json({ error: "invalid history payload" }, { status: 400 });
  }

  const merged = await db.transaction(async (tx) => {
    // Make sure the row exists so FOR UPDATE always has something to lock —
    // two devices syncing for the first time at once still merge, not race.
    await tx
      .insert(defenseHistories)
      .values({ userId: id, entries: [] })
      .onConflictDoNothing();
    const [row] = await tx
      .select()
      .from(defenseHistories)
      .where(eq(defenseHistories.userId, id))
      .for("update");
    const result = mergeHistory(row?.entries ?? [], incoming);
    if (liveSnapshots(result).length > MAX_SNAPSHOTS) return null;
    await tx
      .update(defenseHistories)
      .set({ entries: result, updatedAt: new Date() })
      .where(eq(defenseHistories.userId, id));
    return result;
  });

  if (!merged) {
    return Response.json({ error: "too many snapshots" }, { status: 413 });
  }
  return Response.json({ entries: merged });
}

export async function DELETE() {
  const id = await userId();
  if (!id) return unauthorized();

  await db.delete(defenseHistories).where(eq(defenseHistories.userId, id));
  return Response.json({ ok: true });
}
