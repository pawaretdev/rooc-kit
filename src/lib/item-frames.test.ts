import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ITEM_FRAMES, isItemFrameId } from "./item-frames";

const FRAMES_DIR = join(process.cwd(), "public", "img", "item-frames");

describe("item frame catalog", () => {
  // Unlike the icon catalogs this is one-directional on purpose: the folder
  // ships every in-game frame, the picker offers only the rarity tiers.
  it("has a PNG for every selectable frame", () => {
    for (const frame of ITEM_FRAMES) {
      expect(existsSync(join(FRAMES_DIR, `${frame.id}.png`)), frame.id).toBe(true);
    }
  });

  it("has unique ids and recognises them", () => {
    const ids = ITEM_FRAMES.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(isItemFrameId("bg-04")).toBe(true);
    expect(isItemFrameId("bg-01")).toBe(false);
    expect(isItemFrameId(undefined)).toBe(false);
  });
});
