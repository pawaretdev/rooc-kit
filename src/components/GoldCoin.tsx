import { goldCoinUrl } from "@/lib/images";

const SIZE = { sm: "size-7", md: "size-8", lg: "size-10" } as const;

/**
 * The Gold Shop currency mark — the in-game gold coin, used wherever a gold
 * amount is shown. Decorative: the surrounding label/number carries meaning.
 */
export function GoldCoin({
  size = "md",
  className = "",
}: {
  size?: keyof typeof SIZE;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={goldCoinUrl()}
      alt=""
      draggable={false}
      className={`inline-block shrink-0 object-contain ${SIZE[size]} ${className}`}
    />
  );
}
