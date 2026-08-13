import type { Monster } from "./game-data";

/**
 * Game art ships from /public/img for now (user-provided assets, 2026-08-10).
 * Set NEXT_PUBLIC_IMAGE_CDN to serve the same tree from a CDN later.
 * Layout under the base:
 *   monsters/{monster-id}.png   sprite (kebab-case id, overridable via `image`)
 *   ui/frame-{1..7}.png         level frame, tier = min(level, 6) + 1
 *   ui/mvp.png · ui/mini.png    kind badge shown at the frame's top-left
 */
// An env var that exists but is empty (a blank field in a deploy dashboard)
// must behave like "unset" — `??` alone would leave the base empty and strip
// /img from every asset URL.
const cdn = process.env.NEXT_PUBLIC_IMAGE_CDN?.trim();
const base = (cdn || "/img").replace(/\/+$/, "");

export function monsterImageUrl(monster: Monster): string {
  return `${base}/monsters/${monster.image ?? monster.id}.png`;
}

/** In-game research frame: gray (Lv 0) through tiers to gold (Lv 6+). */
export function frameImageUrl(level: number): string {
  const tier = Math.min(Math.max(level, 0), 6) + 1;
  return `${base}/ui/frame-${tier}.png`;
}

export function kindBadgeUrl(kind: Monster["kind"]): string | null {
  return kind === "normal" ? null : `${base}/ui/${kind}.png`;
}
