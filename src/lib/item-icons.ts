/**
 * Gold Shop item icons — in-game art shipped under /public/img/items.
 * Ids are canonical English file stems (never translated, like monster ids);
 * an item stores the id in `icon`, and the URL is derived via itemIconUrl().
 * Add a PNG + a row here; `item-icons.test.ts` checks the two stay in step.
 */
export const ITEM_ICONS = [
  { id: "mora-coin", label: "Mora Coin" },
  { id: "poring-coin", label: "Poring Coin" },
  { id: "blue-star-coin", label: "Blue Star Coin" },
  { id: "purple-star-coin", label: "Purple Star Coin" },
  { id: "blessed-weapon-ore", label: "Blessed Weapon Ore" },
  { id: "blessed-armor-ore", label: "Blessed Armor Ore" },
  { id: "binding-stone-ii", label: "Binding Stone II" },
  { id: "binding-stone-iii", label: "Binding Stone III" },
  { id: "elunium", label: "Elunium" },
  { id: "oridecon", label: "Oridecon" },
  { id: "skill-manual", label: "Skill Manual" },
  { id: "card-fragment-blue", label: "Card Fragment (Blue)" },
  { id: "card-fragment-purple", label: "Card Fragment (Purple)" },
  { id: "prestige-chest", label: "Prestige Chest" },
  { id: "heart-of-valor", label: "Heart of Valor" },
  { id: "light-dark-chest", label: "Light-Dark Opt. Chest" },
  { id: "day-night-chest", label: "Day-Night Opt. Chest" },
  { id: "time-space-chest", label: "Time-Space Opt. Chest" },
  { id: "sky-terra-chest", label: "Sky-Terra Opt. Chest" },
  { id: "purple-feather-chest", label: "Purple Feather Opt. Chest" },
] as const;

export type ItemIconId = (typeof ITEM_ICONS)[number]["id"];

const ICON_IDS: ReadonlySet<string> = new Set(ITEM_ICONS.map((i) => i.id));

export function isItemIconId(value: unknown): value is ItemIconId {
  return typeof value === "string" && ICON_IDS.has(value);
}

export function itemIconLabel(id: string): string {
  return ITEM_ICONS.find((i) => i.id === id)?.label ?? id;
}
