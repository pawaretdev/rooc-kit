"use client";

import { useState } from "react";
import { Package, Square } from "lucide-react";
import { itemFrameUrl, itemIconUrl } from "@/lib/images";
import { ITEM_FRAMES } from "@/lib/item-frames";
import { ITEM_ICONS } from "@/lib/item-icons";
import { useT } from "@/lib/i18n";
import { IconPicker } from "@/components/IconPicker";

const SIZE = {
  /** inline in lists and the picker trigger */
  sm: "h-8 w-8",
  /** the shop card's art slot — big enough to read the in-game art at a glance */
  lg: "h-20 w-20",
} as const;

const PLACEHOLDER = { sm: "size-4", lg: "size-9" } as const;

/** inset of the art inside its slot — a frame needs breathing room around the icon */
const ART_PADDING = { sm: "p-1", lg: "p-2.5" } as const;

/**
 * An item's in-game art on its rarity frame. With no frame the art sits on
 * the app's own tile; with no icon the generic package mark shows instead (a
 * missing PNG — an unknown id from an older sync payload — falls back the
 * same way rather than leaving a broken image).
 */
export function ItemIcon({
  icon,
  frame,
  size = "sm",
  className = "",
}: {
  icon?: string | null;
  frame?: string | null;
  size?: keyof typeof SIZE;
  className?: string;
}) {
  const [missing, setMissing] = useState(false);
  const [frameMissing, setFrameMissing] = useState(false);
  const showArt = Boolean(icon) && !missing;
  const showFrame = Boolean(frame) && !frameMissing;

  return (
    <span
      className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-lg ${
        showFrame ? "" : "bg-surface-2"
      } ${SIZE[size]} ${className}`}
    >
      {/* Plain <img> like MonsterAvatar: pre-sized PNGs from /public or a
          dumb CDN — the next/image optimizer buys nothing here. */}
      {showFrame && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={itemFrameUrl(frame as string)}
          alt=""
          draggable={false}
          className="absolute inset-0 h-full w-full"
          onError={() => setFrameMissing(true)}
        />
      )}
      {showArt ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={itemIconUrl(icon as string)}
          alt=""
          draggable={false}
          className={`relative h-full w-full object-contain ${ART_PADDING[size]}`}
          onError={() => setMissing(true)}
        />
      ) : (
        <Package
          aria-hidden
          className={`relative ${PLACEHOLDER[size]} ${showFrame ? "text-ink/40" : "text-sub/60"}`}
        />
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

/** Rarity frame chooser — the same picker over ITEM_FRAMES. */
export function ItemFramePicker({
  value,
  onChange,
  disabled = false,
}: {
  value?: string | null;
  onChange: (next: string | null) => void;
  disabled?: boolean;
}) {
  const t = useT();
  return (
    <IconPicker
      icons={ITEM_FRAMES}
      urlOf={itemFrameUrl}
      value={value}
      onChange={onChange}
      disabled={disabled}
      labels={{
        name: t("common.frame"),
        pick: t("common.pickFrame"),
        none: t("common.noFrame"),
      }}
      placeholder={<Square aria-hidden className="size-4 text-sub/60" />}
    />
  );
}
