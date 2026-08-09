"use client";

import { useState } from "react";
import type { Monster } from "@/lib/game-data";
import { frameImageUrl, kindBadgeUrl, monsterImageUrl } from "@/lib/images";
import { ImageOffIcon } from "./icons";

const SIZE = {
  sm: "h-8 w-8",
  md: "h-11 w-11",
  /** row-card tile — the sprite slot */
  lg: "h-14 w-14",
} as const;

const BADGE = { sm: "h-3.5 w-3.5", md: "h-4 w-4", lg: "h-5 w-5" } as const;
const OFF_ICON = { sm: 12, md: 16, lg: 20 } as const;

/**
 * The in-game frame already encodes the level tier (gray Lv 0 → gold Lv 6+),
 * so tones only carry the app's own states — never as the only signal;
 * callers pair them with an icon/text (tooltip, badge, flags).
 */
const TONE = {
  default: "",
  danger: "outline-2 outline-danger",
} as const;

export type AvatarTone = keyof typeof TONE;

export function MonsterAvatar({
  monster,
  level,
  size = "sm",
  tone = "default",
}: {
  monster: Monster;
  /** MR level — picks the in-game frame tier */
  level: number;
  size?: keyof typeof SIZE;
  tone?: AvatarTone;
}) {
  const [spriteMissing, setSpriteMissing] = useState(false);
  const badge = kindBadgeUrl(monster.kind);

  return (
    <span
      className={`relative inline-block shrink-0 rounded-lg ${SIZE[size]} ${TONE[tone]}`}
    >
      {/* Plain <img> on purpose: pre-optimized PNGs served from /public or a
          dumb CDN — the next/image optimizer buys nothing here. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={frameImageUrl(level)}
        alt=""
        draggable={false}
        className="absolute inset-0 h-full w-full"
      />
      {spriteMissing ? (
        <span
          aria-hidden
          className="absolute inset-0 flex items-center justify-center text-frame-ink"
        >
          <ImageOffIcon size={OFF_ICON[size]} />
        </span>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={monsterImageUrl(monster)}
          alt=""
          loading="lazy"
          draggable={false}
          onError={() => setSpriteMissing(true)}
          className="absolute inset-[9%] h-[82%] w-[82%] object-contain"
        />
      )}
      {badge && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={badge}
          alt={monster.kind}
          draggable={false}
          className={`absolute -top-1 -left-1 ${BADGE[size]}`}
        />
      )}
    </span>
  );
}
