import type { SVGProps } from "react";

/**
 * Hand-drawn icon set, one stroke language (1.75 / round caps).
 * All icons are decorative next to a text label, so they default aria-hidden.
 */

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function base(size: number, props: SVGProps<SVGSVGElement>) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 16 16",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
    ...props,
  } as const;
}

/** Map pin — spawn locations, best-trip recommendation. */
export function MapPinIcon({ size = 14, ...props }: IconProps) {
  return (
    <svg {...base(size, props)}>
      <path d="M8 14.5s-4.5-4.1-4.5-7.3a4.5 4.5 0 0 1 9 0c0 3.2-4.5 7.3-4.5 7.3Z" />
      <circle cx="8" cy="7" r="1.6" />
    </svg>
  );
}

/** Anchor-down — the blocker holding a row at its level. */
export function BlockerIcon({ size = 14, ...props }: IconProps) {
  return (
    <svg {...base(size, props)}>
      <path d="M8 2.5v9" />
      <path d="M4.5 8.5 8 12l3.5-3.5" />
      <path d="M3 14h10" />
    </svg>
  );
}

/** Check — completed rows / maxed monsters. */
export function CheckIcon({ size = 14, ...props }: IconProps) {
  return (
    <svg {...base(size, props)}>
      <path d="m3 8.5 3.2 3.2L13 5" />
    </svg>
  );
}

/** Approx wave — levels estimated by Quick mode, not yet confirmed. */
export function ApproxIcon({ size = 14, ...props }: IconProps) {
  return (
    <svg {...base(size, props)}>
      <path d="M2.5 6.5c1.5-1.6 3-1.6 4.5 0s3 1.6 4.5 0" />
      <path d="M2.5 10c1.5-1.6 3-1.6 4.5 0s3 1.6 4.5 0" />
    </svg>
  );
}

/** Minus — level steppers. */
export function MinusIcon({ size = 14, ...props }: IconProps) {
  return (
    <svg {...base(size, props)}>
      <path d="M3.5 8h9" />
    </svg>
  );
}

/** Plus — level steppers. */
export function PlusIcon({ size = 14, ...props }: IconProps) {
  return (
    <svg {...base(size, props)}>
      <path d="M8 3.5v9" />
      <path d="M3.5 8h9" />
    </svg>
  );
}

/** Image-off (lucide-style) — monster sprite not available yet. */
export function ImageOffIcon({ size = 14, ...props }: IconProps) {
  return (
    <svg {...base(size, props)}>
      <path d="M13.5 9.5V4A1.5 1.5 0 0 0 12 2.5H6.5" />
      <path d="M3.1 3.1a1.5 1.5 0 0 0-.6 1.2V12A1.5 1.5 0 0 0 4 13.5h7.7c.34 0 .66-.11.92-.31" />
      <path d="m2.5 11.2 2.6-2.6 1.8 1.8" />
      <path d="m2 2 12 12" />
    </svg>
  );
}

/** Globe — the language selector. */
export function GlobeIcon({ size = 14, ...props }: IconProps) {
  return (
    <svg {...base(size, props)}>
      <circle cx="8" cy="8" r="5.5" />
      <path d="M2.5 8h11" />
      <ellipse cx="8" cy="8" rx="2.4" ry="5.5" />
    </svg>
  );
}

/** Sun — shown in dark mode; clicking switches the lights on. */
export function SunIcon({ size = 14, ...props }: IconProps) {
  return (
    <svg {...base(size, props)}>
      <circle cx="8" cy="8" r="3" />
      <path d="M8 1.5v1.8M8 12.7v1.8M1.5 8h1.8M12.7 8h1.8M3.4 3.4l1.3 1.3M11.3 11.3l1.3 1.3M12.6 3.4l-1.3 1.3M4.7 11.3l-1.3 1.3" />
    </svg>
  );
}

/** Moon — shown in light mode; clicking returns to night ops. */
export function MoonIcon({ size = 14, ...props }: IconProps) {
  return (
    <svg {...base(size, props)}>
      <path d="M13.5 9.7A5.8 5.8 0 0 1 6.3 2.5a5.8 5.8 0 1 0 7.2 7.2Z" />
    </svg>
  );
}

/** Arrow right — CTAs and links that navigate. */
export function ArrowRightIcon({ size = 14, ...props }: IconProps) {
  return (
    <svg {...base(size, props)}>
      <path d="M2.5 8h11" />
      <path d="m9 3.5 4.5 4.5L9 12.5" />
    </svg>
  );
}

/** Discord brand mark — official blurple, fixed color in both themes. */
export function DiscordMark({ size = 16, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="#5865F2"
      aria-hidden
      {...props}
    >
      <path d="M20.317 4.3698a19.7913 19.7913 0 0 0-4.8851-1.5152.0741.0741 0 0 0-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 0 0-.0785-.037 19.7363 19.7363 0 0 0-4.8852 1.515.0699.0699 0 0 0-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 0 0 .0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 0 0 .0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 0 0-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 0 1-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 0 1 .0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 0 1 .0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 0 1-.0066.1276 12.2986 12.2986 0 0 1-1.873.8914.0766.0766 0 0 0-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 0 0 .0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 0 0 .0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 0 0-.0312-.0286ZM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189Zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z" />
    </svg>
  );
}

/** Google "G" brand mark — official four-color version. */
export function GoogleMark({ size = 16, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      {...props}
    >
      <path
        fill="#4285F4"
        d="M23.766 12.2764c0-.9175-.0832-1.7998-.2378-2.6485H12.24v5.0084h6.4823c-.2793 1.5045-1.1273 2.7799-2.4023 3.6335v3.0177h3.8898c2.2762-2.0956 3.5889-5.1822 3.5889-9.0111Z"
      />
      <path
        fill="#34A853"
        d="M12.24 24c3.24 0 5.9563-1.0745 7.9418-2.9078l-3.8898-3.0177c-1.0745.72-2.4485 1.1455-4.052 1.1455-3.1163 0-5.7563-2.1044-6.6989-4.9316H1.5165v3.1163C3.4914 21.3273 7.5651 24 12.24 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.5411 14.2884c-.24-.72-.3775-1.4885-.3775-2.2884s.1375-1.5684.3775-2.2884V6.5953H1.5165C.6945 8.2331.24 10.0651.24 12s.4545 3.7669 1.2765 5.4047l4.0246-3.1163Z"
      />
      <path
        fill="#EA4335"
        d="M12.24 4.7797c1.7618 0 3.3436.6055 4.5873 1.7945l3.4415-3.4416C18.1909 1.19 15.4745 0 12.24 0 7.5651 0 3.4914 2.6727 1.5165 6.5953l4.0246 3.1163c.9426-2.8272 3.5826-4.9316 6.6989-4.9316Z"
      />
    </svg>
  );
}

/**
 * Brand mark — a generic round slime blob drawn from scratch (our own shape,
 * not a game asset). Filled, not stroked; takes the accent color.
 */
export function BlobMark({ size = 18, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden
      {...props}
    >
      <path d="M10 2.2c3.6 0 7.3 3.4 7.3 7.6 0 4.6-3.3 7.4-7.3 7.4S2.7 14.4 2.7 9.8C2.7 5.6 6.4 2.2 10 2.2Z" />
      <ellipse
        cx="6.9"
        cy="6.4"
        rx="1.7"
        ry="1"
        transform="rotate(-28 6.9 6.4)"
        fill="var(--bg)"
        opacity="0.55"
      />
    </svg>
  );
}
