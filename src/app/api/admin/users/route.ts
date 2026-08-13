import { desc, eq } from "drizzle-orm";
import { isSuperAdminEmail } from "@/lib/admin";
import { requireSuperAdmin } from "@/lib/admin-api";
import { db } from "@/lib/db/client";
import { accounts, progressSnapshots, users } from "@/lib/db/schema";

/**
 * Signed-in accounts for the backoffice user list. Only OAuth users exist here
 * — anonymous players never touch the DB — so the row count stays small enough
 * to send whole and filter client-side.
 */
export async function GET() {
  const gate = await requireSuperAdmin();
  if (!gate.ok) return gate.response;

  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      image: users.image,
      createdAt: users.createdAt,
      syncedAt: progressSnapshots.updatedAt,
    })
    .from(users)
    .leftJoin(progressSnapshots, eq(progressSnapshots.userId, users.id))
    .orderBy(desc(users.createdAt));

  // One flat read + group in JS beats a per-user query; `account` is tiny.
  const linked = await db
    .select({ userId: accounts.userId, provider: accounts.provider })
    .from(accounts);
  const providersByUser = new Map<string, string[]>();
  for (const row of linked) {
    const list = providersByUser.get(row.userId);
    if (list) {
      if (!list.includes(row.provider)) list.push(row.provider);
    } else {
      providersByUser.set(row.userId, [row.provider]);
    }
  }

  return Response.json({
    users: rows.map((row) => ({
      ...row,
      providers: providersByUser.get(row.id) ?? [],
      isSuperAdmin: isSuperAdminEmail(row.email),
    })),
  });
}
