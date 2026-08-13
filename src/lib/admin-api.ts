import { isSuperAdminEmail } from "@/lib/admin";
import { auth } from "@/lib/auth";

/**
 * Server-side gate shared by every `/api/admin/*` handler. The /admin pages are
 * already gated in their layout, but the API is a separate entry point and must
 * re-check on every call. Lives here rather than in `lib/admin.ts` because that
 * module is imported by `lib/auth.ts` (importing `auth` there would cycle).
 */
export type AdminGate =
  | { ok: true; userId: string; email: string }
  | { ok: false; response: Response };

export async function requireSuperAdmin(): Promise<AdminGate> {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      ok: false,
      response: Response.json({ error: "unauthorized" }, { status: 401 }),
    };
  }
  if (!isSuperAdminEmail(session.user.email)) {
    return {
      ok: false,
      response: Response.json({ error: "forbidden" }, { status: 403 }),
    };
  }
  return { ok: true, userId: session.user.id, email: session.user.email ?? "" };
}
