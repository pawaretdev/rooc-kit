import { describe, expect, it } from "vitest";
import type { ShopCategoryRecord, ShopItemRecord } from "@/lib/local-db";
import {
  groupItemsByCategory,
  moveCategory,
  openCatalog,
  reorderWithinGroup,
} from "./catalog-groups";

const now = "2026-09-26T00:00:00.000Z";

function category(id: string, sortOrder: number): ShopCategoryRecord {
  return { id, name: id, sortOrder, createdAt: now, updatedAt: now };
}

function item(
  id: string,
  categoryId: string,
  sortOrder: number,
): ShopItemRecord {
  return {
    id,
    name: id,
    categoryId,
    price: 1,
    sortOrder,
    createdAt: now,
    updatedAt: now,
  };
}

const growth = category("growth", 0);
const kafra = category("kafra", 1);
const anniv = category("anniv", 2);

describe("groupItemsByCategory", () => {
  it("files items under their category in category order, each in sortOrder", () => {
    const groups = groupItemsByCategory(
      [anniv, growth, kafra],
      [
        item("k2", "kafra", 5),
        item("g1", "growth", 0),
        item("k1", "kafra", 2),
        item("g2", "growth", 3),
      ],
    );
    expect(groups.map((g) => g.category?.id)).toEqual(["growth", "kafra"]);
    expect(groups.map((g) => g.items.map((i) => i.id))).toEqual([
      ["g1", "g2"],
      ["k1", "k2"],
    ]);
  });

  it("skips categories with no items", () => {
    const groups = groupItemsByCategory(
      [growth, kafra, anniv],
      [item("a1", "anniv", 0)],
    );
    expect(groups.map((g) => g.category?.id)).toEqual(["anniv"]);
  });

  it("keeps items whose category is gone in a trailing null group", () => {
    const groups = groupItemsByCategory(
      [growth],
      [item("x2", "deleted", 4), item("g1", "growth", 1), item("x1", "gone", 2)],
    );
    expect(groups.map((g) => g.category)).toEqual([growth, null]);
    expect(groups[1].items.map((i) => i.id)).toEqual(["x1", "x2"]);
  });

  it("returns nothing for an empty catalog", () => {
    expect(groupItemsByCategory([growth], [])).toEqual([]);
  });
});

describe("reorderWithinGroup", () => {
  const group = [
    item("a", "growth", 1),
    item("b", "growth", 4),
    item("c", "growth", 9),
  ];

  it("reassigns the group's own slots in the dropped order", () => {
    expect(reorderWithinGroup(group, ["c", "a", "b"])).toEqual([
      { id: "c", sortOrder: 1 },
      { id: "a", sortOrder: 4 },
      { id: "b", sortOrder: 9 },
    ]);
  });

  it("emits no patch for rows that keep their slot", () => {
    expect(reorderWithinGroup(group, ["a", "c", "b"])).toEqual([
      { id: "c", sortOrder: 4 },
      { id: "b", sortOrder: 9 },
    ]);
    expect(reorderWithinGroup(group, ["a", "b", "c"])).toEqual([]);
  });

  it("ignores ids from outside the group", () => {
    expect(reorderWithinGroup(group, ["b", "other", "a", "c"])).toEqual([
      { id: "b", sortOrder: 1 },
      { id: "a", sortOrder: 4 },
    ]);
  });
});

describe("moveCategory", () => {
  const strip = [category("a", 0), category("b", 1), category("c", 2)];

  it("swaps with the neighbour in the chosen direction", () => {
    expect(moveCategory(strip, "b", 1)).toEqual([
      { id: "c", sortOrder: 1 },
      { id: "b", sortOrder: 2 },
    ]);
    expect(moveCategory(strip, "b", -1)).toEqual([
      { id: "b", sortOrder: 0 },
      { id: "a", sortOrder: 1 },
    ]);
  });

  it("does nothing at the edges or for an unknown id", () => {
    expect(moveCategory(strip, "a", -1)).toEqual([]);
    expect(moveCategory(strip, "c", 1)).toEqual([]);
    expect(moveCategory(strip, "zzz", 1)).toEqual([]);
  });

  it("renumbers gappy or duplicate slots while moving", () => {
    const messy = [category("a", 5), category("b", 5), category("c", 40)];
    expect(moveCategory(messy, "c", -1)).toEqual([
      { id: "a", sortOrder: 0 },
      { id: "c", sortOrder: 1 },
      { id: "b", sortOrder: 2 },
    ]);
  });
});

describe("openCatalog", () => {
  const sale = { ...category("sale", 3), eventEnd: "2026-10-15" };
  const flash = { ...category("flash", 4), eventEnd: "2026-10-15T12:00" };
  const all = [growth, sale, flash];
  const items = [
    item("g1", "growth", 0),
    item("s1", "sale", 1),
    item("f1", "flash", 2),
  ];

  it("keeps everything while the sale is still on", () => {
    const shop = openCatalog(all, items, "2026-10-15T11:59");
    expect(shop.categories.map((c) => c.id)).toEqual(["growth", "sale", "flash"]);
    expect(shop.items.map((i) => i.id)).toEqual(["g1", "s1", "f1"]);
  });

  it("drops a category and its items once its end passes", () => {
    const shop = openCatalog(all, items, "2026-10-15T12:01");
    expect(shop.categories.map((c) => c.id)).toEqual(["growth", "sale"]);
    expect(shop.items.map((i) => i.id)).toEqual(["g1", "s1"]);
  });

  it("treats a bare date as the whole game-facing day", () => {
    expect(openCatalog(all, items, "2026-10-15T23:59").categories.map((c) => c.id)).toEqual(["growth", "sale"]);
    expect(openCatalog(all, items, "2026-10-16T00:00").categories.map((c) => c.id)).toEqual(["growth"]);
  });
});
