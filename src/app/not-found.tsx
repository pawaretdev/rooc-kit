"use client";

import Link from "next/link";
import { useT } from "@/lib/i18n";
import { frameImageUrl } from "@/lib/images";
import { Button } from "@/components/ui/button";

const DIGITS = ["4", "0", "4"] as const;

/**
 * 404 in the app's own tile language: three undiscovered-tier frames
 * (gray, Lv 0) spell the status code; the middle one wears the
 * "level unknown" corner badge. Recovery goes back to the tracker.
 */
export default function NotFound() {
  const t = useT();

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="animate-rise-in w-full max-w-xl text-center">
        <div aria-hidden className="mb-8 flex justify-center gap-3">
          {DIGITS.map((digit, i) => (
            <span key={i} className="relative inline-block h-20 w-20">
              {/* Plain <img> on purpose — same pre-optimized frame art the tiles use. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={frameImageUrl(0)}
                alt=""
                draggable={false}
                className="absolute inset-0 h-full w-full"
              />
              <span className="absolute inset-0 flex items-center justify-center font-mono text-3xl font-bold tabular-nums text-frame-ink">
                {digit}
              </span>
              {i === 1 && (
                <span className="absolute -right-2 -bottom-2 flex h-6 min-w-6 items-center justify-center rounded-md border-2 border-bg bg-surface-2 px-1 font-mono text-xs font-bold text-sub">
                  ?
                </span>
              )}
            </span>
          ))}
        </div>

        <h1 className="text-[clamp(2.25rem,5vw,3rem)] leading-tight font-extrabold tracking-tight text-balance">
          <span className="sr-only">404 — </span>
          {t("notFound.title")}
        </h1>
        <p className="mx-auto mt-3 max-w-md text-base text-balance text-sub">
          {t("notFound.body")}
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button size="lg" asChild>
            <Link href="/tracker">{t("notFound.backTracker")}</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/">{t("notFound.backHome")}</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
