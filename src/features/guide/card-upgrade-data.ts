export type Material = "blue" | "purple" | "yellow" | "card";
export type Cost = Partial<Record<Material, number>>;
export type CardGrade = {
  id: string;
  name: string;
  color: string;
  // Awaken includes the original card. Remaining card costs are extra copies.
  awaken: Cost;
  levels: [Cost, Cost, Cost];
  stars: [Cost, Cost, Cost];
};

/** Transcribed from the player's reference chart; level costs are per range. */
export const CARD_GRADES: CardGrade[] = [
  { id: "green", name: "Green", color: "text-el-wind", awaken: { blue: 10, card: 1 }, levels: [{ blue: 50 }, { blue: 100 }, { blue: 200 }], stars: [{ card: 1 }, { card: 3 }, { card: 6 }] },
  { id: "blue", name: "Blue", color: "text-el-water", awaken: { blue: 30, card: 1 }, levels: [{ blue: 150 }, { blue: 450 }, { blue: 900 }], stars: [{ card: 1 }, { card: 2 }, { card: 4 }] },
  { id: "blue-illusion", name: "Blue (Illusion)", color: "text-el-ghost", awaken: { blue: 60, card: 1 }, levels: [{ blue: 150 }, { blue: 450 }, { blue: 900 }], stars: [{ card: 2 }, { card: 3 }, { card: 4 }] },
  { id: "purple", name: "Purple", color: "text-el-poison", awaken: { purple: 50, card: 1 }, levels: [{ blue: 400 }, { blue: 1000 }, { blue: 2000 }], stars: [{ purple: 200 }, { card: 1 }, { card: 2 }] },
  { id: "yellow", name: "Yellow", color: "text-gold", awaken: { yellow: 200, card: 1 }, levels: [{ purple: 500 }, { purple: 1500 }, { purple: 3000 }], stars: [{ yellow: 400 }, { card: 2 }, { card: 3 }] },
  { id: "red-event-mvp", name: "Red (Event MVP)", color: "text-el-fire", awaken: { purple: 50, card: 1 }, levels: [{ purple: 1000 }, { purple: 2000 }, { purple: 4000 }], stars: [{ card: 1 }, { card: 2 }, { card: 3 }] },
  { id: "red-mvp", name: "Red (MVP)", color: "text-el-fire", awaken: { yellow: 400, card: 1 }, levels: [{ purple: 1000 }, { purple: 2000 }, { purple: 4000 }], stars: [{ yellow: 800 }, { card: 1 }, { yellow: 800, card: 1 }] },
];

export function totalCost(grade: CardGrade): Cost {
  const total: Cost = {};
  for (const cost of [grade.awaken, ...grade.levels, ...grade.stars]) {
    for (const [material, amount] of Object.entries(cost)) {
      const key = material as Material;
      total[key] = (total[key] ?? 0) + amount;
    }
  }
  return total;
}
