/**
 * DEF Planner math — pure functions, no React, no storage.
 *
 * Scope (docs/defense-formulas.md): PvP only, physical/PDEF and magic/MDEF
 * kept apart. Each layer is computed on its own and labelled with the model
 * it comes from; the "total" is only ever the product of the layers whose
 * inputs are complete, called a model total — never a final-damage or
 * "can you survive" claim.
 *
 * Inputs are `number | null`: null = not entered and is NEVER read as 0;
 * NaN = entered but unreadable, which blocks the result instead of guessing.
 */

export const FORMULA_VERSION = "2026-10-09.1";

export const MODEL_IDS = {
  def: "C01-excel-roog-candidate",
  ignoreCap: "ignore-cap-40-ingame-description",
  pvp: "F10-pvp-rating-client",
  pdmg: "BV-PDMG-0.5-cap25-candidate",
  mdmg: "BV-MDMG-relative-50.47-candidate",
  dmgLinear: "client-lua-dmg-linear-comparison",
} as const;

export type DamageKind = "physical" | "magic";
export const DAMAGE_KINDS: readonly DamageKind[] = ["physical", "magic"];

export type Num = number | null;

/** Our side of one damage type — PDEF stats for physical, MDEF for magic. */
export interface DefenseSide {
  /** Equipment PDEF/MDEF as shown in game: after DEF%, without Base and Refine */
  equipment: Num;
  /** DEF% / MDEF% in UI percent (23 = 23%), BOTH% included */
  percent: Num;
  /** Refine PDEF/MDEF — its own stat, never folded into equipment */
  refine: Num;
  /** PDMG / MDMG Reduction in UI percent */
  dmgReduction: Num;
}

export interface DefenseBuild {
  /** our level — the damage receiver's level drives the DEF curve */
  level: Num;
  /** PvP DMG Reduction rating (points, not %) — shared by both damage types */
  pvpReduction: Num;
  physical: DefenseSide;
  magic: DefenseSide;
}

/** The attacker's stats against one of our damage types. */
export interface AttackSide {
  /** Flat Ignore PDEF/MDEF in DEF units (not PEN) */
  flatIgnore: Num;
  /** Ignore PDEF%/MDEF% as entered; the effective rate is capped at 40% */
  ignorePercent: Num;
  /** PDMG / MDMG Bonus in UI percent */
  dmgBonus: Num;
}

export interface Opponent {
  /** PvP DMG Bonus rating (points) */
  pvpBonus: Num;
  physical: AttackSide;
  magic: AttackSide;
}

export function emptySide(): DefenseSide {
  return { equipment: null, percent: null, refine: null, dmgReduction: null };
}

export function emptyBuild(): DefenseBuild {
  return { level: null, pvpReduction: null, physical: emptySide(), magic: emptySide() };
}

export function emptyAttack(): AttackSide {
  return { flatIgnore: null, ignorePercent: null, dmgBonus: null };
}

export function emptyOpponent(): Opponent {
  return { pvpBonus: null, physical: emptyAttack(), magic: emptyAttack() };
}

// ── field domains (product validation, not a claim about game clamps) ──

export type BuildField = "level" | "pvpReduction";
export type SideField = keyof DefenseSide;
export type OpponentField = "pvpBonus";
export type AttackField = keyof AttackSide;

interface Limit {
  min: number;
  max: number;
  integer?: boolean;
}

export const LIMITS = {
  level: { min: 1, max: 300, integer: true },
  pvpReduction: { min: 0, max: 100_000 },
  equipment: { min: 0, max: 1_000_000 },
  percent: { min: 0, max: 1_000 },
  refine: { min: 0, max: 1_000_000 },
  dmgReduction: { min: 0, max: 1_000 },
  pvpBonus: { min: 0, max: 100_000 },
  flatIgnore: { min: 0, max: 1_000_000 },
  ignorePercent: { min: 0, max: 100 },
  dmgBonus: { min: 0, max: 1_000 },
} satisfies Record<BuildField | SideField | OpponentField | AttackField, Limit>;

export type LimitKey = keyof typeof LIMITS;

export function isValidValue(key: LimitKey, value: number): boolean {
  const limit: Limit = LIMITS[key];
  return (
    Number.isFinite(value) &&
    value >= limit.min &&
    value <= limit.max &&
    (!limit.integer || Number.isInteger(value))
  );
}

/** "empty" (null), "invalid" (unreadable or out of range) or "ok". */
export function fieldState(key: LimitKey, value: Num): "empty" | "invalid" | "ok" {
  if (value === null) return "empty";
  return isValidValue(key, value) ? "ok" : "invalid";
}

/** Dot path of an input, used for "still missing" lists and export. */
export type FieldPath =
  | `build.${BuildField}`
  | `build.${DamageKind}.${SideField}`
  | `opponent.${OpponentField}`
  | `opponent.${DamageKind}.${AttackField}`;

// ── layer 1: DEF (C01 candidate, Ignore% capped at 40%) ──

/** Working gameplay cap for Ignore PDEF%/MDEF% (in-game description, user-reported). */
export const IGNORE_CAP_PERCENT = 40;
/** Floor of the 5×Lv curve — the DEF layer never lets less than 5% through. */
export const DEF_FLOOR = 0.05;
/** Ignore% scenarios for the pressure table — never past the 40% cap. */
export const IGNORE_SCENARIOS = [0, 10, 20, 30, 40] as const;

export interface DefInputs {
  level: number;
  equipment: number;
  percent: number;
  refine: number;
  flatIgnore: number;
  /** entered Ignore% — capped here, so callers keep the raw value */
  ignorePercent: number;
}

/** Where Flat Ignore bites (raw = before DEF%) and whether Ignore% reaches Refine. */
export interface DefAssumption {
  flat: "raw" | "final";
  refine: "after" | "before";
}

/**
 * C01's own ordering: flat off Raw DEF, DEF% restored, Refine added after
 * Ignore%. The PvP branch of an older ROO server source (damage_def.cpp)
 * computes exactly this; ROOC's own producer hasn't been found, so the other
 * three orderings stay as an "if ROOC differs" spread.
 */
export const PRIMARY_ASSUMPTION: DefAssumption = { flat: "raw", refine: "after" };

export const DEF_ASSUMPTIONS: readonly DefAssumption[] = [
  { flat: "raw", refine: "after" },
  { flat: "raw", refine: "before" },
  { flat: "final", refine: "after" },
  { flat: "final", refine: "before" },
];

export function effectiveIgnoreRate(enteredPercent: number): number {
  return Math.min(Math.max(enteredPercent, 0), IGNORE_CAP_PERCENT) / 100;
}

/** F03 — Raw DEF estimate from the shown Equipment DEF (before rounding). */
export function rawDef(equipment: number, percent: number): number {
  return equipment / (1 + percent / 100);
}

export function effectiveDef(
  input: DefInputs,
  assumption: DefAssumption = PRIMARY_ASSUMPTION,
): number {
  const a = 1 + input.percent / 100;
  const ignore = effectiveIgnoreRate(input.ignorePercent);
  const remaining =
    assumption.flat === "raw"
      ? Math.max(input.equipment / a - input.flatIgnore, 0) * a
      : Math.max(input.equipment - input.flatIgnore, 0);
  return assumption.refine === "after"
    ? remaining * (1 - ignore) + input.refine
    : (remaining + input.refine) * (1 - ignore);
}

/** Share of damage that passes the DEF layer: max(5Lv / (DEF + 5Lv), 0.05). */
export function defMultiplier(
  input: DefInputs,
  assumption: DefAssumption = PRIMARY_ASSUMPTION,
): number {
  const fiveLv = 5 * input.level;
  return Math.max(fiveLv / (effectiveDef(input, assumption) + fiveLv), DEF_FLOOR);
}

// ── layer 2: PvP rating (F10, client bytecode) ──

const PVP_SLOPES = [0.0000775, 0.0000375, 0.0000525, 0.0000225, 0.000035, 0.000015, 0.0000175, 0.0000075, 0];
const PVP_STARTS = [0, 300, 600, 900, 1200, 1500, 1800, 2100, 0];
const PVP_BASES = [0, 0.04, 0.06, 0.08, 0.1, 0.12, 0.15, 0.18, 0.2];

/** f(|diff|) exactly as the client computes it — jumps at the 300-point edges included. */
export function pvpRatingShift(absDiff: number): number {
  const i = Math.min(Math.floor(absDiff / 300), 8);
  return PVP_SLOPES[i] * (absDiff - PVP_STARTS[i]) + PVP_BASES[i];
}

/**
 * diff = opponent PvP DMG Bonus − our PvP DMG Reduction (both ratings).
 * Positive diff amplifies damage, negative reduces it; capped at ±20%.
 */
export function pvpRatingMultiplier(diff: number): number {
  return 1 + Math.sign(diff) * pvpRatingShift(Math.abs(diff));
}

// ── layer 3: PDMG (BV sheet candidate) ──

export const PDMG_SLOPE = 0.005;
export const PDMG_CAP = 0.25;

/** diff = opponent PDMG Bonus% − our PDMG Reduction%. Sheet assumption cap ±25%. */
export function pdmgMultiplier(diff: number): { multiplier: number; capped: boolean } {
  const raw = diff * PDMG_SLOPE;
  const clamped = Math.max(-PDMG_CAP, Math.min(PDMG_CAP, raw));
  return { multiplier: 1 + clamped, capped: clamped !== raw };
}

// ── side panel: MDMG (BV sheet, relative to that sheet's own baseline) ──

export const MDMG_BASELINE = 50.47;
export const MDMG_SLOPE = 0.0072;

/**
 * Relative to the BV test baseline (diff 50.47), not an absolute factor.
 * Returns null where the line drops to ≤0 — outside anything the model can say.
 */
export function mdmgRelative(diff: number): number | null {
  const relative = 1 + (diff - MDMG_BASELINE) * MDMG_SLOPE;
  return relative > 0 ? relative : null;
}

// ── comparison only: the client's own PDMG/MDMG term ──

/** Floor the client Lua puts on the bonus/reduction term. */
export const DMG_LINEAR_FLOOR = 0.1;

/**
 * The client Lua's skill formulas multiply by
 * `max(1 + (bonus − reduction)/100, 0.1)` (328 physical / 97 magic sites), and
 * an older ROO server source feeds the raw stats in unscaled and uncapped.
 * ROOC's own producer is unseen, so this is shown beside the BV estimate and
 * never multiplied into a total.
 */
export function dmgLinearMultiplier(diff: number): number {
  return Math.max(1 + diff / 100, DMG_LINEAR_FLOOR);
}

// ── evaluation ──

export type LayerId = "def" | "pvp" | "dmg";

export interface DefLayerResult {
  multiplier: number;
  /** lowest/highest multiplier across the four ordering assumptions */
  range: { min: number; max: number };
  rawDef: number;
  effectiveDef: number;
  ignore: { entered: number; effective: number; capped: boolean };
}

export interface PvpLayerResult {
  diff: number;
  multiplier: number;
}

export interface DmgLayerResult {
  diff: number;
  multiplier: number;
  capped: boolean;
  /** client-Lua linear form, for comparison — never part of `total` */
  linear: number;
}

export interface MdmgPanelResult {
  diff: number;
  /** null = the model line is ≤0 here — no estimate */
  relative: number | null;
  /** client-Lua linear form, for comparison — never part of `total` */
  linear: number;
}

export type KindEvaluation =
  | { status: "invalid"; kind: DamageKind; invalid: FieldPath[] }
  | {
      status: "ok";
      kind: DamageKind;
      def: DefLayerResult | null;
      pvp: PvpLayerResult | null;
      /** PDMG for physical; always null for magic (MDMG lives in `mdmg`) */
      dmg: DmgLayerResult | null;
      /** magic only, never part of `total` */
      mdmg: MdmgPanelResult | null;
      included: LayerId[];
      /** layer → inputs it still needs */
      missing: Partial<Record<LayerId, FieldPath[]>>;
      /** product of the included layers; null when none is complete */
      total: number | null;
    };

/** Layers a damage type can have in its total, in display order. */
export function layersFor(kind: DamageKind): LayerId[] {
  return kind === "physical" ? ["def", "pvp", "dmg"] : ["def", "pvp"];
}

interface Field {
  path: FieldPath;
  key: LimitKey;
  value: Num;
}

function kindFields(build: DefenseBuild, opponent: Opponent, kind: DamageKind) {
  const side = build[kind];
  const attack = opponent[kind];
  const f = (path: FieldPath, key: LimitKey, value: Num): Field => ({ path, key, value });
  return {
    level: f("build.level", "level", build.level),
    pvpReduction: f("build.pvpReduction", "pvpReduction", build.pvpReduction),
    equipment: f(`build.${kind}.equipment`, "equipment", side.equipment),
    percent: f(`build.${kind}.percent`, "percent", side.percent),
    refine: f(`build.${kind}.refine`, "refine", side.refine),
    dmgReduction: f(`build.${kind}.dmgReduction`, "dmgReduction", side.dmgReduction),
    pvpBonus: f("opponent.pvpBonus", "pvpBonus", opponent.pvpBonus),
    flatIgnore: f(`opponent.${kind}.flatIgnore`, "flatIgnore", attack.flatIgnore),
    ignorePercent: f(`opponent.${kind}.ignorePercent`, "ignorePercent", attack.ignorePercent),
    dmgBonus: f(`opponent.${kind}.dmgBonus`, "dmgBonus", attack.dmgBonus),
  };
}

function missingOf(fields: Field[]): FieldPath[] {
  return fields.filter((field) => field.value === null).map((field) => field.path);
}

export function evaluateKind(
  build: DefenseBuild,
  opponent: Opponent,
  kind: DamageKind,
): KindEvaluation {
  const fields = kindFields(build, opponent, kind);
  const all = Object.values(fields);
  const invalid = all
    .filter((field) => fieldState(field.key, field.value) === "invalid")
    .map((field) => field.path);
  if (invalid.length > 0) return { status: "invalid", kind, invalid };

  const missing: Partial<Record<LayerId, FieldPath[]>> = {};
  const v = (field: Field) => field.value as number;

  const defFields = [
    fields.level,
    fields.equipment,
    fields.percent,
    fields.refine,
    fields.flatIgnore,
    fields.ignorePercent,
  ];
  let def: DefLayerResult | null = null;
  const defMissing = missingOf(defFields);
  if (defMissing.length > 0) {
    missing.def = defMissing;
  } else {
    const input: DefInputs = {
      level: v(fields.level),
      equipment: v(fields.equipment),
      percent: v(fields.percent),
      refine: v(fields.refine),
      flatIgnore: v(fields.flatIgnore),
      ignorePercent: v(fields.ignorePercent),
    };
    const alternatives = DEF_ASSUMPTIONS.map((a) => defMultiplier(input, a));
    def = {
      multiplier: defMultiplier(input),
      range: { min: Math.min(...alternatives), max: Math.max(...alternatives) },
      rawDef: rawDef(input.equipment, input.percent),
      effectiveDef: effectiveDef(input),
      ignore: {
        entered: input.ignorePercent,
        effective: effectiveIgnoreRate(input.ignorePercent) * 100,
        capped: input.ignorePercent > IGNORE_CAP_PERCENT,
      },
    };
  }

  let pvp: PvpLayerResult | null = null;
  const pvpMissing = missingOf([fields.pvpReduction, fields.pvpBonus]);
  if (pvpMissing.length > 0) {
    missing.pvp = pvpMissing;
  } else {
    const diff = v(fields.pvpBonus) - v(fields.pvpReduction);
    pvp = { diff, multiplier: pvpRatingMultiplier(diff) };
  }

  let dmg: DmgLayerResult | null = null;
  let mdmg: MdmgPanelResult | null = null;
  const dmgMissing = missingOf([fields.dmgReduction, fields.dmgBonus]);
  if (dmgMissing.length > 0) {
    if (kind === "physical") missing.dmg = dmgMissing;
  } else {
    const diff = v(fields.dmgBonus) - v(fields.dmgReduction);
    const linear = dmgLinearMultiplier(diff);
    if (kind === "physical") dmg = { diff, ...pdmgMultiplier(diff), linear };
    else mdmg = { diff, relative: mdmgRelative(diff), linear };
  }

  const layerValues: Record<LayerId, number | null> = {
    def: def?.multiplier ?? null,
    pvp: pvp?.multiplier ?? null,
    dmg: dmg?.multiplier ?? null,
  };
  const included = layersFor(kind).filter((id) => layerValues[id] !== null);
  const total =
    included.length > 0
      ? included.reduce((product, id) => product * (layerValues[id] as number), 1)
      : null;

  return { status: "ok", kind, def, pvp, dmg, mdmg, included, missing, total };
}

export type OkEvaluation = Extract<KindEvaluation, { status: "ok" }>;

/** Multiplier of one included layer; null when that layer isn't computed. */
export function layerMultiplier(evaluation: OkEvaluation, id: LayerId): number | null {
  if (id === "def") return evaluation.def?.multiplier ?? null;
  if (id === "pvp") return evaluation.pvp?.multiplier ?? null;
  return evaluation.dmg?.multiplier ?? null;
}

export interface Comparison {
  /** layers both sides have — the only fair basis */
  layers: LayerId[];
  current: number;
  baseline: number;
  /** >0 = current takes that share LESS damage than the baseline */
  change: number;
}

/**
 * Compares two evaluations on the layers both have complete. Returns null
 * when they share none (nothing to compare honestly).
 */
export function compareEvaluations(
  current: OkEvaluation,
  baseline: OkEvaluation,
): Comparison | null {
  const layers = current.included.filter((id) => baseline.included.includes(id));
  if (layers.length === 0) return null;
  const product = (evaluation: OkEvaluation) =>
    layers.reduce((acc, id) => acc * (layerMultiplier(evaluation, id) as number), 1);
  const cur = product(current);
  const base = product(baseline);
  return { layers, current: cur, baseline: base, change: 1 - cur / base };
}

/**
 * Comparison of the DEF layer alone under each of the four ordering
 * assumptions — a spread of model choices, not a confidence interval.
 */
export function defChangeRange(
  current: DefInputs,
  baseline: DefInputs,
): { min: number; max: number } {
  const changes = DEF_ASSUMPTIONS.map(
    (a) => 1 - defMultiplier(current, a) / defMultiplier(baseline, a),
  );
  return { min: Math.min(...changes), max: Math.max(...changes) };
}

/** The DEF-layer inputs of one damage type, when all are entered and valid. */
export function defInputsOf(
  build: DefenseBuild,
  opponent: Opponent,
  kind: DamageKind,
): DefInputs | null {
  const fields = kindFields(build, opponent, kind);
  const list = [
    fields.level,
    fields.equipment,
    fields.percent,
    fields.refine,
    fields.flatIgnore,
    fields.ignorePercent,
  ];
  if (list.some((field) => fieldState(field.key, field.value) !== "ok")) return null;
  return {
    level: fields.level.value as number,
    equipment: fields.equipment.value as number,
    percent: fields.percent.value as number,
    refine: fields.refine.value as number,
    flatIgnore: fields.flatIgnore.value as number,
    ignorePercent: fields.ignorePercent.value as number,
  };
}

/** Same opponent with this damage type's Ignore% replaced — for the pressure table. */
export function withIgnore(opponent: Opponent, kind: DamageKind, percent: number): Opponent {
  return { ...opponent, [kind]: { ...opponent[kind], ignorePercent: percent } };
}

/** "What does +N of one stat buy" probes — Equipment vs Refine as the spec asks. */
export type ProbeId = "equipment" | "refine" | "pvpReduction" | "dmgReduction";

export const PROBES: readonly { id: ProbeId; step: number }[] = [
  { id: "equipment", step: 100 },
  { id: "refine", step: 100 },
  { id: "pvpReduction", step: 100 },
  { id: "dmgReduction", step: 5 },
];

export function applyProbe(
  build: DefenseBuild,
  kind: DamageKind,
  probe: ProbeId,
  step: number,
): DefenseBuild | null {
  if (probe === "pvpReduction") {
    return build.pvpReduction === null
      ? null
      : { ...build, pvpReduction: build.pvpReduction + step };
  }
  const value = build[kind][probe];
  if (value === null) return null;
  return { ...build, [kind]: { ...build[kind], [probe]: value + step } };
}

/** True when every field of the build and opponent is null. */
export function isBlank(build: DefenseBuild, opponent: Opponent): boolean {
  const values = [
    build.level,
    build.pvpReduction,
    ...DAMAGE_KINDS.flatMap((k) => Object.values(build[k])),
    opponent.pvpBonus,
    ...DAMAGE_KINDS.flatMap((k) => Object.values(opponent[k])),
  ];
  return values.every((value) => value === null);
}

/** Every invalid field across both damage types (deduplicated). */
export function invalidFields(build: DefenseBuild, opponent: Opponent): FieldPath[] {
  const paths = new Set<FieldPath>();
  for (const kind of DAMAGE_KINDS) {
    for (const field of Object.values(kindFields(build, opponent, kind))) {
      if (fieldState(field.key, field.value) === "invalid") paths.add(field.path);
    }
  }
  return [...paths];
}
