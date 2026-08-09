"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useT } from "@/lib/i18n";

/**
 * "By continuing you accept {terms} and {privacy}" with the placeholders
 * swapped for real links, so each locale keeps its own word order.
 * `wrapLink` lets a host dialog close itself when a link navigates.
 */
export function LegalNotice({
  wrapLink = (link) => link,
}: {
  wrapLink?: (link: ReactNode, key: string) => ReactNode;
}) {
  const t = useT();
  const parts = t("auth.legalNotice").split(/(\{terms\}|\{privacy\})/);
  return (
    <p className="text-xs text-sub">
      {parts.map((part, i) => {
        if (part !== "{terms}" && part !== "{privacy}") return part;
        const [href, label] =
          part === "{terms}"
            ? (["/terms", t("legal.terms")] as const)
            : (["/privacy", t("legal.privacy")] as const);
        return wrapLink(
          <Link
            key={i}
            href={href}
            className="underline underline-offset-2 hover:text-ink"
          >
            {label}
          </Link>,
          `${part}-${i}`,
        );
      })}
    </p>
  );
}
