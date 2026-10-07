"use client";

import { useT } from "@/lib/i18n";
import { formatPercent } from "./format";
import { useChangeText } from "./ResultCard";
import { KindTag } from "./StatsForm";
import {
  applyProbe,
  compareEvaluations,
  DAMAGE_KINDS,
  effectiveIgnoreRate,
  evaluateKind,
  IGNORE_CAP_PERCENT,
  IGNORE_SCENARIOS,
  PROBES,
  withIgnore,
  type DamageKind,
  type DefenseBuild,
  type LayerId,
  type Opponent,
  type ProbeId,
} from "./model";

function okTotal(build: DefenseBuild, opponent: Opponent, kind: DamageKind) {
  const evaluation = evaluateKind(build, opponent, kind);
  return evaluation.status === "ok" && evaluation.def ? evaluation : null;
}

/**
 * Pressure test: the same build and opponent with only Ignore% stepped
 * 0→40% (the cap). Shows the model total, plus the change vs the compared
 * snapshot when one is picked.
 */
export function PressureTable({
  build,
  opponent,
  baseline,
}: {
  build: DefenseBuild;
  opponent: Opponent;
  baseline?: DefenseBuild;
}) {
  const t = useT();
  const changeText = useChangeText();

  const currentIgnore = (kind: DamageKind) => {
    const entered = opponent[kind].ignorePercent;
    return entered === null ? null : effectiveIgnoreRate(entered) * 100;
  };

  return (
    <section className="rounded-xl border border-line bg-surface p-4">
      <h2 className="text-sm font-bold">{t("def.pressure.title")}</h2>
      <p className="mt-0.5 text-xs text-sub">{t("def.pressure.hint")}</p>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[18rem] text-sm">
          <caption className="sr-only">{t("def.pressure.caption")}</caption>
          <thead>
            <tr className="border-b border-line text-left text-[11px] text-sub">
              <th scope="col" className="py-1.5 pr-2 font-medium">
                {t("def.pressure.ignore")}
              </th>
              {DAMAGE_KINDS.map((kind) => (
                <th key={kind} scope="col" className="py-1.5 pl-2 text-right font-medium">
                  <KindTag kind={kind} short />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {IGNORE_SCENARIOS.map((ignore) => (
              <tr key={ignore} className="border-b border-line last:border-0">
                <th scope="row" className="py-2 pr-2 text-left font-mono text-xs font-medium tabular-nums">
                  {ignore}%
                  {ignore === IGNORE_CAP_PERCENT && (
                    <span className="ml-1.5 font-sans text-[10px] text-sub">{t("def.pressure.cap")}</span>
                  )}
                </th>
                {DAMAGE_KINDS.map((kind) => {
                  const scenario = withIgnore(opponent, kind, ignore);
                  const cur = okTotal(build, scenario, kind);
                  const base = baseline ? okTotal(baseline, scenario, kind) : null;
                  const comparison = cur && base ? compareEvaluations(cur, base) : null;
                  const isCurrent = currentIgnore(kind) === ignore;
                  return (
                    <td key={kind} className="py-2 pl-2 text-right align-top">
                      {cur?.total != null ? (
                        <>
                          <span
                            className={`font-mono text-xs tabular-nums ${isCurrent ? "rounded-md bg-surface-2 px-1.5 py-0.5 font-bold" : ""}`}
                          >
                            {isCurrent && <span className="sr-only">{t("def.pressure.current")} </span>}
                            {formatPercent(1 - cur.total)}
                          </span>
                          {comparison && (
                            <span className="block text-[10px] text-sub">
                              {changeText(comparison.change)}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-xs text-sub">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[11px] text-sub">{t("def.pressure.note")}</p>
    </section>
  );
}

/** The layer each probe moves — without it in the total the probe says nothing. */
const PROBE_LAYER: Record<ProbeId, LayerId> = {
  equipment: "def",
  refine: "def",
  pvpReduction: "pvp",
  dmgReduction: "dmg",
};

const PROBE_LABEL: Record<ProbeId, (step: number) => string> = {
  equipment: (n) => `+${n} Equipment DEF`,
  refine: (n) => `+${n} Refine DEF`,
  pvpReduction: (n) => `+${n} PvP DMG Reduction`,
  dmgReduction: (n) => `+${n}% DMG Reduction`,
};

/**
 * "What does +N of one stat change?" against the same opponent — Equipment
 * vs Refine side by side, as the spec asks. Not an item recommendation:
 * there is no cost data behind it.
 */
export function ProbeTable({ build, opponent }: { build: DefenseBuild; opponent: Opponent }) {
  const t = useT();
  const changeText = useChangeText();

  return (
    <section className="rounded-xl border border-line bg-surface p-4">
      <h2 className="text-sm font-bold">{t("def.probe.title")}</h2>
      <p className="mt-0.5 text-xs text-sub">{t("def.probe.hint")}</p>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[18rem] text-sm">
          <caption className="sr-only">{t("def.probe.title")}</caption>
          <thead>
            <tr className="border-b border-line text-left text-[11px] text-sub">
              <th scope="col" className="py-1.5 pr-2 font-medium">
                {t("def.probe.change")}
              </th>
              {DAMAGE_KINDS.map((kind) => (
                <th key={kind} scope="col" className="py-1.5 pl-2 text-right font-medium">
                  <KindTag kind={kind} short />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PROBES.map(({ id, step }) => (
              <tr key={id} className="border-b border-line last:border-0">
                <th scope="row" className="py-2 pr-2 text-left font-mono text-xs font-medium">
                  {PROBE_LABEL[id](step)}
                </th>
                {DAMAGE_KINDS.map((kind) => {
                  // MDMG is a side panel, never in the total — nothing to show.
                  const outOfTotal = id === "dmgReduction" && kind === "magic";
                  const next = outOfTotal ? null : applyProbe(build, kind, id, step);
                  const before = evaluateKind(build, opponent, kind);
                  const after = next ? evaluateKind(next, opponent, kind) : null;
                  const comparison =
                    before.status === "ok" &&
                    before.included.includes(PROBE_LAYER[id]) &&
                    after?.status === "ok"
                      ? compareEvaluations(after, before)
                      : null;
                  return (
                    <td key={kind} className="py-2 pl-2 text-right text-xs">
                      {comparison ? (
                        changeText(comparison.change)
                      ) : (
                        <span className="text-sub">{outOfTotal ? t("def.probe.notInTotal") : "—"}</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
