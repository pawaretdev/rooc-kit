"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ListChecks, Users } from "lucide-react";
import { useT, type MessageKey } from "@/lib/i18n";

/** Backoffice menu — one entry per admin feature; add new tools here. */
const MENU: {
  href: string;
  labelKey: MessageKey;
  icon: React.ReactNode;
}[] = [
  {
    href: "/admin/templates",
    labelKey: "admin.templates",
    icon: <ListChecks className="size-4" />,
  },
  {
    href: "/admin/users",
    labelKey: "admin.users",
    icon: <Users className="size-4" />,
  },
];

export function AdminNav() {
  const t = useT();
  const pathname = usePathname();

  return (
    <nav aria-label={t("admin.area")}>
      <p className="hidden px-2 pt-1 pb-1.5 font-mono text-[10px] font-bold tracking-wider text-sub uppercase sm:block">
        {t("admin.tools")}
      </p>
      <div className="flex gap-1 overflow-x-auto sm:flex-col">
        {MENU.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`press flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm whitespace-nowrap ${
                active
                  ? "bg-accent font-semibold text-accent-ink"
                  : "text-sub hover:bg-surface-2 hover:text-ink"
              }`}
            >
              {item.icon}
              {t(item.labelKey)}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
