/**
 * Gold Shop item frames — the in-game item-background tiles shipped under
 * /public/img/item-frames (bg-01 … bg-13). Only the rarity-tier frames are
 * offered in the picker; the rest stay in the repo for later. Ids are file
 * stems, stored in an item's `frame` and resolved via itemFrameUrl().
 * `item-frames.test.ts` checks every listed frame has its PNG.
 */
export const ITEM_FRAMES = [
  { id: "bg-02", label: "White" },
  { id: "bg-03", label: "Green" },
  { id: "bg-04", label: "Blue" },
  { id: "bg-05", label: "Purple" },
  { id: "bg-06", label: "Orange" },
  { id: "bg-09", label: "Red" },
] as const;

export type ItemFrameId = (typeof ITEM_FRAMES)[number]["id"];

const FRAME_IDS: ReadonlySet<string> = new Set(ITEM_FRAMES.map((f) => f.id));

export function isItemFrameId(value: unknown): value is ItemFrameId {
  return typeof value === "string" && FRAME_IDS.has(value);
}
