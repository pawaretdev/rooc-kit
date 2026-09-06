import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { TASK_ICONS, isTaskIconId } from "./task-icons";

const EVENTS_DIR = join(process.cwd(), "public", "img", "events");

describe("task icon catalog", () => {
  it("has a PNG for every icon id", () => {
    for (const icon of TASK_ICONS) {
      expect(existsSync(join(EVENTS_DIR, `${icon.id}.png`)), icon.id).toBe(true);
    }
  });

  it("lists every PNG shipped under public/img/events", () => {
    const shipped = readdirSync(EVENTS_DIR)
      .filter((f) => f.endsWith(".png"))
      .map((f) => f.replace(/\.png$/, ""))
      .sort();
    expect(shipped).toEqual(TASK_ICONS.map((i) => i.id).sort());
  });

  it("has unique ids and recognises them", () => {
    const ids = TASK_ICONS.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(isTaskIconId("mvp")).toBe(true);
    expect(isTaskIconId("not-an-icon")).toBe(false);
    expect(isTaskIconId(undefined)).toBe(false);
  });
});
