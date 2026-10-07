"use client";

import { ChevronDown } from "lucide-react";
import { useT, type MessageKey } from "@/lib/i18n";
import { ModelTag, type ModelTagKind } from "./ResultCard";
import { FORMULA_VERSION } from "./model";

const MODELS: { title: MessageKey; tag: ModelTagKind; formula: string[]; note: MessageKey }[] = [
  {
    title: "def.formula.def",
    tag: "estimate",
    formula: [
      "Raw ≈ Equipment DEF ÷ (1 + DEF%)",
      "Effective = max(Raw − Flat Ignore, 0) × (1 + DEF%) × (1 − min(Ignore%, 40%)) + Refine",
      "Through = max(5·Lv ÷ (Effective + 5·Lv), 0.05)",
      "Blocked (shown) = 1 − Through × PvP × PDMG",
    ],
    note: "def.formula.defNote",
  },
  {
    title: "def.formula.pvp",
    tag: "client",
    formula: [
      "diff = Opponent PvP DMG Bonus − Your PvP DMG Reduction",
      "× (1 + sign(diff) · f(|diff|))   f: 300→4% 600→6% 900→8% 1200→10% 1500→12% 1800→15% 2100→18%, ≥2400 → 20%",
    ],
    note: "def.formula.pvpNote",
  },
  {
    title: "def.formula.pdmg",
    tag: "community",
    formula: ["× (1 + clamp((PDMG Bonus% − PDMG Reduction%) × 0.5%, −25%, +25%))"],
    note: "def.formula.pdmgNote",
  },
  {
    title: "def.formula.mdmg",
    tag: "community",
    formula: ["relative = 1 + (MDMG Bonus% − MDMG Reduction% − 50.47) × 0.72%"],
    note: "def.formula.mdmgNote",
  },
];

const GAPS: MessageKey[] = [
  "def.gap.refine",
  "def.gap.flat",
  "def.gap.curve",
  "def.gap.dmg",
  "def.gap.scope",
];

export function FormulaNotes() {
  const t = useT();
  return (
    <details className="group rounded-xl border border-line bg-surface">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-bold [&::-webkit-details-marker]:hidden">
        <span className="flex-1">{t("def.formula.title")}</span>
        <ChevronDown className="size-4 text-sub transition-transform group-open:rotate-180" />
      </summary>
      <div className="space-y-5 border-t border-line px-4 py-4">
        <p className="text-xs text-sub">{t("def.formula.intro")}</p>

        <ul className="space-y-4">
          {MODELS.map((model) => (
            <li key={model.title}>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-semibold">{t(model.title)}</h3>
                <ModelTag kind={model.tag} />
              </div>
              <div className="mt-1.5 space-y-0.5 overflow-x-auto rounded-lg bg-surface-2 px-3 py-2 font-mono text-[11px] leading-relaxed whitespace-pre">
                {model.formula.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
              <p className="mt-1.5 text-xs text-sub">{t(model.note)}</p>
            </li>
          ))}
        </ul>

        <div>
          <h3 className="text-sm font-semibold">{t("def.gap.title")}</h3>
          <ul className="mt-1.5 list-disc space-y-1 pl-5 text-xs text-sub marker:text-gold">
            {GAPS.map((gap) => (
              <li key={gap}>{t(gap)}</li>
            ))}
          </ul>
        </div>

        <p className="border-t border-line pt-3 font-mono text-[11px] text-sub">
          {t("def.formula.version").replace("{v}", FORMULA_VERSION)}
        </p>
      </div>
    </details>
  );
}
