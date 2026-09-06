"use client";

import { Pencil } from "lucide-react";
import { GoldCoin } from "@/components/GoldCoin";
import type { GoldIncomeRecord } from "@/lib/local-db";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { balance, weeklyIncomeOf } from "./plan-math";

function Tile({
  label,
  children,
  divider,
}: {
  label: string;
  children: React.ReactNode;
  /** vertical rule between tiles once they sit side by side */
  divider?: boolean;
}) {
  return (
    <div className={`px-4 py-3 ${divider ? "border-l border-line" : ""}`}>
      <span className="block font-mono text-[10px] font-bold tracking-wider text-sub uppercase">
        {label}
      </span>
      {/* min-height keeps the three tiles level; the coin on the first one
          is taller than the text and would otherwise ride up into the label */}
      <span className="mt-1.5 flex min-h-10 items-center">{children}</span>
    </div>
  );
}

/**
 * The week's bottom line: gold needed, income estimate, and the resulting
 * surplus/shortfall.
 *
 * On a phone the answer has to survive scrolling — you decide what to buy while
 * looking at the shop, not at the top of the page — so below `sm` the tiles
 * collapse into a bar pinned to the bottom of the viewport, thumb-side. The
 * three-tile console stays on wider screens where it is always in view.
 *
 * Motion: the total pops whenever it moves (the app's "this number changed"
 * signal), and the balance pops only when it crosses between covered and short
 * — the one threshold that changes what the player should do. Screen readers
 * get the same news through the polite live region.
 */
export function PlanSummary({
  total,
  income,
  onEditIncome,
}: {
  total: number;
  income: GoldIncomeRecord | null;
  onEditIncome: () => void;
}) {
  const t = useT();
  const weekly = income ? weeklyIncomeOf(income) : undefined;
  const diff = weekly === undefined ? undefined : balance(total, weekly);
  const short = diff !== undefined && diff < 0;

  const totalNumber = (
    <span
      key={total}
      className="animate-lv-pop inline-flex items-center gap-1.5 font-mono font-bold text-gold tabular-nums"
    >
      <GoldCoin size="lg" />
      {total.toLocaleString()}
    </span>
  );

  const balanceNumber =
    diff === undefined ? (
      <span className="font-mono font-bold text-sub tabular-nums">—</span>
    ) : (
      <span
        // keyed on the verdict, not the value: the pop marks crossing between
        // covered and short, not every single tap
        key={short ? "short" : "covered"}
        className={`animate-lv-pop font-mono font-bold tabular-nums ${
          short ? "text-danger" : "text-gold"
        }`}
      >
        {Math.abs(diff).toLocaleString()}
      </span>
    );

  return (
    <>
      {/* desktop / tablet: the full console row */}
      <section
        aria-labelledby="plan-summary-heading"
        className="relative hidden rounded-xl border border-line bg-surface sm:block"
      >
        <h2 id="plan-summary-heading" className="sr-only">
          {t("shop.summary")}
        </h2>
        <div className="grid grid-cols-3">
          <Tile label={t("shop.totalNeeded")}>
            <span className="text-xl">{totalNumber}</span>
          </Tile>

          <Tile label={t("shop.income")} divider>
            {weekly === undefined ? (
              <Button
                variant="outline"
                size="xs"
                className="border-dashed text-sub"
                onClick={onEditIncome}
              >
                {t("shop.setIncome")}
              </Button>
            ) : (
              <span className="font-mono text-xl font-bold tabular-nums">
                {weekly.toLocaleString()}
                <span className="ml-1 font-sans text-xs font-normal text-sub">
                  {t("shop.perWeek")}
                </span>
              </span>
            )}
          </Tile>

          <Tile label={short ? t("shop.shortfall") : t("shop.surplus")} divider>
            <span aria-live="polite" className="flex items-center text-xl">
              {balanceNumber}
            </span>
          </Tile>
        </div>

        {income && (
          <Button
            variant="ghost"
            size="icon-xs"
            className="absolute top-2 right-2 text-sub"
            aria-label={t("shop.incomeTitle")}
            title={t("shop.incomeTitle")}
            onClick={onEditIncome}
          >
            <Pencil className="size-3.5" />
          </Button>
        )}
      </section>

      {/* phone: the answer rides along at the bottom of the screen */}
      <section
        aria-labelledby="plan-summary-heading-mobile"
        className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/95 px-4 py-2 backdrop-blur-sm sm:hidden"
      >
        <h2 id="plan-summary-heading-mobile" className="sr-only">
          {t("shop.summary")}
        </h2>
        <div className="mx-auto flex max-w-5xl items-center gap-4">
          <span className="min-w-0">
            <span className="block font-mono text-[10px] font-bold tracking-wider text-sub uppercase">
              {t("shop.totalNeeded")}
            </span>
            <span className="text-base">{totalNumber}</span>
          </span>

          <span className="min-w-0 border-l border-line pl-4">
            <span className="block font-mono text-[10px] font-bold tracking-wider text-sub uppercase">
              {short ? t("shop.shortfall") : t("shop.surplus")}
            </span>
            <span aria-live="polite" className="flex items-center text-base">
              {balanceNumber}
            </span>
          </span>

          <Button
            variant="outline"
            size="sm"
            className="ml-auto shrink-0"
            aria-label={t("shop.incomeTitle")}
            onClick={onEditIncome}
          >
            <Pencil className="size-3.5" />
            {weekly === undefined ? t("shop.setIncome") : t("shop.income")}
          </Button>
        </div>
      </section>
    </>
  );
}
