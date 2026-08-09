"use client";

import { locales, useLocale, useT, type Locale } from "@/lib/i18n";

const LOCALE_LABEL = { th: "locale.th", en: "locale.en" } as const;

/** Compact EN/ไทย segmented control — account dropdown and mobile menu rows. */
export function LocaleSegment() {
  const { locale, setLocale } = useLocale();
  const t = useT();

  return (
    <span className="inline-flex overflow-hidden rounded-md border border-line">
      {locales.map((l) => (
        <button
          key={l}
          type="button"
          aria-pressed={locale === l}
          onClick={() => setLocale(l as Locale)}
          className={`px-2.5 py-0.5 text-xs ${
            locale === l
              ? "bg-accent font-semibold text-accent-ink"
              : "text-sub hover:text-ink"
          }`}
        >
          {t(LOCALE_LABEL[l])}
        </button>
      ))}
    </span>
  );
}
