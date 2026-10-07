import type { AttackField, DamageKind, FieldPath, SideField } from "./model";

/**
 * In-game stat names — canonical English game terms, shown as-is in both
 * locales (like monster names), so players can match them to the stat panel.
 * Surrounding UI copy goes through useT().
 */
export const STAT_NAMES = {
  level: "Base Lv",
  pvpReduction: "PvP DMG Reduction",
  pvpBonus: "PvP DMG Bonus",
  physical: {
    equipment: "Equipment PDEF",
    percent: "PDEF%",
    refine: "Refine PDEF",
    dmgReduction: "PDMG Reduction",
    flatIgnore: "Flat Ignore PDEF",
    ignorePercent: "Ignore PDEF%",
    dmgBonus: "PDMG Bonus",
  },
  magic: {
    equipment: "Equipment MDEF",
    percent: "MDEF%",
    refine: "Refine MDEF",
    dmgReduction: "MDMG Reduction",
    flatIgnore: "Flat Ignore MDEF",
    ignorePercent: "Ignore MDEF%",
    dmgBonus: "MDMG Bonus",
  },
} as const satisfies {
  level: string;
  pvpReduction: string;
  pvpBonus: string;
} & Record<DamageKind, Record<SideField | AttackField, string>>;

/** Stat name of an input path; opponent stats are tagged by the caller. */
export function statName(path: FieldPath): string {
  const parts = path.split(".");
  if (parts.length === 2) {
    return STAT_NAMES[parts[1] as "level" | "pvpReduction" | "pvpBonus"];
  }
  const [, kind, field] = parts as [string, DamageKind, SideField | AttackField];
  return STAT_NAMES[kind][field];
}

export function isOpponentPath(path: FieldPath): boolean {
  return path.startsWith("opponent.");
}
