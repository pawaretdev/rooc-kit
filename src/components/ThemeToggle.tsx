"use client";

import { useSyncExternalStore } from "react";
import { useT } from "@/lib/i18n";
import { MoonIcon, SunIcon } from "./icons";

export const THEME_STORAGE_KEY = "rooc.theme";

/** Dark/Light segmented row — mobile menu and the Settings page. */
export function ThemeSegment() {
  const { light, setLight } = useTheme();
  const t = useT();
  return (
    <span className="inline-flex overflow-hidden rounded-md border border-line">
      {([false, true] as const).map((isLight) => (
        <button
          key={String(isLight)}
          type="button"
          aria-pressed={light === isLight}
          onClick={() => setLight(isLight)}
          className={`px-2.5 py-0.5 text-xs ${
            light === isLight
              ? "bg-accent font-semibold text-accent-ink"
              : "text-sub hover:text-ink"
          }`}
        >
          {t(isLight ? "theme.light" : "theme.dark")}
        </button>
      ))}
    </span>
  );
}

/** the physical rocker-switch click that pairs with flipping the lights */
let switchClick: HTMLAudioElement | null = null;
function playSwitchClick() {
  try {
    switchClick ??= new Audio("/audios/rocker-switch.wav");
    switchClick.currentTime = 0;
    void switchClick.play().catch(() => {
      // autoplay blocked or audio unavailable — the toggle still works silently
    });
  } catch {
    // Audio unsupported — silent toggle
  }
}

/** re-render whenever the root class changes — toggle() below or any other writer */
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributeFilter: ["class"] });
  return () => observer.disconnect();
}

/**
 * Shared theme state — used by the header icon button and the mobile menu's
 * theme row. Server snapshot says dark; the client snapshot reads the class
 * the boot script already applied, so the first client render is correct.
 */
export function useTheme() {
  const light = useSyncExternalStore(
    subscribe,
    () => document.documentElement.classList.contains("light"),
    () => false,
  );

  const setLight = (next: boolean) => {
    if (next === light) return;
    playSwitchClick();
    document.documentElement.classList.toggle("light", next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next ? "light" : "dark");
    } catch {
      // storage unavailable (private mode) — theme still applies for this visit
    }
  };

  return { light, setLight, toggle: () => setLight(!light) };
}

/**
 * Dark is the design's home base; "light" is an explicit opt-in stored in
 * localStorage and applied as a `light` class on <html>. The boot script in
 * layout.tsx applies the stored class before first paint — this component
 * only reads and toggles it.
 */
export function ThemeToggle() {
  const t = useT();
  const { light, toggle } = useTheme();

  const label = light ? t("theme.toDark") : t("theme.toLight");
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className="press inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line text-sub hover:bg-surface-2 hover:text-ink"
    >
      {light ? <MoonIcon size={15} /> : <SunIcon size={15} />}
    </button>
  );
}
