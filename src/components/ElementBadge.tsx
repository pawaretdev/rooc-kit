import type { Element } from "@/lib/game-data";

/**
 * Element color classes must be static strings so Tailwind can see them.
 * Color is never the only signal — the element name (canonical English)
 * always renders next to the dot.
 */
export const ELEMENT_TEXT: Record<Element, string> = {
  Neutral: "text-el-neutral",
  Wind: "text-el-wind",
  Earth: "text-el-earth",
  Fire: "text-el-fire",
  Water: "text-el-water",
  Poison: "text-el-poison",
  Holy: "text-el-holy",
  Shadow: "text-el-shadow",
  Ghost: "text-el-ghost",
  Undead: "text-el-undead",
};

export const ELEMENT_TINT: Record<Element, string> = {
  Neutral: "bg-el-neutral/12 text-el-neutral",
  Wind: "bg-el-wind/12 text-el-wind",
  Earth: "bg-el-earth/12 text-el-earth",
  Fire: "bg-el-fire/12 text-el-fire",
  Water: "bg-el-water/12 text-el-water",
  Poison: "bg-el-poison/12 text-el-poison",
  Holy: "bg-el-holy/12 text-el-holy",
  Shadow: "bg-el-shadow/12 text-el-shadow",
  Ghost: "bg-el-ghost/12 text-el-ghost",
  Undead: "bg-el-undead/12 text-el-undead",
};

/** Colored dot + element name. */
export function ElementBadge({
  element,
  className = "",
}: {
  element: Element;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <span
        aria-hidden
        className={`inline-block h-2 w-2 rounded-full bg-current ${ELEMENT_TEXT[element]}`}
      />
      {element}
    </span>
  );
}
