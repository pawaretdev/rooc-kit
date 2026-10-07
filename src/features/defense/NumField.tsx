"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import { fieldState, type LimitKey, type Num } from "./model";

/** "" → null (not entered), anything unreadable → NaN (blocks the result). */
export function parseNum(text: string): Num {
  const trimmed = text.trim().replace(/,/g, "").replace(/%$/, "");
  if (trimmed === "") return null;
  return Number(trimmed);
}

function display(value: Num): string {
  return value === null || Number.isNaN(value) ? "" : String(value);
}

/**
 * Numeric stat input. Keeps the raw text the player typed (so "12." or a
 * typo is not rewritten under their cursor) while reporting `number | null`
 * upward; values pushed in from outside (sample, reset, load) replace it.
 */
export function NumField({
  value,
  onChange,
  limit,
  label,
  className,
}: {
  value: Num;
  onChange: (value: Num) => void;
  limit: LimitKey;
  /** accessible name — the full stat name */
  label: string;
  className?: string;
}) {
  const t = useT();
  const [text, setText] = useState(() => display(value));
  const [seen, setSeen] = useState<Num>(value);
  // Adopt outside changes, but not the echo of what was just typed.
  if (!Object.is(seen, value)) {
    setSeen(value);
    if (!Object.is(parseNum(text), value)) setText(display(value));
  }

  const invalid = fieldState(limit, value) === "invalid";

  return (
    <input
      type="text"
      data-slot="input"
      inputMode="decimal"
      autoComplete="off"
      spellCheck={false}
      value={text}
      placeholder={t("def.notEntered")}
      aria-label={label}
      aria-invalid={invalid || undefined}
      onChange={(e) => {
        setText(e.target.value);
        const next = parseNum(e.target.value);
        setSeen(next);
        onChange(next);
      }}
      className={cn(
        "h-9 w-full min-w-0 rounded-lg border border-line bg-bg/40 px-2.5 text-right font-mono text-sm tabular-nums outline-none placeholder:font-sans placeholder:text-xs placeholder:text-sub/70",
        "focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/30",
        "aria-invalid:border-danger aria-invalid:ring-2 aria-invalid:ring-danger/25",
        className,
      )}
    />
  );
}
