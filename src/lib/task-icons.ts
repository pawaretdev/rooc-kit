/**
 * Dailies task icons — in-game event/activity art shipped under
 * /public/img/events. Ids are canonical English file stems (never translated,
 * like monster ids); a task stores the id in `icon`, and the URL is derived via
 * taskIconUrl(). Add a PNG + a row here; `task-icons.test.ts` checks the two
 * stay in step.
 */
export const TASK_ICONS = [
  { id: "mvp", label: "MVP" },
  { id: "mini", label: "Mini Boss" },
  { id: "daily-quest", label: "Daily Quest" },
  { id: "guild-quest", label: "Guild Quest" },
  { id: "endless-tower", label: "Endless Tower" },
  { id: "nightmare-temple", label: "Nightmare Temple" },
  { id: "helheim-nightmare", label: "Helheim Nightmare" },
  { id: "juperos-ruins", label: "Juperos Ruins" },
  { id: "demon-treasure", label: "Demon Treasure" },
  { id: "draconic-cataclysm", label: "Draconic Cataclysm" },
  { id: "seidr-scorch", label: "Seidr Scorch" },
  { id: "freya-mirage", label: "Freya Mirage" },
  { id: "love-oath", label: "Love Oath" },
  { id: "proof-of-union", label: "Proof of Union" },
  { id: "cat-paw-caravan", label: "Cat Paw Caravan" },
] as const;

export type TaskIconId = (typeof TASK_ICONS)[number]["id"];

const ICON_IDS: ReadonlySet<string> = new Set(TASK_ICONS.map((i) => i.id));

export function isTaskIconId(value: unknown): value is TaskIconId {
  return typeof value === "string" && ICON_IDS.has(value);
}

export function taskIconLabel(id: string): string {
  return TASK_ICONS.find((i) => i.id === id)?.label ?? id;
}
