"use client";

import { useState } from "react";
import { Pencil, RotateCcw, ShoppingBasket, Store, X } from "lucide-react";
import {
  repeatBuyPlan,
  setPlanQuantity,
  type ShopCategoryRecord,
  type ShopItemRecord,
} from "@/lib/local-db";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { clampQuantity, planTotal, type PlanMap } from "./plan-math";
import { ItemIcon } from "./ItemIcon";
import { CategoryTabs, ShopCardGrid, ShopItemCard } from "./ShopGrid";

/**
 * Two clearly framed sections. The shop, laid out like the in-game Gold Shop
 * (category tabs + item cards), owns every quantity decision — tap to add, then
 * step or type inside the card. The section below is the receipt: what this
 * week costs, line by line, with one way out per line. One number, one home.
 */
export function BuyPlanView({
  accountId,
  weeklyKey,
  lastWeeklyKey,
  categories,
  items,
  plan,
  lastWeekPlan,
  onEditShop,
}: {
  accountId: string;
  weeklyKey: string;
  lastWeeklyKey: string;
  categories: ShopCategoryRecord[];
  items: ShopItemRecord[];
  plan: PlanMap;
  /** last week's quantities — offered back when this week is still empty */
  lastWeekPlan: PlanMap;
  /** receives the open category so the editor can start on the same shelf */
  onEditShop: (activeCategoryId?: string) => void;
}) {
  const t = useT();
  const withItems = categories.filter((category) =>
    items.some((item) => item.categoryId === category.id),
  );
  const [activeTab, setActiveTab] = useState<string | undefined>(undefined);
  // Fall back to the first non-empty category when nothing (or a stale id) is active.
  const activeId =
    withItems.find((c) => c.id === activeTab)?.id ?? withItems[0]?.id;

  const setQty = (item: ShopItemRecord, next: number) =>
    void setPlanQuantity(accountId, item.id, weeklyKey, clampQuantity(item, next));

  const planned = items.filter((item) => (plan.get(item.id) ?? 0) > 0);
  const visible = items.filter((item) => item.categoryId === activeId);

  // Only items that still exist count towards the offer to repeat.
  const lastWeekItems = items.filter((item) => (lastWeekPlan.get(item.id) ?? 0) > 0);
  const lastWeekTotal = planTotal(items, lastWeekPlan);

  return (
    <div className="space-y-4">
      {/* the shop — in-game style category tabs + card grid; browsing comes
          first, the resulting haul is summarised underneath */}
      <section className="rounded-xl border border-line bg-surface">
        <header className="flex items-center gap-2 border-b border-line px-4 py-3">
          <Store className="size-4 text-gold" />
          <h2 className="text-sm font-bold">{t("shop.catalog")}</h2>
          <Button
            variant="outline"
            size="sm"
            className="ml-auto"
            onClick={() => onEditShop(activeId)}
          >
            <Pencil className="size-3.5" />
            {t("shop.editShop")}
          </Button>
        </header>
        <div className="space-y-3 p-4">
          {withItems.length > 1 && activeId && (
            <CategoryTabs
              categories={withItems}
              activeId={activeId}
              onSelect={setActiveTab}
            />
          )}
          {visible.length === 0 ? (
            <p className="py-4 text-center text-sm text-sub">
              {t("shop.noCategoryItems")}
            </p>
          ) : (
            /* keyed by category so switching tabs replays the sweep — it reads
               as "different shelf", not as the same grid mutating in place */
            <div key={activeId}>
              <ShopCardGrid>
                {visible.map((item, i) => (
                  <div
                    key={item.id}
                    className="animate-stagger-in h-full"
                    // capped so a 40-item category still finishes in ~300ms
                    style={{ "--stagger-i": Math.min(i, 10) } as React.CSSProperties}
                  >
                    <ShopItemCard
                      item={item}
                      planned={plan.get(item.id) ?? 0}
                      onChange={(next) => setQty(item, next)}
                    />
                  </div>
                ))}
              </ShopCardGrid>
            </div>
          )}
        </div>
      </section>

      {/* the week's receipt — everything planned, across all categories */}
      <section className="rounded-xl border border-line bg-surface">
        <header className="flex items-center gap-2 border-b border-line px-4 py-3">
          <ShoppingBasket className="size-4 text-accent" />
          <h2 className="text-sm font-bold">{t("shop.willBuy")}</h2>
          {planned.length > 0 && (
            <span
              // remount on change so the count pops — the app's established
              // "this number just moved" signal
              key={planned.length}
              className="animate-lv-pop rounded-md bg-accent px-1.5 py-px font-mono text-xs font-bold text-accent-ink tabular-nums"
            >
              {planned.length}
            </span>
          )}
        </header>
        {planned.length === 0 ? (
          <div className="px-4 py-4">
            <p className="text-sm text-sub">{t("shop.planEmpty")}</p>
            {/* a weekly plan repeats almost unchanged, so last week's is the
                fastest way back to a full plan — offered, never auto-applied */}
            {lastWeekItems.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg border border-dashed border-line p-3">
                <span className="font-mono text-xs text-sub tabular-nums">
                  {t("shop.lastWeek")
                    .replace("{n}", String(lastWeekItems.length))
                    .replace("{g}", lastWeekTotal.toLocaleString())}
                </span>
                <Button
                  size="sm"
                  className="ml-auto"
                  onClick={() =>
                    void repeatBuyPlan(accountId, lastWeeklyKey, weeklyKey)
                  }
                >
                  <RotateCcw className="size-3.5" />
                  {t("shop.repeatLastWeek")}
                </Button>
              </div>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-line/60 px-4">
            {planned.map((item) => {
              const qty = plan.get(item.id) ?? 0;
              return (
                /* a line arriving here is the consequence of a tap up in the
                   grid — the rise makes that cause and effect visible */
                <li
                  key={item.id}
                  className="animate-rise-in flex items-center gap-3 py-2.5"
                >
                  <ItemIcon icon={item.icon} frame={item.frame} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {item.name}
                    </span>
                    <span className="font-mono text-xs text-sub tabular-nums">
                      {item.price.toLocaleString()} × {qty}
                    </span>
                  </span>
                  <span className="text-right font-mono text-sm font-bold text-gold tabular-nums">
                    {(item.price * qty).toLocaleString()}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t("shop.removeFromPlan").replace("{name}", item.name)}
                    className="text-sub hover:text-danger"
                    onClick={() => setQty(item, 0)}
                  >
                    <X className="size-3.5" />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
