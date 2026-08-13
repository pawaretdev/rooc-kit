import { ShieldCheck } from "lucide-react";
import { notFound } from "next/navigation";
import { isSuperAdminEmail } from "@/lib/admin";
import { auth } from "@/lib/auth";
import { AdminNav } from "@/features/admin/AdminNav";

/**
 * Backoffice shell — super admin only (SUPER_ADMIN_EMAIL). Everyone else gets
 * a plain 404 so the area's existence is not leaked; the admin API re-checks
 * on every call. Full-width layout: fixed sidebar on desktop, top strip on
 * mobile. New admin tools plug in as routes + an AdminNav entry.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const email = session?.user?.email;
  if (!isSuperAdminEmail(email)) notFound();

  return (
    <main className="flex flex-1 flex-col sm:flex-row">
      <aside className="shrink-0 border-b border-line bg-surface sm:w-60 sm:border-r sm:border-b-0">
        {/* sticky below the h-14 app header; fills the rest of the viewport */}
        <div className="sticky top-14 flex flex-col p-3 sm:min-h-[calc(100vh-3.5rem)]">
          <div className="mb-1 flex items-center gap-2 px-2 py-2">
            <ShieldCheck className="size-4 text-accent" />
            <span className="font-bold tracking-tight">Admin</span>
            <span className="rounded-[5px] border border-line px-1.5 py-px font-mono text-[9px] font-bold tracking-wider text-gold uppercase">
              backoffice
            </span>
          </div>
          <AdminNav />
          <p className="mt-auto hidden truncate px-2 py-2 font-mono text-[11px] text-sub sm:block">
            {email}
          </p>
        </div>
      </aside>
      {/* full-bleed next to the sidebar — admin tables want every pixel */}
      <div className="min-w-0 flex-1 px-4 py-6 sm:px-6">{children}</div>
    </main>
  );
}
