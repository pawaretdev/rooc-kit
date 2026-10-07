import {
  compareEvaluations,
  DAMAGE_KINDS,
  defChangeRange,
  defInputsOf,
  evaluateKind,
  FORMULA_VERSION,
  MODEL_IDS,
  type DamageKind,
  type DefenseBuild,
  type Opponent,
} from "./model";

/**
 * The downloadable record of one evaluation: inputs, each layer's result,
 * which model produced it and how sure that model is. Built entirely in the
 * browser — nothing is sent anywhere.
 */
export function buildDefenseExport(input: {
  build: DefenseBuild;
  opponent: Opponent;
  baseline?: { name: string; savedAt: string; build: DefenseBuild };
}) {
  const { build, opponent, baseline } = input;
  const results = Object.fromEntries(
    DAMAGE_KINDS.map((kind) => [kind, evaluateKind(build, opponent, kind)]),
  ) as Record<DamageKind, ReturnType<typeof evaluateKind>>;

  const comparison = baseline
    ? {
        baseline,
        ...Object.fromEntries(
          DAMAGE_KINDS.map((kind) => {
            const current = results[kind];
            const base = evaluateKind(baseline.build, opponent, kind);
            const cur = defInputsOf(build, opponent, kind);
            const old = defInputsOf(baseline.build, opponent, kind);
            return [
              kind,
              {
                total:
                  current.status === "ok" && base.status === "ok"
                    ? compareEvaluations(current, base)
                    : null,
                defOrderingRange: cur && old ? defChangeRange(cur, old) : null,
              },
            ];
          }),
        ),
      }
    : undefined;

  return {
    app: "rooc-kit",
    kind: "defense-evaluation",
    formulaVersion: FORMULA_VERSION,
    exportedAt: new Date().toISOString(),
    scope:
      "PvP only. Physical (PDEF) and magic (MDEF) evaluated separately. Each layer is a model estimate; totals multiply only the layers whose inputs are complete. Not final damage and not a survival verdict. Crit layers are out of scope.",
    status: "estimate",
    inGameVerified: false,
    units: {
      percentFields: "UI percent (23 = 23%)",
      ratings: "PvP DMG Bonus/Reduction are rating points, not percent",
      multipliers: "fraction of damage that passes the layer (1 = unchanged)",
      blank: "null = not entered, never treated as 0",
    },
    models: {
      def: {
        id: MODEL_IDS.def,
        status: "candidate",
        note: "Excel/ROOG ordering: flat ignore off Raw DEF, DEF% restored, Refine added after Ignore%; 5×Lv curve, floor 0.05",
      },
      ignoreCap: {
        id: MODEL_IDS.ignoreCap,
        status: "ingame_description_user_reported",
        note: "effective Ignore% = min(entered, 40)",
      },
      pvp: {
        id: MODEL_IDS.pvp,
        status: "confirmed_client",
        note: "client bytecode PvpDamProcess rating term; 7 breakpoints match the in-game tooltip; cap 20% at |diff| ≥ 2400",
      },
      pdmg: {
        id: MODEL_IDS.pdmg,
        status: "candidate",
        note: "BV sheet: 1 + clamp((bonus − reduction) × 0.5%, ±25%); the cap is a sheet assumption",
      },
      mdmg: {
        id: MODEL_IDS.mdmg,
        status: "candidate",
        note: "relative to the BV test baseline only (diff 50.47); never part of a total",
      },
    },
    input: { build, opponent },
    results,
    ...(comparison ? { comparison } : {}),
  };
}
