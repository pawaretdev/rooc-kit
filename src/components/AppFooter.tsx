"use client";

import Link from "next/link";
import { useT } from "@/lib/i18n";

export function AppFooter() {
  const t = useT();

  return (
    <footer className="border-t border-line px-4 py-4 sm:px-6">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-5 gap-y-1 text-xs text-sub">
        <span>{t("legal.fanDisclaimer")}</span>
        <span className="ml-auto flex gap-4">
          <Link href="/terms" className="hover:text-ink hover:underline">
            {t("legal.terms")}
          </Link>
          <Link href="/privacy" className="hover:text-ink hover:underline">
            {t("legal.privacy")}
          </Link>
        </span>
      </div>
    </footer>
  );
}
