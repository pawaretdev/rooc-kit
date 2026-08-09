"use client";

import Link from "next/link";
import {
  ArrowRightIcon,
  CheckIcon,
  MapPinIcon,
} from "@/components/icons";
import { useT } from "@/lib/i18n";
import { DemoRowCard } from "./DemoRowCard";

/**
 * Persuade surface, "Live demo first" structure: the first viewport pairs the
 * product question with a playable research row, then a three-entry ledger
 * (each proved by a real UI fragment, not icon cards), the privacy stance,
 * and one closing CTA. All copy is locale-pure via useT — no mixed-language
 * lines; monster/map/element names stay canonical English by convention.
 */
export function Landing() {
  const t = useT();

  return (
    <main className="flex-1">
      <section className="mx-auto max-w-5xl px-4 pt-16 pb-14 sm:px-6 sm:pt-20">
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] lg:gap-14">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight text-balance sm:text-5xl">
              {t("landing.headline")}
            </h1>
            <p className="mt-4 max-w-[46ch] text-sub">{t("landing.pitch")}</p>
            <div className="mt-7 flex flex-wrap items-center gap-4">
              <Link
                href="/tracker"
                className="press inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 font-semibold text-accent-ink hover:brightness-107"
              >
                {t("landing.cta.open")}
                <ArrowRightIcon size={14} />
              </Link>
              <a
                href="#how-it-works"
                className="press rounded-lg px-2 py-2.5 text-sm text-sub underline underline-offset-4 hover:text-ink"
              >
                {t("landing.cta.how")}
              </a>
            </div>
            <p className="mt-4 text-xs text-sub">{t("landing.cta.note")}</p>
          </div>
          <DemoRowCard />
        </div>
      </section>

      <section
        id="how-it-works"
        className="border-t border-line scroll-mt-16"
      >
        <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
          <h2 className="mb-8 text-2xl font-extrabold tracking-tight">
            {t("landing.what.title")}
          </h2>
          <div>
            <div className="grid items-center gap-3 border-t border-line py-6 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)] md:gap-12">
              <h3 className="text-lg font-bold tracking-tight">
                {t("landing.f1.title")}
                <small className="mt-0.5 block text-xs font-medium text-gold">
                  {t("landing.f1.sub")}
                </small>
              </h3>
              <div>
                <p className="mb-3 max-w-[52ch] text-sm text-sub">
                  {t("landing.f1.body")}
                </p>
                <div className="flex flex-col items-start gap-2">
                  <span className="inline-flex items-center gap-2.5 rounded-lg border border-line bg-surface px-3.5 py-2 font-mono text-xs text-sub tabular-nums">
                    <span
                      aria-hidden
                      className="inline-block h-2 w-2 rounded-full bg-el-earth"
                    />
                    Earth <b className="font-bold text-ink">12/40</b>{" "}
                    {t("landing.frag.maxed")}
                  </span>
                  <span className="inline-flex items-center gap-2.5 rounded-lg border border-line bg-surface px-3.5 py-2 font-mono text-xs text-sub tabular-nums">
                    <CheckIcon size={13} className="text-gold" />
                    Wind <b className="font-bold text-ink">40/40</b> —{" "}
                    {t("mr.completedFlag")}
                  </span>
                </div>
              </div>
            </div>
            <div className="grid items-center gap-3 border-t border-line py-6 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)] md:gap-12">
              <h3 className="text-lg font-bold tracking-tight">
                {t("landing.f2.title")}
                <small className="mt-0.5 block text-xs font-medium text-gold">
                  {t("landing.f2.sub")}
                </small>
              </h3>
              <div>
                <p className="mb-3 max-w-[52ch] text-sm text-sub">
                  {t("landing.f2.body")}
                </p>
                <span className="inline-flex items-center gap-2.5 rounded-lg border border-[color-mix(in_oklab,var(--accent)_45%,var(--line))] bg-surface px-3.5 py-2 font-mono text-xs text-sub tabular-nums">
                  <MapPinIcon size={13} className="text-accent" />
                  <span>
                    {t("mr.trip.go")}{" "}
                    <b className="font-bold text-ink">Southern Payon</b> —{" "}
                    {t("mr.trip.clears").replace("{n}", "3")}
                  </span>
                </span>
              </div>
            </div>
            <div className="grid items-center gap-3 border-y border-line py-6 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)] md:gap-12">
              <h3 className="text-lg font-bold tracking-tight">
                {t("landing.f3.title")}
                <small className="mt-0.5 block text-xs font-medium text-gold">
                  {t("landing.f3.sub")}
                </small>
              </h3>
              <div>
                <p className="mb-3 max-w-[52ch] text-sm text-sub">
                  {t("landing.f3.body")}
                </p>
                <span className="inline-flex rounded-lg border border-line bg-surface px-3.5 py-2 font-mono text-xs text-sub">
                  {'{ "monsterId": "fabre", "level": 5, "source": "confirmed" }'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-line">
        <div className="mx-auto flex max-w-5xl flex-wrap gap-10 px-4 py-12 sm:px-6">
          {(["1", "2", "3"] as const).map((n) => (
            <div key={n} className="min-w-60 flex-1">
              <h3 className="mb-1.5 flex items-center gap-2 text-sm font-semibold">
                <CheckIcon size={14} className="shrink-0 text-ink" />
                {t(`landing.privacy${n}.title`)}
              </h3>
              <p className="max-w-[38ch] text-xs text-sub">
                {t(`landing.privacy${n}.body`)}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-line">
        <div className="mx-auto max-w-5xl px-4 py-20 text-center sm:px-6">
          <h2 className="text-2xl font-extrabold tracking-tight text-balance">
            {t("landing.close.title")}
          </h2>
          <p className="mt-2 mb-7 text-sub">{t("landing.close.body")}</p>
          <Link
            href="/tracker"
            className="press inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 font-semibold text-accent-ink hover:brightness-107"
          >
            {t("landing.cta.open")}
            <ArrowRightIcon size={14} />
          </Link>
        </div>
      </section>
    </main>
  );
}
