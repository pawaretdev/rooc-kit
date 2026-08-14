"use client";

import { useEffect, useState } from "react";
import { Infinity as InfinityIcon, Plus, Sparkles } from "lucide-react";
import { addShopCategory, addShopItem, localDb } from "@/lib/local-db";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { useAdoptedShopTemplates } from "./useShopPlanner";

interface ShopTemplateCategory {
  id: string;
  name: string;
  sortOrder: number;
}

interface ShopTemplateItem {
  id: string;
  name: string;
  categoryId: string;
  stock: number | null;
  price: number;
  sortOrder: number;
}

type FetchStatus = "loading" | "done" | "error";

/**
 * Templates carry their category as a display name; adoption matches a local
 * category case-insensitively and creates it when missing, so "growth" never
 * spawns a duplicate "Growth".
 */
async function resolveCategoryId(name: string): Promise<string> {
  const categories = await localDb.shopCategories.toArray();
  const existing = categories.find(
    (c) => c.name.toLowerCase() === name.toLowerCase(),
  );
  return existing ? existing.id : addShopCategory(name);
}

/**
 * Suggested Gold Shop items curated by the app owner. Read-only public fetch;
 * adopting copies the template into the local catalog — the copy never changes
 * when the template does. Fetch failure only hides suggestions (local-first).
 */
export function ShopTemplateBrowser() {
  const t = useT();
  const [status, setStatus] = useState<FetchStatus>("loading");
  const [templates, setTemplates] = useState<ShopTemplateItem[]>([]);
  const [categories, setCategories] = useState<ShopTemplateCategory[]>([]);
  const adopted = useAdoptedShopTemplates();

  const available =
    status === "done" ? templates.filter((tpl) => !adopted?.has(tpl.id)) : [];

  const categoryNameOf = (tpl: ShopTemplateItem) =>
    categories.find((c) => c.id === tpl.categoryId)?.name;

  const adopt = async (tpl: ShopTemplateItem) => {
    const categoryName = categoryNameOf(tpl);
    if (!categoryName) return;
    await addShopItem({
      name: tpl.name,
      categoryId: await resolveCategoryId(categoryName),
      price: tpl.price,
      stock: tpl.stock ?? undefined,
      templateId: tpl.id,
    });
  };

  // Sequential on purpose — addShopItem assigns sortOrder from the current
  // table state, so parallel adds would race into duplicate orders.
  const adoptAll = async () => {
    for (const tpl of available) {
      await adopt(tpl);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/shop-templates");
        if (!res.ok) throw new Error();
        const body = (await res.json()) as {
          categories: ShopTemplateCategory[];
          templates: ShopTemplateItem[];
        };
        if (!cancelled) {
          setCategories(body.categories);
          setTemplates(body.templates);
          setStatus("done");
        }
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="rounded-xl border border-line bg-surface p-4">
      <h2 className="mb-1 flex items-center gap-2 text-sm font-bold">
        <Sparkles className="size-4 text-gold" />
        {t("shop.templates")}
        {available.length > 1 && (
          <Button
            variant="outline"
            size="sm"
            className="ml-auto"
            onClick={() => void adoptAll()}
          >
            <Plus className="size-3.5" />
            {t("shop.adoptAll")}
          </Button>
        )}
      </h2>
      {status === "loading" && (
        <p className="text-sm text-sub">{t("common.loading")}</p>
      )}
      {status === "error" && (
        <p className="text-sm text-sub">{t("shop.templatesError")}</p>
      )}
      {status === "done" && available.length === 0 && (
        <p className="text-sm text-sub">{t("shop.templatesEmpty")}</p>
      )}
      {status === "done" && available.length > 0 && (
        <ul className="divide-y divide-line/60">
          {available.map((tpl) => (
            <li key={tpl.id} className="flex items-center gap-3 py-2">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm">{tpl.name}</span>
                <span className="font-mono text-xs text-gold tabular-nums">
                  {tpl.price.toLocaleString()}
                </span>
              </span>
              <span className="rounded-[5px] border border-line px-1.5 py-px font-mono text-[9px] font-bold tracking-wider text-sub uppercase">
                {categoryNameOf(tpl) ?? "—"}
              </span>
              <span className="rounded-[5px] border border-line px-1.5 py-px font-mono text-[9px] font-bold tracking-wider text-sub uppercase">
                {tpl.stock === null ? (
                  <InfinityIcon
                    className="size-3"
                    aria-label={t("shop.unlimited")}
                  />
                ) : (
                  `×${tpl.stock}`
                )}
              </span>
              <Button variant="outline" size="sm" onClick={() => void adopt(tpl)}>
                <Plus className="size-3.5" />
                {t("shop.adopt")}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
