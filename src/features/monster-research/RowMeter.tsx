"use client";

import { MAX_MR_LEVEL } from "@/lib/local-db";
import { useT } from "@/lib/i18n";

/** 10-segment strip: gold = reached, red tick = the level it's stuck on. */
export function RowMeter({
  rowLevel,
  hasRowLevel,
}: {
  rowLevel: number;
  hasRowLevel: boolean;
}) {
  const t = useT();
  return (
    <span
      role="img"
      aria-label={`${t("mr.rowLevel")} ${hasRowLevel ? rowLevel : "–"}/${MAX_MR_LEVEL}`}
      className="grid w-full grid-cols-10 gap-[3px]"
    >
      {Array.from({ length: MAX_MR_LEVEL }, (_, i) => {
        const seg = i + 1;
        const cls = !hasRowLevel
          ? "bg-surface-2"
          : seg <= rowLevel
            ? "bg-gold"
            : seg === rowLevel + 1
              ? "bg-danger/60"
              : "bg-surface-2";
        return (
          <i
            key={seg}
            className={`h-1 rounded-full transition-colors duration-300 ${cls}`}
          />
        );
      })}
    </span>
  );
}
