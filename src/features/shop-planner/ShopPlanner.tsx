"use client";

import { useEffect, useState } from "react";
import { CalendarDays, Plus, ShoppingBasket, Sparkles } from "lucide-react";
import {
  addGameAccount,
  pruneStaleBuyPlans,
  SELECTED_ACCOUNT_KEY,
} from "@/lib/local-db";
import { useT } from "@/lib/i18n";
import { useSetting } from "@/features/monster-research/useProgress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AccountTabs } from "@/features/dailies/AccountTabs";
import { AccountsDialog } from "@/features/dailies/AccountsDialog";
import { useCurrentPeriods, useGameAccounts } from "@/features/dailies/useDailies";
import { GoldCalendar } from "@/features/gold-diary/GoldCalendar";
import { BuyPlanView } from "./BuyPlanView";
import { CatalogDialog } from "./CatalogDialog";
import { CategoriesDialog } from "./CategoriesDialog";
import { IncomeDialog } from "./IncomeDialog";
import { PlanSummary } from "./PlanSummary";
import { diaryAvgPerDay, planTotal, previousWeeklyKey } from "./plan-math";
import {
  useBuyPlan,
  useGoldDiary,
  useGoldIncome,
  useShopCategories,
  useShopItems,
} from "./useShopPlanner";

function FirstRunCard() {
  const t = useT();
  const [name, setName] = useState("");

  return (
    <section className="mx-auto max-w-md rounded-xl border border-line bg-surface p-6 text-center">
      <ShoppingBasket className="mx-auto mb-3 size-8 text-accent" />
      <h2 className="mb-1 font-bold">{t("dailies.createFirstAccount")}</h2>
      <p className="mb-4 text-sm text-sub">{t("shop.firstRunHint")}</p>
      <form
        className="flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const trimmed = name.trim();
          if (trimmed) void addGameAccount(trimmed);
        }}
      >
        <Input
          value={name}
          maxLength={100}
          placeholder={t("dailies.defaultAccountName")}
          aria-label={t("dailies.accountName")}
          className="min-w-0 flex-1"
          onChange={(e) => setName(e.target.value)}
        />
        <Button type="submit" disabled={!name.trim()}>
          <Plus className="size-4" />
          {t("dailies.addAccount")}
        </Button>
      </form>
    </section>
  );
}

type OpenDialog = "catalog" | "categories" | "accounts" | "income" | null;

export function ShopPlanner() {
  const t = useT();
  const accounts = useGameAccounts();
  const categories = useShopCategories();
  const items = useShopItems();
  const periods = useCurrentPeriods();
  const [dialog, setDialog] = useState<OpenDialog>(null);

  // Same key as Dailies — one notion of "current account" across the app.
  const selectedSetting = useSetting<string | undefined>(
    SELECTED_ACCOUNT_KEY,
    undefined,
  );
  const selected =
    accounts?.find((a) => a.id === selectedSetting) ?? accounts?.[0];

  const lastWeeklyKey = previousWeeklyKey(periods.weekly);
  const plan = useBuyPlan(selected?.id, periods.weekly);
  const lastWeekPlan = useBuyPlan(selected?.id, lastWeeklyKey);
  const income = useGoldIncome(selected?.id);
  const diary = useGoldDiary(selected?.id);
  // the shared gold-diary surfaces take the all-accounts shape; here it's one
  const diaryByAccount =
    selected && diary ? new Map([[selected.id, diary]]) : undefined;
  const today = periods.daily.slice(2);

  // Anything older than last week is dead weight; last week's plan is kept so
  // it can be offered back as the starting point for this one.
  useEffect(() => {
    void pruneStaleBuyPlans([periods.weekly, lastWeeklyKey]);
  }, [periods.weekly, lastWeeklyKey]);

  if (accounts === undefined || categories === undefined || items === undefined) {
    return <p className="py-10 text-center text-sub">{t("common.loading")}</p>;
  }

  const hasCatalog = items.length > 0;

  return (
    /* wide enough for a five-card shop row, like the in-game grid; the bottom
       padding clears the mobile summary bar that floats over the page */
    <div className="mx-auto w-full max-w-5xl space-y-5 pb-16 sm:pb-0">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-extrabold tracking-tight">
          {t("shop.title")}
        </h1>
      </div>

      {accounts.length === 0 ? (
        <FirstRunCard />
      ) : (
        <>
          <AccountTabs
            accounts={accounts}
            selectedId={selected?.id ?? ""}
            onManage={() => setDialog("accounts")}
          />

          {!hasCatalog ? (
            <section className="rounded-xl border border-line bg-surface p-6 text-center">
              <ShoppingBasket className="mx-auto mb-3 size-8 text-accent" />
              <p className="mb-4 text-sm text-sub">{t("shop.emptyCatalog")}</p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Button size="sm" onClick={() => setDialog("catalog")}>
                  <Sparkles className="size-3.5" />
                  {t("shop.browseSuggestions")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDialog("catalog")}
                >
                  <Plus className="size-3.5" />
                  {t("shop.addOwnItem")}
                </Button>
              </div>
            </section>
          ) : (
            selected &&
            plan !== undefined &&
            lastWeekPlan !== undefined &&
            income !== undefined && (
              /* keyed by account: switching IDs replays the entrance, which
                 reads as "this is a different ID's plan" */
              <div key={selected.id} className="animate-rise-in space-y-4">
                <PlanSummary
                  total={planTotal(items, plan)}
                  income={income}
                  onEditIncome={() => setDialog("income")}
                />
                <BuyPlanView
                  accountId={selected.id}
                  weeklyKey={periods.weekly}
                  lastWeeklyKey={lastWeeklyKey}
                  categories={categories}
                  items={items}
                  plan={plan}
                  lastWeekPlan={lastWeekPlan}
                  onEditShop={() => setDialog("catalog")}
                />
              </div>
            )
          )}

          {/* the diary feeds the income estimate, so its history lives on this
              page in full — the calendar opens on today for quick entry */}
          {selected && diaryByAccount && (
            <section className="space-y-4 rounded-xl border border-line bg-surface p-4">
              <div>
                <h2 className="flex items-center gap-2 text-sm font-bold">
                  <CalendarDays className="size-4 text-gold" />
                  {t("gold.calendarTitle")}
                </h2>
                <p className="mt-1 text-xs text-sub">{t("gold.calendarHint")}</p>
              </div>
              <GoldCalendar
                key={selected.id}
                accounts={[selected]}
                initialAccountId={selected.id}
                diary={diaryByAccount}
                today={today}
                initialSelected={today}
              />
            </section>
          )}
        </>
      )}

      <p className="px-1 text-xs text-sub">{t("shop.resetNote")}</p>

      <CatalogDialog
        open={dialog === "catalog"}
        onClose={() => setDialog(null)}
        categories={categories}
        items={items}
        onManageCategories={() => setDialog("categories")}
      />
      <CategoriesDialog
        open={dialog === "categories"}
        onClose={() => setDialog(null)}
        categories={categories}
        items={items}
      />
      <AccountsDialog
        open={dialog === "accounts"}
        onClose={() => setDialog(null)}
        accounts={accounts}
      />
      {selected && (
        <IncomeDialog
          open={dialog === "income"}
          onClose={() => setDialog(null)}
          accountId={selected.id}
          income={income ?? null}
          diaryAvg={diary ? diaryAvgPerDay(diary) : undefined}
        />
      )}
    </div>
  );
}
