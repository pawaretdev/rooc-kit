import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ITEM_ICONS, isItemIconId } from "./item-icons";

const ITEMS_DIR = join(process.cwd(), "public", "img", "items");

describe("item icon catalog", () => {
  it("has a PNG for every icon id", () => {
    for (const icon of ITEM_ICONS) {
      expect(existsSync(join(ITEMS_DIR, `${icon.id}.png`)), icon.id).toBe(true);
    }
  });

  it("lists every PNG shipped under public/img/items", () => {
    const shipped = readdirSync(ITEMS_DIR)
      .filter((f) => f.endsWith(".png"))
      .map((f) => f.replace(/\.png$/, ""))
      .sort();
    expect(shipped).toEqual(ITEM_ICONS.map((i) => i.id).sort());
  });

  it("has unique ids and recognises them", () => {
    const ids = ITEM_ICONS.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(isItemIconId("mora-coin")).toBe(true);
    expect(isItemIconId("not-an-icon")).toBe(false);
    expect(isItemIconId(undefined)).toBe(false);
  });
});
