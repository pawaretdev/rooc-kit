"use client";

import { locales, useLocale, useT, type Locale } from "@/lib/i18n";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GlobeIcon } from "./icons";

const LABEL_KEY = { th: "locale.th", en: "locale.en" } as const satisfies Record<
  Locale,
  `locale.${Locale}`
>;

export function LocaleSwitch() {
  const { locale, setLocale } = useLocale();
  const t = useT();

  return (
    <Select value={locale} onValueChange={(l) => setLocale(l as Locale)}>
      <SelectTrigger size="sm" aria-label={t("locale.label")}>
        <GlobeIcon className="shrink-0 text-sub" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {locales.map((l) => (
          <SelectItem key={l} value={l}>
            {t(LABEL_KEY[l])}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
