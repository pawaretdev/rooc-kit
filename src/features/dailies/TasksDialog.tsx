"use client";

import { useLayoutEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  CalendarCheck,
  CalendarClock,
  CalendarRange,
  Link2,
  Plus,
  Trash2,
} from "lucide-react";
import {
  addDailyTask,
  deleteDailyTask,
  updateDailyTask,
  type Cadence,
  type DailyTaskRecord,
} from "@/lib/local-db";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DragHandle,
  SortableItem,
  SortableList,
} from "@/components/SortableList";
import { TaskIconPicker } from "./TaskIcon";
import { TemplateBrowser } from "./TemplateBrowser";

const MAX_NAME_LENGTH = 100;
const MAX_ROUNDS = 99;

function clampRounds(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.max(1, Math.min(MAX_ROUNDS, Math.round(value)));
}

/** Rounds-per-period number field; >1 turns the checklist row into a counter. */
function RoundsInput({
  value,
  onCommit,
  label,
}: {
  value: number;
  onCommit: (v: number) => void;
  label: string;
}) {
  return (
    <Input
      type="number"
      inputMode="numeric"
      min={1}
      max={MAX_ROUNDS}
      defaultValue={value}
      key={value}
      aria-label={label}
      title={label}
      className="h-8 w-16 shrink-0"
      onBlur={(e) => {
        const next = clampRounds(Number(e.target.value));
        e.target.value = String(next);
        if (next !== value) onCommit(next);
      }}
    />
  );
}

function CadenceSelect({
  value,
  onChange,
  label,
}: {
  value: Cadence;
  onChange: (v: Cadence) => void;
  label: string;
}) {
  const t = useT();
  return (
    <Select value={value} onValueChange={(v) => onChange(v as Cadence)}>
      <SelectTrigger size="sm" aria-label={label} className="w-28 shrink-0">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="daily">{t("dailies.daily")}</SelectItem>
        <SelectItem value="weekly">{t("dailies.weekly")}</SelectItem>
      </SelectContent>
    </Select>
  );
}

const LINK_NONE = "none";

function TaskEditRow({
  task,
  isFirst,
  isLast,
  neighborUp,
  neighborDown,
  weeklyOptions,
  onDelete,
  rowRef,
  onHover,
}: {
  task: DailyTaskRecord;
  isFirst: boolean;
  isLast: boolean;
  neighborUp?: DailyTaskRecord;
  neighborDown?: DailyTaskRecord;
  /** weekly tasks a daily can be capped by */
  weeklyOptions: DailyTaskRecord[];
  onDelete: () => void;
  rowRef: (el: HTMLElement | null) => void;
  onHover: (hovering: boolean) => void;
}) {
  const t = useT();
  const isEvent = task.eventStart !== undefined || task.eventEnd !== undefined;
  // Date fields only appear on tasks marked as a special event.
  const [showEvent, setShowEvent] = useState(isEvent);

  const toggleEvent = () => {
    if (showEvent) {
      setShowEvent(false);
      if (isEvent) {
        void updateDailyTask(task.id, {
          eventStart: undefined,
          eventEnd: undefined,
        });
      }
    } else {
      setShowEvent(true);
    }
  };

  const swapWith = (other?: DailyTaskRecord) => {
    if (!other) return;
    void updateDailyTask(task.id, { sortOrder: other.sortOrder });
    void updateDailyTask(other.id, { sortOrder: task.sortOrder });
  };

  return (
    <SortableItem
      id={task.id}
      as="li"
      elementRef={rowRef}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      className="flex flex-wrap items-center gap-x-2 gap-y-1.5 rounded-lg px-1 py-2 hover:bg-surface-2/40"
    >
      {({ handleProps }) => (
        <>
      <DragHandle label={t("dailies.dragToReorder")} {...handleProps} />
      <TaskIconPicker
        value={task.icon}
        onChange={(icon) =>
          void updateDailyTask(task.id, { icon: icon ?? undefined })
        }
      />
      <Input
        defaultValue={task.name}
        maxLength={MAX_NAME_LENGTH}
        aria-label={t("dailies.taskName")}
        className="h-8 min-w-0 flex-1"
        onBlur={(e) => {
          const name = e.target.value.trim();
          if (name && name !== task.name) {
            void updateDailyTask(task.id, { name });
          } else {
            e.target.value = task.name;
          }
        }}
      />
      <CadenceSelect
        value={task.cadence}
        label={t("dailies.cadence")}
        onChange={(cadence) => void updateDailyTask(task.id, { cadence })}
      />
      <RoundsInput
        value={task.targetCount ?? 1}
        label={t("dailies.rounds")}
        onCommit={(targetCount) =>
          void updateDailyTask(task.id, { targetCount })
        }
      />
      {task.cadence === "daily" && (
        <Button
          variant="ghost"
          size="icon-sm"
          aria-pressed={showEvent}
          aria-label={t("dailies.markEvent")}
          title={t("dailies.markEvent")}
          className={showEvent ? "text-accent hover:text-accent" : ""}
          onClick={toggleEvent}
        >
          <CalendarRange className="size-3.5" />
        </Button>
      )}
      <Button
        variant="ghost"
        size="icon-sm"
        disabled={isFirst}
        aria-label={t("dailies.moveUp")}
        onClick={() => swapWith(neighborUp)}
      >
        <ArrowUp className="size-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        disabled={isLast}
        aria-label={t("dailies.moveDown")}
        onClick={() => swapWith(neighborDown)}
      >
        <ArrowDown className="size-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={t("dailies.deleteTask")}
        className="text-danger hover:text-danger"
        onClick={onDelete}
      >
        <Trash2 className="size-3.5" />
      </Button>
      {task.cadence === "daily" && showEvent && (
        <span className="flex w-full items-center gap-2 pl-10 text-xs text-sub">
          <CalendarRange className="size-3.5 shrink-0" />
          {t("dailies.eventWindow")}
          <Input
            type="datetime-local"
            defaultValue={task.eventStart ?? ""}
            key={`start-${task.eventStart ?? ""}`}
            aria-label={t("dailies.eventStart")}
            className="h-7 w-44"
            onBlur={(e) =>
              void updateDailyTask(task.id, {
                eventStart: e.target.value || undefined,
              })
            }
          />
          –
          <Input
            type="datetime-local"
            defaultValue={task.eventEnd ?? ""}
            key={`end-${task.eventEnd ?? ""}`}
            aria-label={t("dailies.eventEnd")}
            className="h-7 w-44"
            onBlur={(e) =>
              void updateDailyTask(task.id, {
                eventEnd: e.target.value || undefined,
              })
            }
          />
        </span>
      )}
      {task.cadence === "daily" && weeklyOptions.length > 0 && (
        <span className="flex w-full items-center gap-2 pl-10 text-xs text-sub">
          <Link2 className="size-3.5 shrink-0" />
          {t("dailies.linkWeekly")}
          <Select
            value={task.linkedWeeklyId ?? LINK_NONE}
            onValueChange={(v) =>
              void updateDailyTask(task.id, {
                linkedWeeklyId: v === LINK_NONE ? undefined : v,
              })
            }
          >
            <SelectTrigger
              size="sm"
              aria-label={t("dailies.linkWeekly")}
              className="h-7 min-w-0 flex-1"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={LINK_NONE}>{t("dailies.linkNone")}</SelectItem>
              {weeklyOptions.map((weekly) => (
                <SelectItem key={weekly.id} value={weekly.id}>
                  {weekly.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </span>
      )}
        </>
      )}
    </SortableItem>
  );
}

/** Edit modal: task CRUD + suggested templates. Accounts live in AccountsDialog. */
export function TasksDialog({
  open,
  onClose,
  tasks,
}: {
  open: boolean;
  onClose: () => void;
  tasks: DailyTaskRecord[];
}) {
  const t = useT();
  const [newTask, setNewTask] = useState("");
  const [newIcon, setNewIcon] = useState<string | null>(null);
  const [newCadence, setNewCadence] = useState<Cadence>("daily");
  const [newRounds, setNewRounds] = useState(1);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // ---- daily→weekly connector lines ------------------------------------
  const containerRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef(new Map<string, HTMLElement>());
  const [lines, setLines] = useState<
    {
      dailyId: string;
      weeklyId: string;
      /** endpoint x — the gutter edge, shared by every line */
      x0: number;
      /** vertical-run x — one lane per line */
      x: number;
      y1: number;
      y2: number;
    }[]
  >([]);
  const [hoverId, setHoverId] = useState<string | null>(null);

  const registerRow = (id: string) => (el: HTMLElement | null) => {
    if (el) rowRefs.current.set(id, el);
    else rowRefs.current.delete(id);
  };

  const linkedPairCount = tasks.filter(
    (task) =>
      task.cadence === "daily" &&
      task.linkedWeeklyId &&
      tasks.some(
        (t2) => t2.id === task.linkedWeeklyId && t2.cadence === "weekly",
      ),
  ).length;

  // Measured from the rendered rows; recomputed on reorder (incl. the live
  // drag preview) and container resize.
  useLayoutEffect(() => {
    if (!open) return;
    const compute = () => {
      const container = containerRef.current;
      if (!container) return;
      const cRect = container.getBoundingClientRect();
      const pairs = tasks.filter(
        (task) =>
          task.cadence === "daily" &&
          task.linkedWeeklyId &&
          rowRefs.current.has(task.linkedWeeklyId),
      );
      const gutter = 10 + pairs.length * 8;
      setLines(
        pairs.flatMap((task, i) => {
          const a = rowRefs.current.get(task.id);
          const b = rowRefs.current.get(task.linkedWeeklyId!);
          if (!a || !b) return [];
          const ra = a.getBoundingClientRect();
          const rb = b.getBoundingClientRect();
          return [
            {
              dailyId: task.id,
              weeklyId: task.linkedWeeklyId!,
              x0: cRect.width - gutter + 2,
              x: cRect.width - 4 - i * 8,
              y1: ra.top + ra.height / 2 - cRect.top,
              y2: rb.top + rb.height / 2 - cRect.top,
            },
          ];
        }),
      );
    };
    compute();
    const observer = new ResizeObserver(compute);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [tasks, open]);

  /** Reassign the group's existing sortOrder values to the dropped sequence. */
  const persistOrder = (group: DailyTaskRecord[], nextIds: string[]) => {
    const orders = group.map((task) => task.sortOrder).sort((a, b) => a - b);
    for (const [i, id] of nextIds.entries()) {
      const task = group.find((t2) => t2.id === id);
      if (task && task.sortOrder !== orders[i]) {
        void updateDailyTask(id, { sortOrder: orders[i] });
      }
    }
  };

  const addTask = () => {
    const name = newTask.trim();
    if (!name) return;
    void addDailyTask({
      name,
      cadence: newCadence,
      targetCount: newRounds,
      ...(newIcon ? { icon: newIcon } : {}),
    });
    setNewTask("");
    setNewIcon(null);
    setNewRounds(1);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent
        className="max-h-[85vh] overflow-y-auto sm:max-w-2xl"
        // same as AccountsDialog — don't auto-focus the first task's rename input
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{t("dailies.tasks")}</DialogTitle>
        </DialogHeader>

        {/* first run: the curated list goes on top — adopting from it is the
            shortest path to a working checklist */}
        {tasks.length === 0 && <TemplateBrowser />}
        {/* grouped like the checklist so daily vs weekly reads at a glance;
            move up/down reorders within the task's own group. Rows leave a
            right-hand gutter for the link connector lines so they never
            overlap the controls. */}
        <div ref={containerRef} className="relative space-y-5">
        <div
          className="space-y-5"
          style={{ paddingRight: linkedPairCount > 0 ? 10 + linkedPairCount * 8 : 0 }}
        >
        {(["daily", "weekly"] as const).map((cadence) => {
          const group = tasks.filter((task) => task.cadence === cadence);
          if (group.length === 0) return null;
          return (
            <section key={cadence}>
              <h3 className="mb-1 flex items-center gap-2 border-b border-line pb-2 font-mono text-[10px] font-bold tracking-wider text-sub uppercase">
                {cadence === "daily" ? (
                  <CalendarCheck className="size-3.5 text-accent" />
                ) : (
                  <CalendarClock className="size-3.5 text-accent" />
                )}
                {t(cadence === "daily" ? "dailies.daily" : "dailies.weekly")}
              </h3>
              {/* one sortable context per cadence — tasks never cross groups */}
              <SortableList
                ids={group.map((task) => task.id)}
                onReorder={(nextIds) => persistOrder(group, nextIds)}
              >
                <ul className="divide-y divide-line/60">
                  {group.map((task, i) => (
                    <TaskEditRow
                      key={task.id}
                      task={task}
                      isFirst={i === 0}
                      isLast={i === group.length - 1}
                      neighborUp={group[i - 1]}
                      neighborDown={group[i + 1]}
                      weeklyOptions={tasks.filter(
                        (t2) => t2.cadence === "weekly",
                      )}
                      onDelete={() => setConfirmDeleteId(task.id)}
                      rowRef={registerRow(task.id)}
                      onHover={(hovering) =>
                        setHoverId(hovering ? task.id : null)
                      }
                    />
                  ))}
                </ul>
              </SortableList>
            </section>
          );
        })}
        </div>
        {lines.length > 0 && (
          <svg
            aria-hidden
            className="pointer-events-none absolute inset-0 mt-0! h-full w-full"
          >
            {lines.map((line) => {
              const active =
                hoverId === line.dailyId || hoverId === line.weeklyId;
              return (
                <g
                  key={line.dailyId}
                  className="text-accent transition-opacity"
                  opacity={active ? 1 : 0.35}
                >
                  <path
                    d={`M ${line.x0} ${line.y1} H ${line.x} V ${line.y2} H ${line.x0}`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={active ? 2 : 1.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle cx={line.x0} cy={line.y1} r={2.5} fill="currentColor" />
                  <circle cx={line.x0} cy={line.y2} r={2.5} fill="currentColor" />
                </g>
              );
            })}
          </svg>
        )}
        </div>
        {/* create toolbar — a raised strip so it reads as an action, not a row */}
        <form
          className="flex items-center gap-2 rounded-xl border border-line bg-surface p-2.5"
          onSubmit={(e) => {
            e.preventDefault();
            addTask();
          }}
        >
          <TaskIconPicker value={newIcon} onChange={setNewIcon} />
          <Input
            value={newTask}
            maxLength={MAX_NAME_LENGTH}
            placeholder={t("dailies.taskName")}
            aria-label={t("dailies.taskName")}
            className="h-8 min-w-0 flex-1"
            onChange={(e) => setNewTask(e.target.value)}
          />
          <CadenceSelect
            value={newCadence}
            label={t("dailies.cadence")}
            onChange={setNewCadence}
          />
          <RoundsInput
            value={newRounds}
            label={t("dailies.rounds")}
            onCommit={setNewRounds}
          />
          <Button type="submit" size="sm" disabled={!newTask.trim()}>
            <Plus className="size-3.5" />
            {t("dailies.add")}
          </Button>
        </form>

        {/* already rendered above while the list is empty */}
        {tasks.length > 0 && <TemplateBrowser />}

        <AlertDialog
          open={confirmDeleteId !== null}
          onOpenChange={(o) => {
            if (!o) setConfirmDeleteId(null);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("dailies.deleteTask")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("dailies.deleteTaskConfirm")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (confirmDeleteId) void deleteDailyTask(confirmDeleteId);
                  setConfirmDeleteId(null);
                }}
              >
                {t("common.confirm")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}
