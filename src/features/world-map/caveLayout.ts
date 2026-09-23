/** Fresh drafts start from the committed layout; previous drafts were promoted into the app. */
export const CAVE_LAYOUT_STORAGE_KEY = "rooc.world-map.cave-layout.v3";
export type CaveLayout = Record<string, { dx: number; dy: number }>;

export function caveLayoutKey(pinId: string, name: string): string {
  return JSON.stringify([pinId, name]);
}

export function parseCaveLayout(raw: string | null): CaveLayout {
  if (!raw) return {};
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    return Object.fromEntries(Object.entries(value).filter(([key, offset]) => {
      if (!key.startsWith("[")) return false;
      return offset && typeof offset === "object" &&
        typeof offset.dx === "number" && Number.isFinite(offset.dx) &&
        typeof offset.dy === "number" && Number.isFinite(offset.dy) &&
        Math.abs(offset.dx) <= 64 && Math.abs(offset.dy) <= 64;
    }));
  } catch {
    return {};
  }
}

export function readCaveLayout(): CaveLayout {
  try {
    return parseCaveLayout(localStorage.getItem(CAVE_LAYOUT_STORAGE_KEY));
  } catch {
    return {};
  }
}

export const CAVE_ARROWS_STORAGE_KEY = "rooc.world-map.cave-arrows.v2";
/** Endpoints relative to the parent cell centre, in cell widths. */
export interface CaveArrowPosition {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}
export type CaveArrows = Record<string, CaveArrowPosition>;

export function parseCaveArrows(raw: string | null): CaveArrows {
  try {
    const value: unknown = JSON.parse(raw ?? "{}");
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    return Object.fromEntries(Object.entries(value).filter(([key, arrow]) =>
      key.startsWith("[") && arrow && typeof arrow === "object" &&
      [arrow.startX, arrow.startY, arrow.endX, arrow.endY].every((n) =>
        typeof n === "number" && Number.isFinite(n) && Math.abs(n) <= 64)));
  } catch { return {}; }
}

export function readCaveArrows(): CaveArrows {
  try { return parseCaveArrows(localStorage.getItem(CAVE_ARROWS_STORAGE_KEY)); }
  catch { return {}; }
}
