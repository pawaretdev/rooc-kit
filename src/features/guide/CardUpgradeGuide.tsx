"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Layers, Puzzle, Star } from "lucide-react";
import { useLocale } from "@/lib/i18n";
import { itemIconUrl } from "@/lib/images";
import { CARD_GRADES, totalCost, type Cost, type Material } from "./card-upgrade-data";
import { guideCopy } from "./copy";

function Materials({ cost }: { cost: Cost }) {
  const { locale } = useLocale();
  const c = guideCopy[locale];
  return (
    <ul className="flex flex-wrap gap-x-5 gap-y-2">
      {(Object.entries(cost) as [Material, number][]).map(([material, amount]) => (
        <li key={material} className="inline-flex items-center gap-2 text-sm">
          {material === "blue" || material === "purple" ? (
            <Image unoptimized src={itemIconUrl(`card-fragment-${material}`)} alt="" width={28} height={28} className="size-7 object-contain" />
          ) : material === "yellow" ? (
            <Puzzle className="m-1 size-5 shrink-0 text-gold" aria-hidden="true" />
          ) : <Layers className="m-1 size-5 shrink-0 text-sub" aria-hidden="true" />}
          <span><strong className="font-mono tabular-nums">{amount.toLocaleString(locale)}</strong> <span className="text-sub">{c[material]}</span></span>
        </li>
      ))}
    </ul>
  );
}

function Stars({ count }: { count: number }) {
  return <span className="inline-flex gap-0.5" aria-hidden="true">{[1, 2, 3].map((star) => <Star key={star} className={`size-3.5 ${star <= count ? "fill-current text-gold" : "text-sub"}`} />)}</span>;
}

export function CardUpgradeGuide() {
  const { locale } = useLocale();
  const c = guideCopy[locale];
  const [selected, setSelected] = useState(CARD_GRADES[0].id);
  const grade = CARD_GRADES.find((item) => item.id === selected)!;
  const total = totalCost(grade);
  const steps = [
    { label: c.awaken, cost: grade.awaken, level: null, stars: 0 },
    ...grade.levels.flatMap((cost, index) => [
      { label: `${c.level} ${index * 5 + 1}–${(index + 1) * 5}`, cost, level: (index + 1) * 5, stars: index },
      { label: `${c.star} ${index + 1} ${index === 0 ? c.oneStar : c.stars}`, cost: grade.stars[index], level: (index + 1) * 5, stars: index + 1 },
    ]),
  ];

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-10">
      <Link href="/guide" className="inline-flex min-h-10 items-center gap-2 text-sm text-sub hover:text-ink"><ArrowLeft className="size-4" />{c.back}</Link>
      <header className="mt-4 max-w-3xl">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{c.title}</h1>
        <p className="mt-3 text-sm leading-7 text-sub sm:text-base">{c.description}</p>
      </header>

      <fieldset className="mt-8">
        <legend className="mb-3 text-sm font-semibold">{c.grade}</legend>
        <div className="flex flex-wrap gap-2">
          {CARD_GRADES.map((item) => (
            <label key={item.id} className={`relative flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent ${selected === item.id ? "border-accent bg-surface-2 font-semibold" : "border-line bg-surface hover:bg-surface-2"}`}>
              <input className="sr-only" type="radio" name="card-grade" value={item.id} checked={selected === item.id} onChange={() => setSelected(item.id)} />
              <Layers className={`size-4 ${item.color}`} aria-hidden="true" />{item.name}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
        <section aria-labelledby="upgrade-path">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="upgrade-path" className="text-lg font-bold">{c.path}</h2>
            <span className={`text-sm font-semibold ${grade.color}`}>{grade.name}</span>
          </div>
          <p className="mb-4 text-sm text-sub">{c.base}</p>
          <ol className="divide-y divide-line rounded-xl border border-line bg-surface">
            {steps.map((step, index) => (
              <li key={index} className="grid gap-3 px-4 py-4 sm:grid-cols-[160px_minmax(0,1fr)] sm:px-5">
                <div>
                  <h3 className="text-sm font-semibold">{step.label}</h3>
                  <div className="mt-1.5 flex items-center gap-2 text-xs text-sub">
                    {step.level !== null && <span className="font-mono">Lv. {step.level}</span>}
                    <Stars count={step.stars} />
                    <span className="sr-only">{step.stars} {c.stars}</span>
                  </div>
                </div>
                <div className="self-center"><Materials cost={step.cost} /></div>
              </li>
            ))}
          </ol>
        </section>

        <aside className="border-y border-line py-5 lg:sticky lg:top-20" aria-labelledby="total-cost">
          <div className="flex items-center justify-between gap-3"><h2 id="total-cost" className="font-bold">{c.total}</h2><Stars count={3} /></div>
          <p className={`mt-2 text-sm font-semibold ${grade.color}`}>{grade.name}</p>
          <div className="mt-5"><Materials cost={total} /></div>
          <p className="mt-4 text-xs leading-6 text-sub">{c.initial} ({(total.card ?? 1) - 1} {c.additional})</p>
          <p className="mt-4 border-t border-line pt-4 text-sm leading-7 text-sub">{c.baseNote}</p>
        </aside>
      </div>

      <section className="mt-12" aria-labelledby="compare-grades">
        <h2 id="compare-grades" className="text-lg font-bold">{c.comparison}</h2>
        <p className="mt-2 text-sm text-sub">{c.total} · {c.initial}</p>
        <div className="mt-4 overflow-x-auto rounded-xl border border-line" role="region" aria-label={c.comparison} tabIndex={0}>
          <table className="w-full min-w-[620px] text-left text-sm">
            <caption className="sr-only">{c.comparison} — {c.total}</caption>
            <thead className="bg-surface-2 text-xs text-sub"><tr>
              <th scope="col" className="px-4 py-3 font-medium">{c.grade}</th>
              {(["blue", "purple", "yellow", "card"] as Material[]).map((key) => <th scope="col" key={key} className="px-4 py-3 text-right font-medium">{c[key]}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-line bg-surface">
              {CARD_GRADES.map((item) => {
                const sums = totalCost(item);
                return <tr key={item.id} className={selected === item.id ? "bg-surface-2" : ""}>
                  <th scope="row" className={`whitespace-nowrap px-4 py-3 font-medium ${item.color}`}>{item.name}</th>
                  {(["blue", "purple", "yellow", "card"] as Material[]).map((key) => <td key={key} className="px-4 py-3 text-right font-mono tabular-nums">{sums[key]?.toLocaleString(locale) ?? "—"}</td>)}
                </tr>;
              })}
            </tbody>
          </table>
        </div>
      </section>
      <p className="mt-6 max-w-3xl text-xs leading-6 text-sub">{c.source}</p>
    </main>
  );
}
