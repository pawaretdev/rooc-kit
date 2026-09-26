"use client";

import Link from "next/link";
import { ArrowRight, Star } from "lucide-react";
import { useLocale } from "@/lib/i18n";
import { guideCopy } from "./copy";

export function GuideIndex() {
  const { locale } = useLocale();
  const c = guideCopy[locale];
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="text-3xl font-extrabold tracking-tight">{c.guide}</h1>
      <p className="mt-3 text-sub">{c.intro}</p>
      <Link href="/guide/card-upgrade" className="group mt-8 block rounded-xl border border-line bg-surface p-6 transition-colors hover:border-accent sm:p-8">
        <div className="flex items-center gap-1 text-gold" aria-hidden="true">
          {[1, 2, 3].map((star) => <Star key={star} className="size-5 fill-current" />)}
        </div>
        <h2 className="mt-4 text-xl font-bold">{c.title}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-sub">{c.description}</p>
        <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-accent">{c.open}<ArrowRight className="size-4" /></span>
      </Link>
    </main>
  );
}
