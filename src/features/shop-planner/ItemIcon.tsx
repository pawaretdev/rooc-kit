"use client";

import { useState } from "react";
import { Ban, Package } from "lucide-react";
import { itemIconUrl } from "@/lib/images";
import { ITEM_ICONS, itemIconLabel } from "@/lib/item-icons";
import { useT } from "@/lib/i18n";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const SIZE = {
  /** inline in lists and the picker trigger */
  sm: "h-8 w-8",
  /** the shop card's art slot — big enough to read the in-game art at a glance */
  lg: "h-20 w-20",
} as const;

const PLACEHOLDER = { sm: "size-4", lg: "size-9" } as const;

/**
 * An item's in-game art, or the generic package tile when the item has no icon
 * (or its PNG is missing — an unknown id from an older sync payload falls back
 * the same way instead of leaving a broken image).
 */
export function ItemIcon({
  icon,
  size = "sm",
  className = "",
}: {
  icon?: string | null;
  size?: keyof typeof SIZE;
  className?: string;
}) {
  const [missing, setMissing] = useState(false);
  const showArt = Boolean(icon) && !missing;

  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-lg bg-surface-2 ${SIZE[size]} ${className}`}
    >
      {showArt ? (
        // Plain <img> like MonsterAvatar: pre-sized PNGs from /public or a
        // dumb CDN — the next/image optimizer buys nothing here.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={itemIconUrl(icon as string)}
          alt=""
          draggable={false}
          className="h-full w-full object-contain p-0.5"
          onError={() => setMissing(true)}
        />
      ) : (
        <Package aria-hidden className={`${PLACEHOLDER[size]} text-sub/60`} />
      )}
    </span>
  );
}

/**
 * Icon chooser: the trigger *is* the current icon (tap it to change), and the
 * popover shows every icon as a tile grid — art is picked by looking at it,
 * which a text dropdown of names can't offer. A "no icon" tile clears it.
 */
export function ItemIconPicker({
  value,
  onChange,
  disabled = false,
}: {
  value?: string | null;
  onChange: (next: string | null) => void;
  disabled?: boolean;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const current = value ? itemIconLabel(value) : t("shop.noIcon");

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
          aria-label={`${t("shop.icon")}: ${current}`}
          title={current}
          className="press rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ItemIcon
            icon={value}
            size="sm"
            className="border border-line hover:border-ink/40"
          />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto max-w-[calc(100vw-2rem)] p-2">
        <p className="mb-2 px-1 font-mono text-[10px] font-bold tracking-wider text-sub uppercase">
          {t("shop.pickIcon")}
        </p>
        <div role="group" aria-label={t("shop.pickIcon")} className="grid grid-cols-5 gap-1.5">
          <button
            type="button"
            aria-pressed={!value}
            aria-label={t("shop.noIcon")}
            title={t("shop.noIcon")}
            className={`${tileClass(!value)} text-sub`}
            onClick={() => pick(null)}
          >
            <Ban className="size-4" />
          </button>
          {ITEM_ICONS.map((icon) => {
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
                  src={itemIconUrl(icon.id)}
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
