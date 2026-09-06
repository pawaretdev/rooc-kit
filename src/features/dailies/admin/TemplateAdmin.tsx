"use client";

import { useEffect, useState } from "react";
import { CalendarRange, Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import {
  DragHandle,
  SortableItem,
  SortableList,
} from "@/components/SortableList";
import { StatTile } from "@/features/admin/StatTile";
import { TaskIconPicker } from "@/features/dailies/TaskIcon";
import type { Cadence } from "@/lib/local-db";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface AdminTemplate {
  id: string;
  name: string;
  cadence: Cadence;
  targetCount: number;
  eventStart: string | null;
  eventEnd: string | null;
  linkedTemplateId: string | null;
  /** null = no icon */
  icon: string | null;
  sortOrder: number;
  published: boolean;
}

const LINK_NONE = "none";

const MAX_ROUNDS = 99;

function clampRounds(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.max(1, Math.min(MAX_ROUNDS, Math.round(value)));
}

type Status = "loading" | "idle" | "busy" | "error";

async function fetchAdminTemplates(): Promise<AdminTemplate[]> {
  const res = await fetch("/api/admin/templates");
  if (!res.ok) throw new Error("failed");
  const body = (await res.json()) as { templates: AdminTemplate[] };
  return body.templates;
}

/** Special-event window editor — toggle + stacked date inputs (daily only). */
function EventCell({
  tpl,
  onPatch,
}: {
  tpl: AdminTemplate;
  onPatch: (patch: { eventStart?: string | null; eventEnd?: string | null }) => void;
}) {
  const t = useT();
  const isEvent = tpl.eventStart !== null || tpl.eventEnd !== null;
  const [show, setShow] = useState(isEvent);

  if (tpl.cadence !== "daily") return null;

  return (
    <span className="flex min-w-0 items-center gap-1.5">
      <Button
        variant="ghost"
        size="icon-sm"
        aria-pressed={show}
        aria-label={t("dailies.markEvent")}
        title={t("dailies.markEvent")}
        className={show ? "text-accent hover:text-accent" : ""}
        onClick={() => {
          if (show) {
            setShow(false);
            if (isEvent) onPatch({ eventStart: null, eventEnd: null });
          } else {
            setShow(true);
          }
        }}
      >
        <CalendarRange className="size-3.5" />
      </Button>
      {show && (
        <span className="flex min-w-0 flex-1 items-center gap-1.5">
          <Input
            type="datetime-local"
            key={`start-${tpl.eventStart ?? ""}`}
            defaultValue={tpl.eventStart ?? ""}
            aria-label={t("dailies.eventStart")}
            className="h-7 w-full min-w-0"
            onBlur={(e) => onPatch({ eventStart: e.target.value || null })}
          />
          <Input
            type="datetime-local"
            key={`end-${tpl.eventEnd ?? ""}`}
            defaultValue={tpl.eventEnd ?? ""}
            aria-label={t("dailies.eventEnd")}
            className="h-7 w-full min-w-0"
            onBlur={(e) => onPatch({ eventEnd: e.target.value || null })}
          />
        </span>
      )}
    </span>
  );
}

function CadenceCell({
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
      {/* fixed basis so the toolbar keeps it inline; cells let it fill */}
      <SelectTrigger size="sm" aria-label={label} className="w-28 max-w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="daily">{t("dailies.daily")}</SelectItem>
        <SelectItem value="weekly">{t("dailies.weekly")}</SelectItem>
      </SelectContent>
    </Select>
  );
}

/**
 * Super-admin CRUD for suggested Dailies templates. The /admin layout already
 * gates access server-side; every API call is re-checked on the server too.
 */
export function TemplateAdmin() {
  const t = useT();
  const [templates, setTemplates] = useState<AdminTemplate[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [newName, setNewName] = useState("");
  const [newIcon, setNewIcon] = useState<string | null>(null);
  const [newCadence, setNewCadence] = useState<Cadence>("daily");
  const [newRounds, setNewRounds] = useState(1);
  const [confirmDelete, setConfirmDelete] = useState<AdminTemplate | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await fetchAdminTemplates();
        if (!cancelled) {
          setTemplates(rows);
          setStatus("idle");
        }
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const mutate = async (run: () => Promise<Response>): Promise<boolean> => {
    setStatus("busy");
    try {
      const res = await run();
      if (!res.ok) throw new Error();
      setTemplates(await fetchAdminTemplates());
      setStatus("idle");
      return true;
    } catch {
      setStatus("error");
      return false;
    }
  };

  const create = async () => {
    const name = newName.trim();
    if (!name) return;
    const ok = await mutate(() =>
      fetch("/api/admin/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          cadence: newCadence,
          targetCount: newRounds,
          icon: newIcon,
        }),
      }),
    );
    if (ok) {
      setNewName("");
      setNewIcon(null);
      setNewRounds(1);
    }
  };

  const update = (id: string, patch: Partial<AdminTemplate>) =>
    void mutate(() =>
      fetch(`/api/admin/templates/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      }),
    );

  const remove = (id: string) =>
    void mutate(() => fetch(`/api/admin/templates/${id}`, { method: "DELETE" }));

  /**
   * Drop applies optimistically (the row is already where the user let go),
   * then persists the reshuffled sortOrder values row by row.
   */
  const reorder = async (nextIds: string[]) => {
    const byId = new Map(templates.map((tpl) => [tpl.id, tpl]));
    const ordered = nextIds.flatMap((id) => {
      const tpl = byId.get(id);
      return tpl ? [tpl] : [];
    });
    const orders = templates
      .map((tpl) => tpl.sortOrder)
      .sort((a, b) => a - b);
    setTemplates(ordered.map((tpl, i) => ({ ...tpl, sortOrder: orders[i] })));
    setStatus("busy");
    try {
      for (const [i, tpl] of ordered.entries()) {
        if (tpl.sortOrder === orders[i]) continue;
        const res = await fetch(`/api/admin/templates/${tpl.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sortOrder: orders[i] }),
        });
        if (!res.ok) throw new Error();
      }
      setTemplates(await fetchAdminTemplates());
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  };

  const publishedCount = templates.filter((tpl) => tpl.published).length;
  const weeklyOptions = templates.filter((tpl) => tpl.cadence === "weekly");

  return (
    <div className="space-y-5">
      <header>
        <h2 className="text-xl font-extrabold tracking-tight">
          {t("admin.templates")}
        </h2>
        <p className="mt-0.5 max-w-prose text-sm text-sub">
          {t("admin.templatesHint")}
        </p>
      </header>

      {status === "error" && (
        <p className="text-sm font-medium text-danger">{t("admin.saveError")}</p>
      )}
      {status === "loading" ? (
        <p className="text-sm text-sub">{t("common.loading")}</p>
      ) : (
        <>
          <div className="grid max-w-md grid-cols-3 gap-3">
            <StatTile label={t("admin.total")} value={templates.length} />
            <StatTile
              label={t("admin.published")}
              value={publishedCount}
              tone="text-gold"
            />
            <StatTile
              label={t("admin.draft")}
              value={templates.length - publishedCount}
              tone="text-sub"
            />
          </div>

          {/* create toolbar */}
          <form
            className="flex w-full flex-wrap items-center gap-2 rounded-xl border border-line bg-surface p-3"
            onSubmit={(e) => {
              e.preventDefault();
              void create();
            }}
          >
            <TaskIconPicker value={newIcon} onChange={setNewIcon} />
            <Input
              value={newName}
              maxLength={100}
              placeholder={t("dailies.taskName")}
              aria-label={t("dailies.taskName")}
              className="h-8 min-w-40 flex-1"
              onChange={(e) => setNewName(e.target.value)}
            />
            <CadenceCell
              value={newCadence}
              label={t("dailies.cadence")}
              onChange={setNewCadence}
            />
            <Input
              type="number"
              inputMode="numeric"
              min={1}
              max={MAX_ROUNDS}
              key={newRounds}
              defaultValue={newRounds}
              aria-label={t("dailies.rounds")}
              title={t("dailies.rounds")}
              className="h-8 w-16"
              onBlur={(e) => {
                const next = clampRounds(Number(e.target.value));
                e.target.value = String(next);
                setNewRounds(next);
              }}
            />
            <Button
              type="submit"
              size="sm"
              disabled={status === "busy" || !newName.trim()}
            >
              <Plus className="size-3.5" />
              {t("admin.newTemplate")}
            </Button>
          </form>

          <SortableList
            ids={templates.map((tpl) => tpl.id)}
            onReorder={(nextIds) => void reorder(nextIds)}
          >
          {/* dims while a save is in flight — the only feedback for a mutation
              that otherwise changes nothing visible until it returns */}
          <div
            className={`w-full overflow-hidden rounded-xl border border-line bg-surface transition-opacity duration-200 ${
              status === "busy" ? "opacity-60" : ""
            }`}
          >
            {/* table-fixed: columns keep their declared widths and the name
                column absorbs the rest — the table never scrolls sideways */}
            <table className="w-full table-fixed text-sm">
              <thead>
                <tr className="border-b border-line text-left">
                  <th className="w-10 px-2 py-2.5" />
                  <th className="w-12 px-2 py-2.5">
                    <span className="sr-only">{t("common.icon")}</span>
                  </th>
                  <th className="px-2 py-2.5 font-mono text-[10px] font-bold tracking-wider text-sub uppercase">
                    {t("dailies.taskName")}
                  </th>
                  <th className="w-28 px-2 py-2.5 font-mono text-[10px] font-bold tracking-wider text-sub uppercase">
                    {t("dailies.cadence")}
                  </th>
                  <th className="w-16 px-2 py-2.5 font-mono text-[10px] font-bold tracking-wider text-sub uppercase">
                    {t("dailies.rounds")}
                  </th>
                  <th className="w-72 px-2 py-2.5 font-mono text-[10px] font-bold tracking-wider text-sub uppercase">
                    {t("dailies.markEvent")}
                  </th>
                  <th className="w-36 px-2 py-2.5 font-mono text-[10px] font-bold tracking-wider text-sub uppercase">
                    {t("admin.linkWeekly")}
                  </th>
                  <th className="w-32 px-2 py-2.5 font-mono text-[10px] font-bold tracking-wider text-sub uppercase">
                    {t("admin.status")}
                  </th>
                  <th className="w-10 px-2 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {templates.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-sub">
                      {t("dailies.templatesEmpty")}
                    </td>
                  </tr>
                )}
                {templates.map((tpl, i) => (
                  <SortableItem
                    key={tpl.id}
                    id={tpl.id}
                    as="tr"
                    // opacity-only stagger: a transform animation here would
                    // override the inline transform dnd-kit sets while dragging
                    style={{ "--stagger-i": i } as React.CSSProperties}
                    className="animate-stagger-in transition-colors hover:bg-surface-2/40"
                  >
                    {({ handleProps }) => (
                      <>
                    <td className="px-2 py-2">
                      <DragHandle
                        label={t("dailies.dragToReorder")}
                        {...handleProps}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <TaskIconPicker
                        value={tpl.icon}
                        onChange={(icon) => update(tpl.id, { icon })}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <Input
                        defaultValue={tpl.name}
                        maxLength={100}
                        aria-label={t("dailies.taskName")}
                        className="h-8 border-transparent bg-transparent px-2 hover:border-line focus-visible:border-line"
                        onBlur={(e) => {
                          const name = e.target.value.trim();
                          if (name && name !== tpl.name) {
                            update(tpl.id, { name });
                          } else {
                            e.target.value = tpl.name;
                          }
                        }}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <CadenceCell
                        value={tpl.cadence}
                        label={t("dailies.cadence")}
                        onChange={(cadence) => update(tpl.id, { cadence })}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <Input
                        type="number"
                        inputMode="numeric"
                        min={1}
                        max={MAX_ROUNDS}
                        key={tpl.targetCount}
                        defaultValue={tpl.targetCount}
                        aria-label={t("dailies.rounds")}
                        className="h-8 w-full min-w-0"
                        onBlur={(e) => {
                          const next = clampRounds(Number(e.target.value));
                          e.target.value = String(next);
                          if (next !== tpl.targetCount) {
                            update(tpl.id, { targetCount: next });
                          }
                        }}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <EventCell
                        tpl={tpl}
                        onPatch={(patch) => update(tpl.id, patch)}
                      />
                    </td>
                    <td className="px-2 py-2">
                      {tpl.cadence === "daily" && weeklyOptions.length > 0 && (
                        <Select
                          value={tpl.linkedTemplateId ?? LINK_NONE}
                          onValueChange={(v) =>
                            update(tpl.id, {
                              linkedTemplateId: v === LINK_NONE ? null : v,
                            })
                          }
                        >
                          <SelectTrigger
                            size="sm"
                            aria-label={t("admin.linkWeekly")}
                            className="w-full min-w-0"
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={LINK_NONE}>
                              {t("dailies.linkNone")}
                            </SelectItem>
                            {weeklyOptions.map((weekly) => (
                              <SelectItem key={weekly.id} value={weekly.id}>
                                {weekly.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </td>
                    <td className="px-2 py-2">
                      <Button
                        variant={tpl.published ? "default" : "outline"}
                        size="sm"
                        disabled={status === "busy"}
                        onClick={() =>
                          update(tpl.id, { published: !tpl.published })
                        }
                      >
                        {tpl.published ? (
                          <Eye className="size-3.5" />
                        ) : (
                          <EyeOff className="size-3.5" />
                        )}
                        {t(tpl.published ? "admin.published" : "admin.draft")}
                      </Button>
                    </td>
                    <td className="px-2 py-2">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        disabled={status === "busy"}
                        aria-label={t("dailies.deleteTask")}
                        className="text-danger hover:text-danger"
                        onClick={() => setConfirmDelete(tpl)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </td>
                      </>
                    )}
                  </SortableItem>
                ))}
              </tbody>
            </table>
          </div>
          </SortableList>
        </>
      )}

      <AlertDialog
        open={confirmDelete !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmDelete?.name}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("admin.deleteConfirm")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmDelete) remove(confirmDelete.id);
                setConfirmDelete(null);
              }}
            >
              {t("common.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
