"use client";

import type { ReactNode } from "react";
import { Minus, ShieldAlert, ShieldCheck, Target, TriangleAlert } from "lucide-react";
import { useT, type MessageKey } from "@/lib/i18n";
import { formatMultiplier, formatPercent, formatSigned, formatStat, SAME_THRESHOLD } from "./format";
import { isOpponentPath, STAT_NAMES, statName } from "./labels";
import {
  IGNORE_CAP_PERCENT,
  layerMultiplier,
  layersFor,
  MDMG_BASELINE,
  PDMG_CAP,
  type Comparison,
  type DamageKind,
  type FieldPath,
  type KindEvaluation,
  type LayerId,
} from "./model";
import {
  blockedShare,
  evenOutWeakSpots,
  isWeak,
  LAYER_BOUNDS,
  layerStanding,
  type LayerStanding,
} from "./standing";
import { KIND_DOT, KIND_TEXT, KindTag } from "./StatsForm";

/** How sure a layer's model is — dashed = unconfirmed, solid = read from the client. */
export type ModelTagKind = "estimate" | "client" | "community";

const TAG_KEY: Record<ModelTagKind, MessageKey> = {
  estimate: "def.tag.estimate",
  client: "def.tag.client",
  community: "def.tag.community",
};

export function ModelTag({ kind }: { kind: ModelTagKind }) {
  const t = useT();
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-md border px-1.5 py-px text-[10px] font-semibold tracking-wide ${
        kind === "client" ? "border-line text-sub" : "border-dashed border-gold/70 text-gold"
      }`}
    >
      {t(TAG_KEY[kind])}
    </span>
  );
}

export const LAYER_NAME: Record<LayerId, Record<DamageKind, MessageKey>> = {
  def: { physical: "def.layer.pdef", magic: "def.layer.mdef" },
  pvp: { physical: "def.layer.pvp", magic: "def.layer.pvp" },
  dmg: { physical: "def.layer.pdmg", magic: "def.layer.pdmg" },
};

const LAYER_TAG: Record<LayerId, ModelTagKind> = {
  def: "estimate",
  pvp: "client",
  dmg: "community",
};

/** "6.2% less damage" / "3.1% more damage" / "about the same". */
export function useChangeText() {
  const t = useT();
  return (change: number) => {
    if (Math.abs(change) < SAME_THRESHOLD) return t("def.change.same");
    const value = formatPercent(Math.abs(change));
    return t(change > 0 ? "def.change.less" : "def.change.more").replace("{v}", value);
  };
}

export function useFieldLabel() {
  const t = useT();
  return (path: FieldPath) =>
    isOpponentPath(path) ? `${t("def.opponentPrefix")} ${statName(path)}` : statName(path);
}

/** "cuts 80.9%" / "adds 7.5%" / "even" — words carry the direction, not color alone. */
function EffectValue({ standing }: { standing: LayerStanding }) {
  const t = useT();
  const value = formatPercent(Math.abs(standing.effect));
  if (Math.abs(standing.effect) < SAME_THRESHOLD) {
    return <span className="text-sm font-bold text-sub">{t("def.effect.even")}</span>;
  }
  return standing.effect > 0 ? (
    <span className="font-mono text-sm font-bold tabular-nums">
      {t("def.effect.cuts").replace("{v}", value)}
    </span>
  ) : (
    <span className="font-mono text-sm font-bold text-danger tabular-nums">
      {t("def.effect.adds").replace("{v}", value)}
    </span>
  );
}

/**
 * Where the layer sits between the worst and best its model allows. DEF only
 * ever cuts (0 → 95%); PvP rating and PDMG are tug-of-wars around "even",
 * so their bar grows from the middle — toward "your edge" in the damage
 * type's color, toward "their edge" in danger.
 */
function PositionBar({ kind, standing }: { kind: DamageKind; standing: LayerStanding }) {
  const t = useT();
  const oneSided = LAYER_BOUNDS[standing.id].worst === 0;
  const pos = standing.position * 100;
  const fill = oneSided
    ? { left: "0%", width: `${pos}%` }
    : pos >= 50
      ? { left: "50%", width: `${pos - 50}%` }
      : { left: `${pos}%`, width: `${50 - pos}%` };
  const theirs = !oneSided && pos < 50;

  return (
    <div aria-hidden className="mt-1.5">
      <div className="relative h-1.5 rounded-md bg-surface-2">
        {!oneSided && <span className="absolute top-[-3px] left-1/2 h-3 w-px bg-sub/60" />}
        <span
          className={`absolute inset-y-0 rounded-md ${theirs ? "bg-danger" : KIND_DOT[kind]}`}
          style={fill}
        />
      </div>
      <div className="mt-0.5 flex justify-between text-[10px] text-sub">
        {oneSided ? (
          <>
            <span>0%</span>
            <span>
              {t("def.scale.max").replace("{v}", formatPercent(LAYER_BOUNDS[standing.id].best, 0))}
            </span>
          </>
        ) : (
          <>
            <span>{t("def.scale.theirEdge")}</span>
            <span>{t("def.scale.even")}</span>
            <span>{t("def.scale.yourEdge")}</span>
          </>
        )}
      </div>
    </div>
  );
}

function LayerRow({
  kind,
  name,
  tag,
  standing,
  children,
}: {
  kind: DamageKind;
  name: string;
  tag: ModelTagKind;
  standing: LayerStanding;
  children?: ReactNode;
}) {
  const t = useT();
  return (
    <li className="py-2.5">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="min-w-0 flex-1 text-sm font-medium">{name}</span>
        <ModelTag kind={tag} />
        {standing.maxed && (
          <span className="rounded-md border border-line px-1.5 py-px text-[10px] font-semibold text-sub">
            {t("def.effect.maxed")}
          </span>
        )}
        <EffectValue standing={standing} />
      </div>
      <PositionBar kind={kind} standing={standing} />
      {children && <div className="mt-1 space-y-0.5 text-[11px] text-sub">{children}</div>}
    </li>
  );
}

export interface BaselineView {
  name: string;
  comparison: Comparison | null;
  /** DEF layer alone across the four ordering assumptions */
  defRange: { min: number; max: number } | null;
}

export function ResultCard({
  kind,
  evaluation,
  baseline,
}: {
  kind: DamageKind;
  evaluation: KindEvaluation;
  baseline?: BaselineView;
}) {
  const t = useT();
  const changeText = useChangeText();
  const fieldLabel = useFieldLabel();

  return (
    <article className="flex flex-col rounded-xl border border-line bg-surface p-4">
      <header className="mb-2 flex items-center justify-between gap-2 text-sm font-bold">
        <KindTag kind={kind} />
        <span className="text-[11px] font-medium text-sub">{t("def.result.pvpOnly")}</span>
      </header>

      {evaluation.status === "invalid" ? (
        <div role="alert" className="rounded-lg border border-danger/60 p-3 text-sm">
          <p className="font-semibold text-danger">{t("def.result.invalid")}</p>
          <p className="mt-1 text-xs text-sub">
            {evaluation.invalid.map(fieldLabel).join(" · ")}
          </p>
        </div>
      ) : evaluation.total === null ? (
        <div className="rounded-lg border border-dashed border-line p-3">
          <p className="text-sm font-semibold">{t("def.result.emptyTitle")}</p>
          <p className="mt-1 text-xs text-sub">{t("def.result.emptyHint")}</p>
          <MissingList kind={kind} missing={evaluation.missing} />
        </div>
      ) : (
        <>
          <Headline kind={kind} evaluation={evaluation} />
          {baseline && (
            <div className="mt-3 rounded-lg border border-line bg-surface-2 px-3 py-2.5">
              <p className="truncate text-[11px] text-sub">
                {t("def.compare.vs").replace("{name}", baseline.name)}
              </p>
              {baseline.comparison ? (
                <>
                  <p className="mt-0.5 flex items-center gap-1.5 text-sm font-semibold">
                    <ChangeIcon change={baseline.comparison.change} kind={kind} />
                    {changeText(baseline.comparison.change)}
                  </p>
                  <p className="mt-0.5 text-[11px] text-sub">
                    {t("def.compare.layers")}{" "}
                    {baseline.comparison.layers.map((id) => t(LAYER_NAME[id][kind])).join(" · ")}
                  </p>
                  {baseline.defRange &&
                    baseline.defRange.max - baseline.defRange.min >= SAME_THRESHOLD && (
                      <p className="mt-0.5 text-[11px] text-sub">
                        {t("def.compare.defRange")
                          .replace("{a}", changeText(baseline.defRange.min))
                          .replace("{b}", changeText(baseline.defRange.max))}
                      </p>
                    )}
                </>
              ) : (
                <p className="mt-0.5 text-xs text-sub">{t("def.compare.none")}</p>
              )}
            </div>
          )}

          <ul className="mt-3 divide-y divide-line border-t border-line">
            {evaluation.def && (
              <LayerRow
                kind={kind}
                name={t(LAYER_NAME.def[kind])}
                tag={LAYER_TAG.def}
                standing={layerStanding("def", evaluation.def.multiplier)}
              >
                <p>
                  {t("def.detail.def")
                    .replace("{eff}", formatStat(Math.round(evaluation.def.effectiveDef)))
                    .replace("{raw}", formatStat(Math.round(evaluation.def.rawDef)))}
                </p>
                {evaluation.def.range.max - evaluation.def.range.min >= SAME_THRESHOLD && (
                  <p>
                    {t("def.detail.range")
                      .replace("{a}", formatPercent(1 - evaluation.def.range.max))
                      .replace("{b}", formatPercent(1 - evaluation.def.range.min))}
                  </p>
                )}
                {evaluation.def.ignore.capped && (
                  <p className="text-gold">
                    {t("def.detail.ignoreCapped")
                      .replace("{a}", formatStat(evaluation.def.ignore.entered))
                      .replace("{b}", String(IGNORE_CAP_PERCENT))}
                  </p>
                )}
              </LayerRow>
            )}
            {evaluation.pvp && (
              <LayerRow
                kind={kind}
                name={t(LAYER_NAME.pvp[kind])}
                tag={LAYER_TAG.pvp}
                standing={layerStanding("pvp", evaluation.pvp.multiplier)}
              >
                <p>
                  {t("def.detail.pvp")
                    .replace("{d}", formatSigned(evaluation.pvp.diff))
                    .replace("{m}", formatMultiplier(evaluation.pvp.multiplier))}
                </p>
              </LayerRow>
            )}
            {evaluation.dmg && (
              <LayerRow
                kind={kind}
                name={t(LAYER_NAME.dmg[kind])}
                tag={LAYER_TAG.dmg}
                standing={layerStanding("dmg", evaluation.dmg.multiplier)}
              >
                <p>
                  {t("def.detail.pdmg")
                    .replace("{d}", formatSigned(evaluation.dmg.diff, "%"))
                    .replace("{m}", formatMultiplier(evaluation.dmg.multiplier))}
                </p>
                {evaluation.dmg.capped && <p className="text-gold">{t("def.detail.pdmgCapped")}</p>}
                <p>
                  {t("def.detail.dmgLinear").replace(
                    "{m}",
                    formatMultiplier(evaluation.dmg.linear),
                  )}
                </p>
              </LayerRow>
            )}
          </ul>

          <MissingList kind={kind} missing={evaluation.missing} />
        </>
      )}

      {evaluation.status === "ok" && kind === "magic" && (
        <MdmgPanel kind={kind} evaluation={evaluation} />
      )}
    </article>
  );
}

function ChangeIcon({ change, kind }: { change: number; kind: DamageKind }) {
  if (Math.abs(change) < SAME_THRESHOLD) return <Minus aria-hidden className="size-4 text-sub" />;
  return change > 0 ? (
    <ShieldCheck aria-hidden className={`size-4 ${KIND_TEXT[kind]}`} />
  ) : (
    <ShieldAlert aria-hidden className="size-4 text-danger" />
  );
}

/**
 * The answer, read the way players read a defense stat: how much of this
 * opponent's damage the included layers cut — higher = tougher. A net
 * increase (their bonuses outweigh every cut) flips to a danger readout.
 * Then the one line that says where the build is losing.
 */
function Headline({
  kind,
  evaluation,
}: {
  kind: DamageKind;
  evaluation: Extract<KindEvaluation, { status: "ok" }>;
}) {
  const t = useT();
  const total = evaluation.total as number;
  const blocked = blockedShare(total);
  const amplified = blocked < 0;
  const layers = layersFor(kind);

  const multiplierOf = (id: LayerId) => layerMultiplier(evaluation, id) as number;
  const weak = evaluation.included
    .map((id) => layerStanding(id, multiplierOf(id)))
    .filter(isWeak)
    .map((w) => `${t(LAYER_NAME[w.id][kind])} (+${formatPercent(-w.effect)})`);
  // MDMG never enters the total, but a bonus beating our reduction is still a weak spot
  if (evaluation.mdmg && evaluation.mdmg.diff > 0) {
    weak.push(t("def.result.weakMdmg").replace("{v}", `${formatStat(evaluation.mdmg.diff)}%`));
  }
  const evenOut = evenOutWeakSpots(evaluation);

  // the total spelled out — the layers are multiplied, never added
  const chain = evaluation.included
    .map((id) =>
      id === "def"
        ? `${t(LAYER_NAME.def[kind])} ${formatPercent(multiplierOf(id))}`
        : `${t(LAYER_NAME[id][kind])} ${formatMultiplier(multiplierOf(id))}`,
    )
    .join(" × ");

  const needs = evenOut
    ? [
        evenOut.needs.pvp !== undefined &&
          `${formatSigned(evenOut.needs.pvp)} ${STAT_NAMES.pvpReduction}`,
        evenOut.needs.dmg !== undefined &&
          `${formatSigned(evenOut.needs.dmg, "%")} ${STAT_NAMES[kind].dmgReduction}`,
      ].filter(Boolean)
    : [];

  return (
    <>
      <p className="text-xs font-semibold text-sub">
        {t(amplified ? "def.result.amplifiedLabel" : "def.result.blockedLabel")}
      </p>
      <p
        className={`text-[2.6rem] leading-none font-extrabold tracking-tight ${amplified ? "text-danger" : ""}`}
      >
        {amplified ? `+${formatPercent(-blocked)}` : formatPercent(blocked)}
      </p>
      <p className="mt-1 text-xs text-sub">
        {t(amplified ? "def.result.amplifiedHint" : "def.result.blockedHint")}
      </p>
      <div aria-hidden className="mt-3 h-2 overflow-hidden rounded-md bg-surface-2">
        <div
          className={`h-full rounded-md ${KIND_DOT[kind]}`}
          style={{ width: `${Math.max(blocked, 0) * 100}%` }}
        />
      </div>
      <p className="mt-1.5 text-[11px] text-sub">
        {t("def.result.breakdown")
          .replace("{v}", formatPercent(total))
          .replace("{chain}", chain)}
      </p>

      {weak.length > 0 ? (
        <p className="mt-2 flex items-start gap-1.5 text-xs font-medium text-danger">
          <ShieldAlert aria-hidden className="mt-px size-3.5 shrink-0" />
          {t("def.result.weakness").replace("{layers}", weak.join(", "))}
        </p>
      ) : (
        <p className="mt-2 flex items-start gap-1.5 text-xs text-sub">
          <ShieldCheck aria-hidden className={`mt-px size-3.5 shrink-0 ${KIND_TEXT[kind]}`} />
          {t("def.result.allHelp")}
        </p>
      )}
      {evenOut && (
        <p className="mt-1 flex items-start gap-1.5 text-xs">
          <Target aria-hidden className={`mt-px size-3.5 shrink-0 ${KIND_TEXT[kind]}`} />
          <span>
            {t("def.result.evenOut")
              .replace("{needs}", needs.join(", "))
              .replace("{v}", formatPercent(blockedShare(evenOut.total)))
              .replace("{c}", formatPercent(evenOut.change))}
          </span>
        </p>
      )}

      {evaluation.included.length < layers.length && (
        <p className="mt-1.5 flex items-start gap-1.5 text-[11px] font-medium text-gold">
          <TriangleAlert aria-hidden className="mt-px size-3.5 shrink-0" />
          {t("def.result.partial")
            .replace("{n}", String(evaluation.included.length))
            .replace("{m}", String(layers.length))
            .replace(
              "{layers}",
              evaluation.included.map((id) => t(LAYER_NAME[id][kind])).join(" · "),
            )}
        </p>
      )}
    </>
  );
}

function MissingList({
  kind,
  missing,
}: {
  kind: DamageKind;
  missing: Partial<Record<LayerId, FieldPath[]>>;
}) {
  const t = useT();
  const fieldLabel = useFieldLabel();
  const layers = layersFor(kind).filter((id) => missing[id]);
  if (layers.length === 0) return null;
  return (
    <div className="mt-3 rounded-lg border border-dashed border-line px-3 py-2">
      <p className="text-[11px] font-semibold text-sub">{t("def.result.notIncluded")}</p>
      <ul className="mt-1 space-y-1">
        {layers.map((id) => (
          <li key={id} className="text-[11px] text-sub">
            <span className="font-medium text-ink">{t(LAYER_NAME[id][kind])}</span>
            {" — "}
            {t("def.result.needs")} {missing[id]!.map(fieldLabel).join(", ")}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * MDMG lives beside the total, never in it: the BV formula is relative to its
 * test's own baseline. Lead with who has the edge (that much is model-free),
 * then the sheet's factor, flagged once it predicts more than ±25% — further
 * than any MDMG data behind the sheet — and the client's linear form beside it.
 */
function MdmgPanel({
  kind,
  evaluation,
}: {
  kind: DamageKind;
  evaluation: Extract<KindEvaluation, { status: "ok" }>;
}) {
  const t = useT();
  const mdmg = evaluation.mdmg;
  const distance = mdmg ? Math.abs(mdmg.diff - MDMG_BASELINE) : 0;
  const far = mdmg !== null && (mdmg.relative === null || Math.abs(mdmg.relative - 1) > PDMG_CAP);

  return (
    <div className="mt-3 rounded-lg border border-dashed border-line px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <p className="min-w-0 flex-1 text-sm font-medium">{t("def.mdmg.title")}</p>
        <ModelTag kind="community" />
        {mdmg &&
          (Math.abs(mdmg.diff) < 0.05 ? (
            <span className="text-sm font-bold text-sub">{t("def.effect.even")}</span>
          ) : mdmg.diff < 0 ? (
            <span className="inline-flex items-center gap-1 font-mono text-sm font-bold tabular-nums">
              <ShieldCheck aria-hidden className={`size-3.5 ${KIND_TEXT[kind]}`} />
              {t("def.edge.yours").replace("{v}", `${formatStat(-mdmg.diff)}%`)}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 font-mono text-sm font-bold text-danger tabular-nums">
              <ShieldAlert aria-hidden className="size-3.5" />
              {t("def.edge.theirs").replace("{v}", `${formatStat(mdmg.diff)}%`)}
            </span>
          ))}
      </div>
      {mdmg ? (
        <div className="mt-1 space-y-0.5 text-[11px] text-sub">
          <p>{t("def.mdmg.diff").replace("{d}", formatSigned(mdmg.diff, "%"))}</p>
          <p>
            {t("def.mdmg.vsBaseline")
              .replace(
                "{m}",
                mdmg.relative === null ? t("def.mdmg.outside") : formatMultiplier(mdmg.relative),
              )
              .replace("{n}", formatStat(Math.round(distance)))}
          </p>
          {far && (
            <p className="flex items-start gap-1 text-gold">
              <TriangleAlert aria-hidden className="mt-px size-3 shrink-0" />
              {t("def.mdmg.far")}
            </p>
          )}
          <p>{t("def.detail.dmgLinear").replace("{m}", formatMultiplier(mdmg.linear))}</p>
          <p>{t("def.mdmg.notInTotal")}</p>
        </div>
      ) : (
        <p className="mt-1 text-[11px] text-sub">{t("def.mdmg.needs")}</p>
      )}
    </div>
  );
}
