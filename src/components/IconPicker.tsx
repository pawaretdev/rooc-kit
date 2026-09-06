"use client";

import { useState } from "react";
import { Ban } from "lucide-react";
import { useT } from "@/lib/i18n";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export interface IconOption {
  id: string;
  label: string;
}

/**
 * Icon chooser shared by the Shop Planner (item art) and Dailies (event art):
 * the trigger *is* the current icon (tap it to change), and the popover shows
 * every icon as a tile grid — art is picked by looking at it, which a text
 * dropdown of names can't offer. A "no icon" tile clears it.
 */
export function IconPicker({
  icons,
  urlOf,
  value,
  onChange,
  disabled = false,
  placeholder,
}: {
  icons: readonly IconOption[];
  urlOf: (id: string) => string;
  value?: string | null;
  onChange: (next: string | null) => void;
  disabled?: boolean;
  /** what the trigger shows while nothing is chosen */
  placeholder: React.ReactNode;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const current = value
    ? (icons.find((i) => i.id === value)?.label ?? value)
    : t("common.noIcon");

  const pick = (next: string | null) => {
    if (next !== (value ?? null)) onChange(next);
    setOpen(false);
  };

  const tileClass = (selected: boolean) =>
    `press flex h-11 w-11 items-center justify-center rounded-lg border ${
      selected
        ? "border-accent ring-2 ring-accent/40"
        : "border-line hover:border-ink/40"
    }`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          aria-label={`${t("common.icon")}: ${current}`}
          title={current}
          className="press flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line bg-surface-2 outline-none hover:border-ink/40 focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={urlOf(value)}
              alt=""
              draggable={false}
              className="h-full w-full object-contain p-0.5"
            />
          ) : (
            placeholder
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto max-w-[calc(100vw-2rem)] p-2">
        <p className="mb-2 px-1 font-mono text-[10px] font-bold tracking-wider text-sub uppercase">
          {t("common.pickIcon")}
        </p>
        <div role="group" aria-label={t("common.pickIcon")} className="grid grid-cols-5 gap-1.5">
          <button
            type="button"
            aria-pressed={!value}
            aria-label={t("common.noIcon")}
            title={t("common.noIcon")}
            className={`${tileClass(!value)} text-sub`}
            onClick={() => pick(null)}
          >
            <Ban className="size-4" />
          </button>
          {icons.map((icon) => {
            const selected = icon.id === value;
            return (
              <button
                key={icon.id}
                type="button"
                aria-pressed={selected}
                aria-label={icon.label}
                title={icon.label}
                className={tileClass(selected)}
                onClick={() => pick(icon.id)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={urlOf(icon.id)}
                  alt=""
                  draggable={false}
                  className="h-9 w-9 object-contain"
                />
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
