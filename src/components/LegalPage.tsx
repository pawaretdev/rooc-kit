"use client";

import type { ReactNode } from "react";
import { useLocale, useT } from "@/lib/i18n";

/**
 * Long-form legal documents keep full th/en bodies here instead of dictionary
 * keys (they are documents, not UI strings); the active body follows the
 * locale switcher like everything else.
 */
export function LegalPage({
  title,
  lastUpdated,
  en,
  th,
}: {
  title: string;
  lastUpdated: string;
  en: ReactNode;
  th: ReactNode;
}) {
  const { locale } = useLocale();
  const t = useT();

  return (
    <div className="px-3 py-8 sm:px-6">
      <article className="mx-auto w-full max-w-2xl rounded-xl border border-line bg-surface px-5 py-8 sm:px-8">
        <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
        <p className="mb-8 mt-1 text-sm text-sub">
          {t("legal.lastUpdated")}: {lastUpdated}
        </p>
        <div className="space-y-6 text-[0.95rem] leading-relaxed [&_h2]:text-lg [&_h2]:font-bold [&_h2]:tracking-tight [&_p]:mt-2 [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
          {locale === "th" ? th : en}
        </div>
      </article>
    </div>
  );
}
