import type { Cadence, DailyTaskRecord } from "@/lib/local-db";

/** A published template as the public API serves it. */
export interface TaskTemplateSnapshot {
  id: string;
  name: string;
  cadence: Cadence;
  targetCount: number;
  eventStart: string | null;
  eventEnd: string | null;
  linkedTemplateId: string | null;
  icon?: string | null;
}

/**
 * Only the fields that differ. `undefined` for an optional field means "drop
 * it" — Dexie's update() deletes keys set to undefined, which is how
 * updateDailyTask already clears event windows and links.
 */
export interface TaskTemplatePatch {
  name?: string;
  cadence?: Cadence;
  targetCount?: number | undefined;
  eventStart?: string | undefined;
  eventEnd?: string | undefined;
  linkedWeeklyId?: string | undefined;
  icon?: string | undefined;
}

export interface TaskTemplateDrift {
  taskId: string;
  templateName: string;
  patch: TaskTemplatePatch;
}

/**
 * Adopted tasks (those carrying a templateId) that no longer match their
 * template — the diff behind the "update from suggestions" button. Adoption
 * is a copy, so an admin edit (a new event window, art, a rename) never reaches
 * users on its own. Templates that were deleted or unpublished are skipped.
 *
 * The weekly link is compared through `adopted` (template id → local task id):
 * the template's partner counts only when the user has adopted it too, so a
 * link is never pointed at a task the user doesn't have.
 */
export function taskTemplateDrift(
  tasks: DailyTaskRecord[],
  templates: TaskTemplateSnapshot[],
  adopted: ReadonlyMap<string, string>,
): TaskTemplateDrift[] {
  const byTemplate = new Map(templates.map((tpl) => [tpl.id, tpl]));
  const drift: TaskTemplateDrift[] = [];

  for (const task of tasks) {
    const tpl = task.templateId ? byTemplate.get(task.templateId) : undefined;
    if (!tpl) continue;
    const patch: TaskTemplatePatch = {};
    if (task.name !== tpl.name) patch.name = tpl.name;
    if (task.cadence !== tpl.cadence) patch.cadence = tpl.cadence;
    if ((task.targetCount ?? 1) !== tpl.targetCount) {
      patch.targetCount = tpl.targetCount > 1 ? tpl.targetCount : undefined;
    }
    if ((task.eventStart ?? null) !== tpl.eventStart) {
      patch.eventStart = tpl.eventStart ?? undefined;
    }
    if ((task.eventEnd ?? null) !== tpl.eventEnd) {
      patch.eventEnd = tpl.eventEnd ?? undefined;
    }
    if ((task.icon ?? null) !== (tpl.icon ?? null)) {
      patch.icon = tpl.icon ?? undefined;
    }
    // Links only matter on dailies; a weekly template has none to compare.
    if (tpl.cadence === "daily") {
      const wanted = tpl.linkedTemplateId
        ? adopted.get(tpl.linkedTemplateId)
        : undefined;
      // An unadopted partner leaves the user's current link untouched.
      const comparable = !tpl.linkedTemplateId || wanted !== undefined;
      if (comparable && (task.linkedWeeklyId ?? undefined) !== wanted) {
        patch.linkedWeeklyId = wanted;
      }
    }
    if (Object.keys(patch).length > 0) {
      drift.push({ taskId: task.id, templateName: tpl.name, patch });
    }
  }
  return drift;
}
