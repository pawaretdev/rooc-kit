import { describe, expect, it } from "vitest";
import { CARD_GRADES, totalCost } from "./card-upgrade-data";

describe("card upgrade reference totals", () => {
  const expected = [
    { blue: 360, card: 11 },
    { blue: 1530, card: 8 },
    { blue: 1560, card: 10 },
    { purple: 250, blue: 3400, card: 4 },
    { yellow: 600, purple: 5000, card: 6 },
    { purple: 7050, card: 7 },
    { yellow: 2000, purple: 7000, card: 3 },
  ];

  it.each(CARD_GRADES.map((grade, index) => ({ grade, expected: expected[index] })))(
    "$grade.name matches the supplied chart, including the original card",
    ({ grade, expected }) => expect(totalCost(grade)).toEqual(expected),
  );

  it("preserves both materials needed for the final Red MVP star", () => {
    expect(CARD_GRADES.find((grade) => grade.id === "red-mvp")?.stars[2]).toEqual({ yellow: 800, card: 1 });
  });

  it("uses blue fragments for Purple levels 1–5 and purple fragments for its first star", () => {
    const purple = CARD_GRADES.find((grade) => grade.id === "purple");
    expect(purple?.levels[0]).toEqual({ blue: 400 });
    expect(purple?.stars[0]).toEqual({ purple: 200 });
  });
});
