import {
  DEF_FLOOR,
  layerMultiplier,
  PDMG_CAP,
  type LayerId,
  type OkEvaluation,
} from "./model";

/**
 * "Where do I stand?" without a survival verdict: each layer's effect read as
 * damage cut (+) or added (−), placed between the worst and best that layer
 * can do under its model. The model's own limits are the only honest scale —
 * there is no population data to grade a build against.
 */

/** PvP rating shift cap (F10, |diff| ≥ 2400). */
export const PVP_RATING_CAP = 0.2;

/** Effect bounds per layer, in "share of damage cut" (negative = added). */
export const LAYER_BOUNDS: Record<LayerId, { worst: number; best: number }> = {
  // DEF only ever cuts: 0 when fully ignored, 95% at the 0.05 floor
  def: { worst: 0, best: 1 - DEF_FLOOR },
  pvp: { worst: -PVP_RATING_CAP, best: PVP_RATING_CAP },
  dmg: { worst: -PDMG_CAP, best: PDMG_CAP },
};

export interface LayerStanding {
  id: LayerId;
  /** share of damage this layer cuts; negative = it adds damage (their edge) */
  effect: number;
  /** effect placed between the layer's worst (0) and best (1) */
  position: number;
  /** at the model's best — more of this stat changes nothing here */
  maxed: boolean;
}

const EPSILON = 1e-9;

export function layerStanding(id: LayerId, multiplier: number): LayerStanding {
  const { worst, best } = LAYER_BOUNDS[id];
  const effect = 1 - multiplier;
  const position = Math.min(Math.max((effect - worst) / (best - worst), 0), 1);
  return { id, effect, position, maxed: effect >= best - EPSILON };
}

/** Share of damage the included layers cut together; negative = net amplified. */
export function blockedShare(total: number): number {
  return 1 - total;
}

/** Below this an effect reads as "even" (0.05%). */
const EVEN_THRESHOLD = 0.0005;

export function isWeak(standing: LayerStanding): boolean {
  return standing.effect <= -EVEN_THRESHOLD;
}

export interface EvenOut {
  /** layers where the opponent has the edge, in display order */
  layers: LayerId[];
  /** model total with those layers brought to even (multiplier 1) */
  total: number;
  /** share of damage taken that evening them out removes */
  change: number;
  /** how much of our stat each layer needs to reach even (rating points / UI %) */
  needs: Partial<Record<LayerId, number>>;
}

/**
 * "What if I just stopped losing these layers?" — every layer the opponent
 * wins is set to even (×1) and the total recomputed. Even is the honest
 * target: it needs exactly the gap in our own stat, nothing modelled past it.
 */
export function evenOutWeakSpots(evaluation: OkEvaluation): EvenOut | null {
  if (evaluation.total === null) return null;
  const weak = evaluation.included.filter((id) =>
    isWeak(layerStanding(id, layerMultiplier(evaluation, id) as number)),
  );
  if (weak.length === 0) return null;
  const total = evaluation.included.reduce(
    (product, id) => product * (weak.includes(id) ? 1 : (layerMultiplier(evaluation, id) as number)),
    1,
  );
  const needs: Partial<Record<LayerId, number>> = {};
  if (weak.includes("pvp") && evaluation.pvp) needs.pvp = evaluation.pvp.diff;
  if (weak.includes("dmg") && evaluation.dmg) needs.dmg = evaluation.dmg.diff;
  return { layers: weak, total, change: 1 - total / evaluation.total, needs };
}
