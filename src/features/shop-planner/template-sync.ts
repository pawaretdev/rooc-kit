import type { ShopCategoryRecord, ShopItemRecord } from "@/lib/local-db";

/** A published template as the public API serves it, plus its category's name. */
export interface TemplateSnapshot {
  id: string;
  name: string;
  categoryName: string;
  /** null = Unlimited */
  stock: number | null;
  price: number;
  icon?: string | null;
}

/** Only the fields that differ — null clears stock/icon, matching the template. */
export interface TemplatePatch {
  name?: string;
  categoryName?: string;
  stock?: number | null;
  price?: number;
  icon?: string | null;
}

export interface TemplateDrift {
  itemId: string;
  templateName: string;
  patch: TemplatePatch;
}

const sameName = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

/**
 * Adopted items (those carrying a templateId) that no longer match their
 * template. Adoption is a copy, so an admin edit — a price change, new art,
 * a renamed item — never reaches users on its own; this is the diff behind the
 * "update from suggestions" button. Items whose template was deleted or
 * unpublished are left alone (nothing to compare against).
 */
export function templateDrift(
  items: ShopItemRecord[],
  categories: ShopCategoryRecord[],
  templates: TemplateSnapshot[],
): TemplateDrift[] {
  const byTemplate = new Map(templates.map((tpl) => [tpl.id, tpl]));
  const categoryName = new Map(categories.map((c) => [c.id, c.name]));
  const drift: TemplateDrift[] = [];

  for (const item of items) {
    const tpl = item.templateId ? byTemplate.get(item.templateId) : undefined;
    if (!tpl) continue;
    const patch: TemplatePatch = {};
    if (item.name !== tpl.name) patch.name = tpl.name;
    if (item.price !== tpl.price) patch.price = tpl.price;
    if ((item.stock ?? null) !== tpl.stock) patch.stock = tpl.stock;
    if ((item.icon ?? null) !== (tpl.icon ?? null)) patch.icon = tpl.icon ?? null;
    const localCategory = categoryName.get(item.categoryId);
    if (localCategory === undefined || !sameName(localCategory, tpl.categoryName)) {
      patch.categoryName = tpl.categoryName;
    }
    if (Object.keys(patch).length > 0) {
      drift.push({ itemId: item.id, templateName: tpl.name, patch });
    }
  }
  return drift;
}
