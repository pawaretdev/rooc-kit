"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { Archive, Menu, Settings, X } from "lucide-react";
import { useT } from "@/lib/i18n";
import { AuthMenu } from "./AuthMenu";
import { LocaleSegment } from "./LocaleSegment";
import { LocaleSwitch } from "./LocaleSwitch";
import { ThemeSegment, ThemeToggle } from "./ThemeToggle";
import { BlobMark } from "./icons";

function SoonChip() {
  const t = useT();
  return (
    <span className="rounded-[5px] border border-line px-1.5 py-px font-mono text-[9px] font-bold tracking-wider text-gold uppercase">
      {t("nav.soon")}
    </span>
  );
}

export function AppHeader() {
  const t = useT();
  const pathname = usePathname();
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);

  const trackerActive = pathname === "/tracker";
  const worldMapActive = pathname === "/world-map";
  const dailiesActive = pathname === "/dailies";
  const shopActive = pathname === "/shop-planner";
  const guideActive = pathname === "/guide" || pathname.startsWith("/guide/");

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-surface/95 backdrop-blur-sm">
      <div className="flex h-14 items-center gap-5 px-4 sm:px-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 font-bold tracking-tight"
        >
          <BlobMark size={20} className="text-accent" />
          ROOC Kit
        </Link>

        {/* desktop nav */}
        <nav className="hidden items-center gap-1 text-sm xl:flex">
          <Link
            href="/tracker"
            aria-current={trackerActive ? "page" : undefined}
            className={`press rounded-lg px-3.5 py-1.5 ${
              trackerActive
                ? "bg-accent font-semibold text-accent-ink"
                : "text-sub hover:bg-surface-2 hover:text-ink"
            }`}
          >
            {t("nav.monsterResearch")}
          </Link>
          <Link
            href="/world-map"
            aria-current={worldMapActive ? "page" : undefined}
            className={`press rounded-lg px-3.5 py-1.5 ${
              worldMapActive
                ? "bg-accent font-semibold text-accent-ink"
                : "text-sub hover:bg-surface-2 hover:text-ink"
            }`}
          >
            {t("nav.worldMap")}
          </Link>
          <Link
            href="/dailies"
            aria-current={dailiesActive ? "page" : undefined}
            className={`press rounded-lg px-3.5 py-1.5 ${
              dailiesActive
                ? "bg-accent font-semibold text-accent-ink"
                : "text-sub hover:bg-surface-2 hover:text-ink"
            }`}
          >
            {t("nav.dailies")}
          </Link>
          <Link
            href="/shop-planner"
            aria-current={shopActive ? "page" : undefined}
            className={`press rounded-lg px-3.5 py-1.5 ${
              shopActive
                ? "bg-accent font-semibold text-accent-ink"
                : "text-sub hover:bg-surface-2 hover:text-ink"
            }`}
          >
            {t("nav.shopPlanner")}
          </Link>
          <Link
            href="/guide"
            aria-current={guideActive ? "page" : undefined}
            className={`press rounded-lg px-3.5 py-1.5 ${guideActive ? "bg-accent font-semibold text-accent-ink" : "text-sub hover:bg-surface-2 hover:text-ink"}`}
          >
            {t("nav.guide")}
          </Link>
          <span
            aria-disabled
            className="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-sub/75"
          >
            {t("nav.marketAlert")}
            <SoonChip />
          </span>
        </nav>

        <div className="ml-auto flex items-center gap-2.5">
          <span className="hidden sm:inline-flex">
            <ThemeToggle />
          </span>
          {/* signed-in users switch language inside the account dropdown */}
          {!session?.user && (
            <span className="hidden sm:inline-flex">
              <LocaleSwitch />
            </span>
          )}
          <AuthMenu />
          <button
            type="button"
            aria-expanded={menuOpen}
            aria-label={t("nav.menu")}
            onClick={() => setMenuOpen((o) => !o)}
            className="press inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line text-sub hover:bg-surface-2 hover:text-ink xl:hidden"
          >
            {menuOpen ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>
      </div>

      {/* mobile menu sheet */}
      {menuOpen && (
        <nav className="animate-rise-in border-t border-line px-3 py-2 xl:hidden">
          <Link
            href="/tracker"
            aria-current={trackerActive ? "page" : undefined}
            onClick={() => setMenuOpen(false)}
            className={`block rounded-lg px-3 py-2.5 text-sm ${
              trackerActive
                ? "bg-accent font-semibold text-accent-ink"
                : "hover:bg-surface-2"
            }`}
          >
            {t("nav.monsterResearch")}
          </Link>
          <Link
            href="/world-map"
            aria-current={worldMapActive ? "page" : undefined}
            onClick={() => setMenuOpen(false)}
            className={`block rounded-lg px-3 py-2.5 text-sm ${
              worldMapActive
                ? "bg-accent font-semibold text-accent-ink"
                : "hover:bg-surface-2"
            }`}
          >
            {t("nav.worldMap")}
          </Link>
          <Link
            href="/dailies"
            aria-current={dailiesActive ? "page" : undefined}
            onClick={() => setMenuOpen(false)}
            className={`block rounded-lg px-3 py-2.5 text-sm ${
              dailiesActive
                ? "bg-accent font-semibold text-accent-ink"
                : "hover:bg-surface-2"
            }`}
          >
            {t("nav.dailies")}
          </Link>
          <Link
            href="/shop-planner"
            aria-current={shopActive ? "page" : undefined}
            onClick={() => setMenuOpen(false)}
            className={`block rounded-lg px-3 py-2.5 text-sm ${
              shopActive
                ? "bg-accent font-semibold text-accent-ink"
                : "hover:bg-surface-2"
            }`}
          >
            {t("nav.shopPlanner")}
          </Link>
          <Link
            href="/guide"
            aria-current={guideActive ? "page" : undefined}
            onClick={() => setMenuOpen(false)}
            className={`block rounded-lg px-3 py-2.5 text-sm ${guideActive ? "bg-accent font-semibold text-accent-ink" : "hover:bg-surface-2"}`}
          >
            {t("nav.guide")}
          </Link>
          <span className="flex items-center gap-1.5 px-3 py-2.5 text-sm text-sub/75">
            {t("nav.marketAlert")}
            <SoonChip />
          </span>
          <hr className="my-1.5 border-line" />
          <Link
            href="/setup"
            onClick={() => setMenuOpen(false)}
            className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm hover:bg-surface-2"
          >
            <Archive className="size-4 text-sub" />
            {t("entry.title")}
          </Link>
          <Link
            href="/settings"
            onClick={() => setMenuOpen(false)}
            className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm hover:bg-surface-2"
          >
            <Settings className="size-4 text-sub" />
            {t("nav.settings")}
          </Link>
          <div className="flex items-center justify-between px-3 py-2 text-sm">
            <span className="text-sub">{t("locale.label")}</span>
            <LocaleSegment />
          </div>
          <div className="flex items-center justify-between px-3 py-2 text-sm">
            <span className="text-sub">{t("theme.label")}</span>
            <ThemeSegment />
          </div>
        </nav>
      )}
    </header>
  );
}
