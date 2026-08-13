import { eq } from "drizzle-orm";
import { isSuperAdminEmail } from "@/lib/admin";
import { requireSuperAdmin } from "@/lib/admin-api";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";

/**
 * Remove an account and everything hanging off it (linked providers, sessions
 * and the cloud progress snapshot cascade in Postgres). The user's own browser
 * copy is local-first and untouched — signing in again creates a fresh row.
 *
 * Deleting yourself or another super admin is refused: it would lock the owner
 * out of the backoffice with no way back in from the UI.
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireSuperAdmin();
  if (!gate.ok) return gate.response;

  const { id } = await params;
  const [target] = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.id, id));
  if (!target) {
    return Response.json({ error: "not found" }, { status: 404 });
  }
  if (target.id === gate.userId || isSuperAdminEmail(target.email)) {
    return Response.json({ error: "cannot delete admin" }, { status: 400 });
  }

  await db.delete(users).where(eq(users.id, id));
  return Response.json({ ok: true });
}
