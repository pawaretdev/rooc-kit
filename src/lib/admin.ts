/**
 * Super-admin gate for the template editor. There is deliberately no role
 * system — the app owner is identified by SUPER_ADMIN_EMAIL (optional env);
 * when it is unset every check fails closed and the admin surface is off.
 */
export function isSuperAdminEmail(email: string | null | undefined): boolean {
  const admin = process.env.SUPER_ADMIN_EMAIL;
  return !!admin && !!email && email.toLowerCase() === admin.toLowerCase();
}
