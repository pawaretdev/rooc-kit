"use client";

import {
  Check,
  Coins,
  Infinity as InfinityIcon,
  Minus,
  Package,
  Plus,
} from "lucide-react";
import { MAX_PLAN_QTY } from "@/lib/local-db";
import { useLocale, useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Game-style Gold Shop surfaces, shared between the user's planner and the
 * admin template preview: category tabs on top, item cards in a grid below —
 * mirroring the in-game shop (name up top, icon tile, price with a coin, and
 * the weekly-limit line for limited items).
 */

export interface ShopGridCategory {
  id: string;
  name: string;
}

/**
 * Category switcher. Deliberately a pressed-button group rather than ARIA tabs:
 * the same pattern AccountTabs and the layout segment already use, and the grid
 * below is a plain region, not a tabpanel with roving focus.
 */
export function CategoryTabs({
  categories,
  activeId,
  onSelect,
}: {
  categories: ShopGridCategory[];
  activeId: string;
  onSelect: (id: string) => void;
}) {
  const t = useT();
  return (
    <div
      role="group"
      aria-label={t("shop.categories")}
      className="flex flex-wrap items-center gap-1.5"
    >
      {categories.map((category) => {
        const active = category.id === activeId;
        return (
          <button
            key={category.id}
            type="button"
            aria-pressed={active}
            onClick={() => onSelect(category.id)}
            className={`press rounded-lg px-3.5 py-1.5 text-sm ${
              active
                ? "bg-accent font-semibold text-accent-ink"
                : "text-sub hover:bg-surface-2 hover:text-ink"
            }`}
          >
            {category.name}
          </button>
        );
      })}
    </div>
  );
}

export interface ShopCardData {
  id: string;
  name: string;
  /** undefined = Unlimited */
  stock?: number;
  price: number;
}

/** How many of an item can be planned — its stock, or the unlimited cap. */
export function planCap(item: Pick<ShopCardData, "stock">): number {
  return item.stock ?? MAX_PLAN_QTY;
}

/**
 * The stencilled console look (mono + uppercase + wide tracking) is an English
 * treatment: Geist Mono carries no Thai glyphs, `uppercase` is a no-op there,
 * and positive tracking pulls Thai combining marks off their base letters.
 * Thai keeps the weight and drops the stencil.
 */
export function useStencilType(): string {
  const { locale } = useLocale();
  return locale === "th"
    ? "font-bold"
    : "font-mono font-extrabold tracking-[0.12em] uppercase";
}

/**
 * Typed quantity field — stepping one at a time is hopeless for a 5,000-per-week
 * item, so the number is directly editable. The draft is local while typing and
 * commits on blur/Enter, so a half-typed value never wipes the row.
 */
export function QtyField({
  value,
  max,
  label,
  onCommit,
  className = "",
}: {
  value: number;
  max: number;
  label: string;
  onCommit: (next: number) => void;
  className?: string;
}) {
  return (
    <Input
      // remount on a committed change so the field resyncs; while typing the
      // DOM holds the draft, so a half-typed number never reaches the plan
      key={value}
      defaultValue={String(value)}
      type="number"
      min={0}
      max={max}
      inputMode="numeric"
      aria-label={label}
      className={`h-8 px-1 text-center font-mono tabular-nums ${className}`}
      onBlur={(e) => {
        const typed = Math.floor(Number(e.target.value));
        if (e.target.value.trim() === "" || !Number.isFinite(typed)) {
          e.target.value = String(value);
          return;
        }
        const next = Math.max(0, Math.min(typed, max));
        e.target.value = String(next);
        if (next !== value) onCommit(next);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
      }}
    />
  );
}

/**
 * One game-style item card, and the only place a quantity is edited: the body
 * is a "+1" tap target, and once anything is planned a quantity row appears
 * inside the card — step, type an exact amount, or jump to the weekly limit.
 * Nothing overhangs the card edges, so neighbouring cards never collide.
 */
export function ShopItemCard({
  item,
  planned = 0,
  dimmed = false,
  badge,
  onChange,
}: {
  item: ShopCardData;
  /** quantity planned this week (interactive mode) */
  planned?: number;
  /** render faded — the admin preview uses this for drafts */
  dimmed?: boolean;
  /** small corner tag, e.g. the admin preview's draft marker */
  badge?: React.ReactNode;
  onChange?: (next: number) => void;
}) {
  const t = useT();
  const stencil = useStencilType();
  const cap = planCap(item);
  const remaining =
    item.stock === undefined ? undefined : Math.max(0, item.stock - planned);
  const maxed = remaining === 0;
  const interactive = onChange !== undefined;

  /**
   * The card button is the only thing announced for the whole card, so its name
   * has to carry what a sighted user reads off it: price, what's left, and how
   * much is already planned.
   */
  const spokenName = [
    remaining === undefined
      ? t("shop.cardSummaryUnlimited")
          .replace("{name}", item.name)
          .replace("{price}", String(item.price))
      : t("shop.cardSummary")
          .replace("{name}", item.name)
          .replace("{price}", String(item.price))
          .replace("{n}", String(remaining)),
    planned > 0 ? t("shop.planned").replace("{n}", String(planned)) : "",
    t("shop.addOne").replace("{name}", item.name),
  ]
    .filter(Boolean)
    .join(" · ");

  const body = (
    <>
      {/* extra right padding while the ×n badge is out — truncate can't see it */}
      <span
        className={`block truncate pt-2 text-center text-sm font-semibold ${
          planned > 0 || badge ? "pr-9 pl-2" : "px-2"
        }`}
      >
        {item.name}
      </span>
      <span className="mx-auto my-2 flex h-14 w-14 items-center justify-center rounded-lg bg-surface-2">
        <Package className="size-7 text-sub/60" />
      </span>
      <span className="block min-h-4 px-2 text-center font-mono text-[10px] text-sub tabular-nums">
        {item.stock !== undefined &&
          t("shop.weeklyLimit")
            .replace("{n}", String(remaining ?? item.stock))
            .replace("{m}", String(item.stock))}
      </span>
      <span className="mt-1 flex items-center justify-center gap-1.5 border-t border-line bg-surface-2/60 py-1.5 font-mono text-sm font-bold text-gold tabular-nums">
        <Coins className="size-3.5" />
        {item.price.toLocaleString()}
        {item.stock === undefined && (
          <InfinityIcon className="size-3 text-sub" aria-label={t("shop.unlimited")} />
        )}
      </span>
    </>
  );

  return (
    <div
      className={`relative overflow-hidden rounded-xl border ${
        maxed
          ? "animate-row-complete border-gold/70"
          : planned > 0
            ? "border-accent"
            : "border-line"
      } ${maxed ? "bg-surface-2/60" : "bg-surface"} ${dimmed ? "opacity-50" : ""}`}
    >
      <div className="relative">
        {interactive ? (
          <button
            type="button"
            aria-label={spokenName}
            disabled={maxed}
            onClick={() => onChange(planned + 1)}
            className="press block w-full text-left disabled:cursor-default"
          >
            {body}
          </button>
        ) : (
          <div>{body}</div>
        )}

        {/* mission stamp over a scrim — the same "nothing left to do here"
            vocabulary the tracker uses for a completed row */}
        {maxed && (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-surface/80">
            <span
              // the class rotation is what reduced-motion users keep, since the
              // keyframe (which lands on the same angle) is switched off there
              className={`animate-stamp-in inline-flex -rotate-6 items-center gap-1.5 rounded-md border-2 border-gold/70 bg-surface px-2.5 py-1 text-[11px] text-gold ${stencil}`}
            >
              <Check className="size-3" />
              {t("shop.maxedOut")}
            </span>
          </span>
        )}
      </div>

      {/* quantity row lives inside the card — no overhang, no collisions */}
      {interactive && planned > 0 && (
        <div className="flex items-center gap-1 border-t border-line px-1.5 py-1.5">
          <Button
            variant="outline"
            size="icon-sm"
            aria-label={`${item.name} −1`}
            onClick={() => onChange(planned - 1)}
          >
            <Minus className="size-3.5" />
          </Button>
          <QtyField
            value={planned}
            max={cap}
            label={`${item.name} · ${t("shop.quantity")}`}
            onCommit={onChange}
            className="min-w-0 flex-1"
          />
          <Button
            variant="outline"
            size="icon-sm"
            aria-label={`${item.name} +1`}
            disabled={planned >= cap}
            onClick={() => onChange(planned + 1)}
          >
            <Plus className="size-3.5" />
          </Button>
          {/* "fill to the weekly limit" only means something when a limit
              exists — unlimited items get the typed field instead */}
          {item.stock !== undefined && item.stock > 1 && (
            <Button
              variant="ghost"
              size="sm"
              className={`px-1.5 text-[10px] ${stencil}`}
              disabled={planned >= cap}
              onClick={() => onChange(cap)}
            >
              {t("shop.max")}
            </Button>
          )}
        </div>
      )}

      {planned > 0 && (
        <span
          aria-hidden
          className={`absolute top-1 right-1 rounded-md px-1.5 py-px font-mono text-[10px] font-bold tabular-nums ${
            maxed ? "bg-gold text-gold-ink" : "bg-accent text-accent-ink"
          }`}
        >
          ×{planned}
        </span>
      )}
      {badge}
    </div>
  );
}

/** Five across on a wide screen — the in-game shop's row length. */
export function ShopCardGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {children}
    </div>
  );
}
