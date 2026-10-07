"use client";

import { useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Download, FlaskConical, Save } from "lucide-react";
import { useT } from "@/lib/i18n";
import {
  addDefenseSnapshot,
  deleteDefenseSnapshot,
  localDb,
  setSetting,
  updateDefenseSnapshot,
} from "@/lib/local-db";
import { Button } from "@/components/ui/button";
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
import { buildDefenseExport } from "./export";
import { formatPercent } from "./format";
import { FormulaNotes } from "./FormulaNotes";
import {
  coerceBuild,
  coerceOpponent,
  hasAnyOpponentValue,
  hasAnyValue,
  liveSnapshots,
  MAX_SNAPSHOTS,
  type DefenseHistoryEntry,
  type DefenseSnapshot,
} from "./history";
import { HistorySection } from "./HistorySection";
import { PressureTable, ProbeTable } from "./Insights";
import {
  compareEvaluations,
  DAMAGE_KINDS,
  defChangeRange,
  defInputsOf,
  emptyBuild,
  emptyOpponent,
  evaluateKind,
  FORMULA_VERSION,
  invalidFields,
  type DamageKind,
  type DefenseBuild,
  type KindEvaluation,
  type Opponent,
} from "./model";
import { ResultCard, type BaselineView } from "./ResultCard";
import { SnapshotDialog } from "./SnapshotDialog";
import { BuildCard, KindTag, OpponentCard } from "./StatsForm";

/** The in-progress form survives reloads — a local setting, never synced. */
const DRAFT_KEY = "defense.draft";

interface Draft {
  build: DefenseBuild;
  opponent: Opponent;
}

/** Clearly-labelled assumptions for trying the page out — not game data. */
const SAMPLE: Draft = {
  build: {
    level: 99,
    pvpReduction: 1200,
    physical: { equipment: 2864, percent: 23, refine: 300, dmgReduction: 40 },
    magic: { equipment: 824, percent: 16, refine: 120, dmgReduction: 45 },
  },
  opponent: {
    pvpBonus: 900,
    physical: { flatIgnore: 500, ignorePercent: 20, dmgBonus: 55 },
    magic: { flatIgnore: 100, ignorePercent: 15, dmgBonus: 60 },
  },
};

function toDraft(stored: unknown): Draft {
  const r = typeof stored === "object" && stored !== null ? (stored as Record<string, unknown>) : {};
  return { build: coerceBuild(r.build), opponent: coerceOpponent(r.opponent) };
}

export function DefensePlanner() {
  const t = useT();
  const stored = useLiveQuery(
    async () => (await localDb.settings.get(DRAFT_KEY))?.value ?? null,
    [],
    "loading" as const,
  );
  const entries = useLiveQuery(() => localDb.defenseHistory.toArray(), []);

  if (stored === "loading" || entries === undefined) {
    return <p className="py-10 text-center text-sub">{t("common.loading")}</p>;
  }
  // Only the first stored value seeds the form; later writes are its own echo.
  return <Planner initialDraft={toDraft(stored)} entries={entries} />;
}

type DialogState =
  | { kind: "save" }
  | { kind: "edit"; snapshot: DefenseSnapshot }
  | null;

function Planner({
  initialDraft,
  entries,
}: {
  initialDraft: Draft;
  entries: DefenseHistoryEntry[];
}) {
  const t = useT();
  const [draft, setDraft] = useState(initialDraft);
  const [isSample, setIsSample] = useState(false);
  const [compareId, setCompareId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [toDelete, setToDelete] = useState<DefenseSnapshot | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => void setSetting(DRAFT_KEY, draft), 400);
    return () => clearTimeout(timer);
  }, [draft]);

  const snapshots = useMemo(() => liveSnapshots(entries), [entries]);
  const baseline = snapshots.find((s) => s.id === compareId) ?? null;

  const evaluations = Object.fromEntries(
    DAMAGE_KINDS.map((kind) => [kind, evaluateKind(draft.build, draft.opponent, kind)]),
  ) as Record<DamageKind, KindEvaluation>;

  const baselineView = (kind: DamageKind): BaselineView | undefined => {
    if (!baseline) return undefined;
    const current = evaluations[kind];
    const base = evaluateKind(baseline.build, draft.opponent, kind);
    const cur = defInputsOf(draft.build, draft.opponent, kind);
    const old = defInputsOf(baseline.build, draft.opponent, kind);
    return {
      name: baseline.name,
      comparison:
        current.status === "ok" && base.status === "ok"
          ? compareEvaluations(current, base)
          : null,
      defRange: cur && old ? defChangeRange(cur, old) : null,
    };
  };

  const invalid = invalidFields(draft.build, draft.opponent);
  const historyFull = snapshots.length >= MAX_SNAPSHOTS;
  const canSave = invalid.length === 0 && hasAnyValue(draft.build) && !historyFull;
  const canExport = invalid.length === 0 && (hasAnyValue(draft.build) || hasAnyOpponentValue(draft.opponent));

  const editBuild = (build: DefenseBuild) => {
    setDraft((d) => ({ ...d, build }));
    setIsSample(false);
  };
  const editOpponent = (opponent: Opponent) => {
    setDraft((d) => ({ ...d, opponent }));
    setIsSample(false);
  };

  const exportJson = () => {
    const doc = buildDefenseExport({
      build: draft.build,
      opponent: draft.opponent,
      baseline: baseline
        ? { name: baseline.name, savedAt: baseline.savedAt, build: baseline.build }
        : undefined,
    });
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(doc, null, 2)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `rooc-defense-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const today = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date());
  const anyTotal = DAMAGE_KINDS.some((kind) => {
    const e = evaluations[kind];
    return e.status === "ok" && e.total !== null;
  });

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 pb-16 sm:pb-0">
      <header className="space-y-1.5">
        <h1 className="text-2xl font-extrabold tracking-tight">{t("def.title")}</h1>
        <p className="max-w-3xl text-sm text-sub">{t("def.subtitle")}</p>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => {
            setDraft(SAMPLE);
            setIsSample(true);
          }}
          className="press inline-flex items-center gap-1.5 rounded-lg border border-dashed border-gold/70 px-3 py-1.5 text-sm text-gold hover:bg-surface-2"
        >
          <FlaskConical className="size-4" />
          {t("def.sample")}
        </button>

        <Select
          value={compareId ?? "none"}
          onValueChange={(v) => setCompareId(v === "none" ? null : v)}
          disabled={snapshots.length === 0}
        >
          <SelectTrigger
            className="w-auto max-w-64 rounded-lg"
            aria-label={t("def.compare.label")}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">{t("def.compare.off")}</SelectItem>
            {[...snapshots].reverse().map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {t("def.compare.with").replace("{name}", s.name)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Button variant="outline" className="rounded-lg" disabled={!canExport} onClick={exportJson}>
            <Download className="size-4" />
            {t("def.export")}
          </Button>
          <Button
            className="press rounded-lg font-semibold hover:brightness-107"
            disabled={!canSave}
            onClick={() => setDialog({ kind: "save" })}
          >
            <Save className="size-4" />
            {t("def.save.open")}
          </Button>
        </div>
      </div>
      {!canSave && invalid.length === 0 && (
        <p className="-mt-3 text-right text-[11px] text-sub">
          {historyFull
            ? t("def.save.full").replace("{n}", String(MAX_SNAPSHOTS))
            : t("def.save.needsValue")}
        </p>
      )}

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
        <div id="def-form" className="scroll-mt-20 space-y-4">
          <BuildCard
            build={draft.build}
            onChange={editBuild}
            onClear={() => editBuild(emptyBuild())}
            badge={
              isSample ? (
                <span className="rounded-md border border-dashed border-gold px-2 py-0.5 text-[11px] font-medium tracking-wide text-gold">
                  {t("def.sampleTag")}
                </span>
              ) : undefined
            }
          />
          <OpponentCard
            opponent={draft.opponent}
            onChange={editOpponent}
            onClear={() => editOpponent(emptyOpponent())}
          />
        </div>

        <div className="min-w-0 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2" aria-live="polite">
            {DAMAGE_KINDS.map((kind) => (
              <ResultCard
                key={kind}
                kind={kind}
                evaluation={evaluations[kind]}
                baseline={baselineView(kind)}
              />
            ))}
          </div>
          <p className="text-[11px] text-sub">{t("def.result.footnote")}</p>
          {anyTotal && (
            <>
              <PressureTable
                build={draft.build}
                opponent={draft.opponent}
                baseline={baseline?.build}
              />
              <ProbeTable build={draft.build} opponent={draft.opponent} />
            </>
          )}
        </div>
      </div>

      <HistorySection
        snapshots={snapshots}
        opponent={draft.opponent}
        compareId={compareId}
        onLoad={(snapshot) => {
          setDraft((d) => ({ ...d, build: snapshot.build }));
          setIsSample(false);
          document.getElementById("def-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
        }}
        onCompare={setCompareId}
        onEdit={(snapshot) => setDialog({ kind: "edit", snapshot })}
        onDelete={setToDelete}
      />

      <FormulaNotes />

      {/* phone: the answer stays in view while the form is being filled */}
      {anyTotal && (
        <div className="fixed inset-x-0 bottom-0 z-10 flex items-center justify-center gap-4 border-t border-line bg-surface/95 px-4 py-2.5 text-sm backdrop-blur-sm sm:hidden">
          <span className="text-xs text-sub">{t("def.result.blockedShort")}</span>
          {DAMAGE_KINDS.map((kind) => {
            const e = evaluations[kind];
            return (
              <span key={kind} className="inline-flex items-center gap-1.5">
                <KindTag kind={kind} short />
                <span className="font-mono font-bold tabular-nums">
                  {e.status === "ok" && e.total !== null ? formatPercent(1 - e.total) : "—"}
                </span>
              </span>
            );
          })}
        </div>
      )}

      <SnapshotDialogHost
        dialog={dialog}
        defaultName={t("def.save.defaultName").replace("{date}", today)}
        onClose={() => setDialog(null)}
        onSave={async (name, note) => {
          await addDefenseSnapshot({
            name,
            ...(note ? { note } : {}),
            build: draft.build,
            ...(hasAnyOpponentValue(draft.opponent) ? { opponent: draft.opponent } : {}),
            formulaVersion: FORMULA_VERSION,
            savedAt: new Date().toISOString(),
          });
        }}
      />

      <AlertDialog
        open={toDelete !== null}
        onOpenChange={(open) => {
          if (!open) setToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("def.delete.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("def.delete.body").replace("{name}", toDelete?.name ?? "")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (!toDelete) return;
                if (compareId === toDelete.id) setCompareId(null);
                void deleteDefenseSnapshot(toDelete.id);
                setToDelete(null);
              }}
            >
              {t("def.history.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function SnapshotDialogHost({
  dialog,
  defaultName,
  onClose,
  onSave,
}: {
  dialog: DialogState;
  defaultName: string;
  onClose: () => void;
  onSave: (name: string, note: string) => Promise<void>;
}) {
  const editing = dialog?.kind === "edit" ? dialog.snapshot : null;
  return (
    <SnapshotDialog
      open={dialog !== null}
      mode={editing ? "edit" : "save"}
      initialName={editing ? editing.name : defaultName}
      initialNote={editing?.note ?? ""}
      onClose={onClose}
      onSubmit={
        editing
          ? (name, note) => updateDefenseSnapshot(editing.id, { name, note })
          : onSave
      }
    />
  );
}
