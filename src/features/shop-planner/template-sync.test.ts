import { describe, expect, it } from "vitest";
import type { ShopCategoryRecord, ShopItemRecord } from "@/lib/local-db";
import { templateDrift, type TemplateSnapshot } from "./template-sync";

const now = "2026-09-07T00:00:00.000Z";

function category(id: string, name: string): ShopCategoryRecord {
  return { id, name, sortOrder: 0, createdAt: now, updatedAt: now };
}

function item(overrides: Partial<ShopItemRecord> = {}): ShopItemRecord {
  return {
    id: "item-1",
    name: "Mora Coin",
    categoryId: "cat-growth",
    price: 5,
    stock: 5000,
    icon: "mora-coin",
    templateId: "tpl-1",
    sortOrder: 0,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function template(overrides: Partial<TemplateSnapshot> = {}): TemplateSnapshot {
  return {
    id: "tpl-1",
    name: "Mora Coin",
    categoryName: "Growth",
    price: 5,
    stock: 5000,
    icon: "mora-coin",
    ...overrides,
  };
}

const categories = [category("cat-growth", "growth")];
const taskless = (drift: ReturnType<typeof templateDrift>) => drift[0]?.patch;

describe("templateDrift", () => {
  it("reports nothing when the copy matches (category names compare case-insensitively)", () => {
    expect(templateDrift([item()], categories, [template()])).toEqual([]);
  });

  it("ignores items without a template, or whose template is gone", () => {
    const items = [item({ templateId: undefined }), item({ id: "i2", templateId: "missing" })];
    expect(templateDrift(items, categories, [template()])).toEqual([]);
  });

  it("collects only the fields that changed", () => {
    const drift = templateDrift(
      [item()],
      categories,
      [template({ price: 6, icon: "elunium" })],
    );
    expect(drift).toEqual([
      { itemId: "item-1", templateName: "Mora Coin", patch: { price: 6, icon: "elunium" } },
    ]);
  });

  it("clears stock and icon with null when the template dropped them", () => {
    const drift = templateDrift(
      [item()],
      categories,
      [template({ stock: null, icon: null })],
    );
    expect(drift[0].patch).toEqual({ stock: null, icon: null });
  });

  it("flags a frame change and clears it with null", () => {
    expect(
      taskless(templateDrift([item()], categories, [template({ frame: "bg-05" })])),
    ).toEqual({ frame: "bg-05" });
    expect(
      taskless(
        templateDrift([item({ frame: "bg-05" })], categories, [template()]),
      ),
    ).toEqual({ frame: null });
  });

  it("treats an absent local icon and a null template icon as equal", () => {
    const drift = templateDrift(
      [item({ icon: undefined })],
      categories,
      [template({ icon: null })],
    );
    expect(drift).toEqual([]);
  });

  it("flags a category move and a rename", () => {
    const drift = templateDrift(
      [item()],
      categories,
      [template({ name: "Mora Coins", categoryName: "Currency" })],
    );
    expect(drift[0].patch).toEqual({ name: "Mora Coins", categoryName: "Currency" });
  });

  it("flags an item whose local category no longer exists", () => {
    const drift = templateDrift([item({ categoryId: "gone" })], [], [template()]);
    expect(drift[0].patch).toEqual({ categoryName: "Growth" });
  });
});
