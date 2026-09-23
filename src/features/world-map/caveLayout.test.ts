import { describe, expect, it } from "vitest";
import { caveLayoutKey, parseCaveLayout, parseCaveArrows } from "./caveLayout";

describe("cave layout drafts", () => {
  it("keeps dungeon names separate across cells", () => {
    expect(caveLayoutKey("a", "Culvert")).not.toBe(caveLayoutKey("b", "Culvert"));
  });
  it("restores saved fractional offsets", () => {
    const draft = { [caveLayoutKey("a", "Culvert")]: { dx: -1.23, dy: 0.875 } };
    expect(parseCaveLayout(JSON.stringify(draft))).toEqual(draft);
  });
  it("ignores corrupt storage and invalid coordinates", () => {
    expect(parseCaveLayout("broken JSON")).toEqual({});
    expect(parseCaveLayout("null")).toEqual({});
    expect(parseCaveLayout("[]")).toEqual({});
    expect(parseCaveLayout(JSON.stringify({
      '["a","bad"]': { dx: "1", dy: 0 },
      '["a","off-map"]': { dx: 1e100, dy: 0 },
      '["a","missing"]': { dx: 1 },
      '__proto__': { dx: 0, dy: 0 },
    }))).toEqual({});
  });
});

describe("arrow drafts", () => {
  it("restores independent tail and tip coordinates", () => {
    const arrow = { '["55","Catacomb"]': { startX: -0.4, startY: 1, endX: 0.1, endY: 0.6 } };
    expect(parseCaveArrows(JSON.stringify(arrow))).toEqual(arrow);
  });
  it("ignores malformed or unbounded endpoints", () => {
    expect(parseCaveArrows('null')).toEqual({});
    expect(parseCaveArrows('bad')).toEqual({});
    expect(parseCaveArrows(JSON.stringify({
      '["a","bad"]': { startX: 0, startY: 0, endX: 1 },
      '["a","far"]': { startX: 1e99, startY: 0, endX: 1, endY: 1 },
    }))).toEqual({});
  });
});
