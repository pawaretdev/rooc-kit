import { describe, expect, it } from "vitest";
import type { DailyTaskRecord } from "@/lib/local-db";
import { taskTemplateDrift, type TaskTemplateSnapshot } from "./template-sync";

const now = "2026-09-07T00:00:00.000Z";

function task(overrides: Partial<DailyTaskRecord> = {}): DailyTaskRecord {
  return {
    id: "task-1",
    name: "Endless Tower",
    cadence: "daily",
    sortOrder: 0,
    templateId: "tpl-1",
    icon: "endless-tower",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function template(
  overrides: Partial<TaskTemplateSnapshot> = {},
): TaskTemplateSnapshot {
  return {
    id: "tpl-1",
    name: "Endless Tower",
    cadence: "daily",
    targetCount: 1,
    eventStart: null,
    eventEnd: null,
    linkedTemplateId: null,
    icon: "endless-tower",
    ...overrides,
  };
}

const adopted = new Map([["tpl-1", "task-1"]]);

describe("taskTemplateDrift", () => {
  it("reports nothing when the copy matches", () => {
    expect(taskTemplateDrift([task()], [template()], adopted)).toEqual([]);
  });

  it("ignores tasks without a template, or whose template is gone", () => {
    const tasks = [task({ templateId: undefined }), task({ id: "t2", templateId: "missing" })];
    expect(taskTemplateDrift(tasks, [template()], adopted)).toEqual([]);
  });

  it("collects only the fields that changed", () => {
    const drift = taskTemplateDrift(
      [task()],
      [template({ name: "Endless Tower (Hard)", targetCount: 3, icon: "mvp" })],
      adopted,
    );
    expect(drift).toEqual([
      {
        taskId: "task-1",
        templateName: "Endless Tower (Hard)",
        patch: { name: "Endless Tower (Hard)", targetCount: 3, icon: "mvp" },
      },
    ]);
  });

  it("drops rounds, event window and icon with undefined when the template lost them", () => {
    const drift = taskTemplateDrift(
      [task({ targetCount: 3, eventStart: "2026-09-01", eventEnd: "2026-09-07" })],
      [template({ icon: null })],
      adopted,
    );
    expect(drift[0].patch).toEqual({
      targetCount: undefined,
      eventStart: undefined,
      eventEnd: undefined,
      icon: undefined,
    });
    expect(Object.keys(drift[0].patch)).toHaveLength(4);
  });

  it("treats rounds of 1 and an absent targetCount as equal", () => {
    expect(
      taskTemplateDrift([task()], [template({ targetCount: 1 })], adopted),
    ).toEqual([]);
  });

  it("points the weekly link at the user's own adopted copy", () => {
    const withWeekly = new Map([
      ["tpl-1", "task-1"],
      ["tpl-w", "task-w"],
    ]);
    const drift = taskTemplateDrift(
      [task()],
      [template({ linkedTemplateId: "tpl-w" })],
      withWeekly,
    );
    expect(drift[0].patch).toEqual({ linkedWeeklyId: "task-w" });
  });

  it("leaves the link alone when the partner template is not adopted", () => {
    const drift = taskTemplateDrift(
      [task({ linkedWeeklyId: "task-own" })],
      [template({ linkedTemplateId: "tpl-w" })],
      adopted,
    );
    expect(drift).toEqual([]);
  });

  it("unlinks when the template no longer links", () => {
    const drift = taskTemplateDrift(
      [task({ linkedWeeklyId: "task-w" })],
      [template()],
      adopted,
    );
    expect(drift[0].patch).toEqual({ linkedWeeklyId: undefined });
  });

  it("never compares links on weekly templates", () => {
    const drift = taskTemplateDrift(
      [task({ cadence: "weekly", linkedWeeklyId: "stale" })],
      [template({ cadence: "weekly" })],
      adopted,
    );
    expect(drift).toEqual([]);
  });
});
