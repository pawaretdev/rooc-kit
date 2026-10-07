"use client";

import { Fragment, type ReactNode } from "react";
import { Eraser } from "lucide-react";
import { useT, type MessageKey } from "@/lib/i18n";
import { NumField } from "./NumField";
import { STAT_NAMES } from "./labels";
import {
  DAMAGE_KINDS,
  IGNORE_CAP_PERCENT,
  type AttackField,
  type DamageKind,
  type DefenseBuild,
  type Num,
  type Opponent,
  type SideField,
} from "./model";

/** Identity of each damage type — same hue in the form, results and chart. */
export const KIND_DOT: Record<DamageKind, string> = {
  physical: "bg-chart-phys",
  magic: "bg-chart-mag",
};

/** Same hue for small icons/marks — never for text that must be read. */
export const KIND_TEXT: Record<DamageKind, string> = {
  physical: "text-chart-phys",
  magic: "text-chart-mag",
};

export const KIND_LABEL: Record<DamageKind, MessageKey> = {
  physical: "def.kind.physical",
  magic: "def.kind.magic",
};

export function KindTag({ kind, short = false }: { kind: DamageKind; short?: boolean }) {
  const t = useT();
  return (
    <span className="inline-flex items-center gap-1.5">
      <span aria-hidden className={`size-2 shrink-0 rounded-full ${KIND_DOT[kind]}`} />
      {t(short ? (kind === "physical" ? "def.kind.physicalShort" : "def.kind.magicShort") : KIND_LABEL[kind])}
    </span>
  );
}

function Card({
  title,
  hint,
  onClear,
  clearLabel,
  badge,
  children,
}: {
  title: string;
  hint: string;
  onClear: () => void;
  clearLabel: string;
  badge?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-line bg-surface p-4">
      <div className="mb-3 flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <h2 className="flex flex-wrap items-center gap-2 text-sm font-bold">
            {title}
            {badge}
          </h2>
          <p className="mt-0.5 text-xs text-sub">{hint}</p>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="press inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-line px-2.5 py-1 text-xs text-sub hover:bg-surface-2 hover:text-ink"
        >
          <Eraser className="size-3.5" />
          {clearLabel}
        </button>
      </div>
      {children}
    </section>
  );
}

/** Label cell of a stat row: game term + one short translated hint. */
function RowLabel({ name, hint }: { name: string; hint?: string }) {
  return (
    <div className="min-w-0 self-center">
      <p className="text-xs font-medium leading-tight">{name}</p>
      {hint && <p className="mt-0.5 text-[11px] leading-tight text-sub">{hint}</p>}
    </div>
  );
}

const GRID = "grid grid-cols-[minmax(0,1fr)_minmax(0,6.25rem)_minmax(0,6.25rem)] items-start gap-x-2 gap-y-2.5";

function KindHeader() {
  return (
    <>
      <span />
      {DAMAGE_KINDS.map((kind) => (
        <span key={kind} className="text-center text-[11px] font-semibold text-sub">
          <KindTag kind={kind} short />
        </span>
      ))}
    </>
  );
}

function SingleRow({
  name,
  hint,
  children,
}: {
  name: string;
  hint: string;
  children: ReactNode;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,12.75rem)] items-start gap-2">
      <RowLabel name={name} hint={hint} />
      {children}
    </div>
  );
}

const SIDE_ROWS: { field: SideField; name: string; hint: MessageKey }[] = [
  { field: "equipment", name: "Equipment DEF", hint: "def.hint.equipment" },
  { field: "percent", name: "DEF %", hint: "def.hint.percent" },
  { field: "refine", name: "Refine DEF", hint: "def.hint.refine" },
  { field: "dmgReduction", name: "DMG Reduction %", hint: "def.hint.dmgReduction" },
];

export function BuildCard({
  build,
  onChange,
  onClear,
  badge,
}: {
  build: DefenseBuild;
  onChange: (build: DefenseBuild) => void;
  onClear: () => void;
  badge?: ReactNode;
}) {
  const t = useT();
  const setSide = (kind: DamageKind, field: SideField, value: Num) =>
    onChange({ ...build, [kind]: { ...build[kind], [field]: value } });

  return (
    <Card
      title={t("def.build.title")}
      hint={t("def.build.hint")}
      onClear={onClear}
      clearLabel={t("def.clearBuild")}
      badge={badge}
    >
      <div className="space-y-2.5">
        <SingleRow name={STAT_NAMES.level} hint={t("def.hint.level")}>
          <NumField
            value={build.level}
            limit="level"
            label={STAT_NAMES.level}
            onChange={(level) => onChange({ ...build, level })}
          />
        </SingleRow>
        <SingleRow name={STAT_NAMES.pvpReduction} hint={t("def.hint.pvpReduction")}>
          <NumField
            value={build.pvpReduction}
            limit="pvpReduction"
            label={STAT_NAMES.pvpReduction}
            onChange={(pvpReduction) => onChange({ ...build, pvpReduction })}
          />
        </SingleRow>
      </div>
      <div className={`${GRID} mt-4 border-t border-line pt-3`}>
        <KindHeader />
        {SIDE_ROWS.map((row) => (
          <Fragment key={row.field}>
            <RowLabel name={row.name} hint={t(row.hint)} />
            {DAMAGE_KINDS.map((kind) => (
              <NumField
                key={kind}
                value={build[kind][row.field]}
                limit={row.field}
                label={STAT_NAMES[kind][row.field]}
                onChange={(value) => setSide(kind, row.field, value)}
              />
            ))}
          </Fragment>
        ))}
      </div>
    </Card>
  );
}

const ATTACK_ROWS: { field: AttackField; name: string; hint: MessageKey }[] = [
  { field: "flatIgnore", name: "Flat Ignore DEF", hint: "def.hint.flatIgnore" },
  { field: "ignorePercent", name: "Ignore DEF %", hint: "def.hint.ignorePercent" },
  { field: "dmgBonus", name: "DMG Bonus %", hint: "def.hint.dmgBonus" },
];

/** Hypothetical opponents — labelled as such, not tiers the game defines. */
const SCENARIOS: { key: MessageKey; ignore: number; flat?: number }[] = [
  { key: "def.scenario.none", ignore: 0, flat: 0 },
  { key: "def.scenario.ignore20", ignore: 20 },
  { key: "def.scenario.ignoreCap", ignore: IGNORE_CAP_PERCENT },
];

export function OpponentCard({
  opponent,
  onChange,
  onClear,
}: {
  opponent: Opponent;
  onChange: (opponent: Opponent) => void;
  onClear: () => void;
}) {
  const t = useT();
  const setAttack = (kind: DamageKind, field: AttackField, value: Num) =>
    onChange({ ...opponent, [kind]: { ...opponent[kind], [field]: value } });

  return (
    <Card
      title={t("def.opponent.title")}
      hint={t("def.opponent.hint")}
      onClear={onClear}
      clearLabel={t("def.clearOpponent")}
    >
      <SingleRow name={STAT_NAMES.pvpBonus} hint={t("def.hint.pvpBonus")}>
        <NumField
          value={opponent.pvpBonus}
          limit="pvpBonus"
          label={`${t("def.opponentPrefix")} ${STAT_NAMES.pvpBonus}`}
          onChange={(pvpBonus) => onChange({ ...opponent, pvpBonus })}
        />
      </SingleRow>
      <div className={`${GRID} mt-4 border-t border-line pt-3`}>
        <KindHeader />
        {ATTACK_ROWS.map((row) => (
          <Fragment key={row.field}>
            <RowLabel name={row.name} hint={t(row.hint)} />
            {DAMAGE_KINDS.map((kind) => {
              const value = opponent[kind][row.field];
              const capped =
                row.field === "ignorePercent" &&
                value !== null &&
                value > IGNORE_CAP_PERCENT &&
                value <= 100;
              return (
                <div key={kind} className="min-w-0">
                  <NumField
                    value={value}
                    limit={row.field}
                    label={`${t("def.opponentPrefix")} ${STAT_NAMES[kind][row.field]}`}
                    onChange={(next) => setAttack(kind, row.field, next)}
                  />
                  {capped && (
                    <p className="mt-1 text-right font-mono text-[11px] text-gold">
                      {t("def.ignoreUsesCap").replace("{n}", String(IGNORE_CAP_PERCENT))}
                    </p>
                  )}
                </div>
              );
            })}
          </Fragment>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-line pt-3">
        <span className="mr-1 text-xs text-sub">{t("def.scenario.label")}</span>
        {SCENARIOS.map((scenario) => (
          <button
            key={scenario.key}
            type="button"
            onClick={() => {
              const patch = (kind: DamageKind) => ({
                ...opponent[kind],
                ignorePercent: scenario.ignore,
                ...(scenario.flat !== undefined ? { flatIgnore: scenario.flat } : {}),
              });
              onChange({ ...opponent, physical: patch("physical"), magic: patch("magic") });
            }}
            className="press rounded-lg border border-dashed border-line px-2.5 py-1 text-xs hover:border-accent hover:text-accent"
          >
            {t(scenario.key)}
          </button>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-sub">{t("def.scenario.note")}</p>
    </Card>
  );
}
