"use client";

import { useState } from "react";
import { Package } from "lucide-react";
import { itemIconUrl } from "@/lib/images";
import { ITEM_ICONS } from "@/lib/item-icons";
import { IconPicker } from "@/components/IconPicker";

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

/** Shop item art chooser — the shared IconPicker over ITEM_ICONS. */
export function ItemIconPicker({
  value,
  onChange,
  disabled = false,
}: {
  value?: string | null;
  onChange: (next: string | null) => void;
  disabled?: boolean;
}) {
  return (
    <IconPicker
      icons={ITEM_ICONS}
      urlOf={itemIconUrl}
      value={value}
      onChange={onChange}
      disabled={disabled}
      placeholder={<Package aria-hidden className="size-4 text-sub/60" />}
    />
  );
}
