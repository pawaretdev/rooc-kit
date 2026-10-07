"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import {
  ArrowDownToLine,
  Cloud,
  CloudOff,
  GitCompareArrows,
  History,
  LoaderCircle,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import { useLocale, useT, type MessageKey } from "@/lib/i18n";
import { SignInDialog } from "@/components/SignInDialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  deleteCloudDefenseHistory,
  setDefenseSyncUser,
  useDefenseSyncEnabled,
  useDefenseSyncStatus,
} from "./DefenseHistorySync";
import { HistoryChart, type ChartSeries } from "./HistoryChart";
import { formatPercent, formatSigned, formatStat } from "./format";
import { STAT_NAMES } from "./labels";
import {
  chartLayers,
  STAT_METRICS,
  statLimitKey,
  statValue,
  toughnessPoint,
  type DefenseSnapshot,
  type StatMetric,
} from "./history";
import { DAMAGE_KINDS, type DamageKind, type DefenseSide, type Opponent } from "./model";
import { LAYER_NAME } from "./ResultCard";

const KIND_COLOR: Record<DamageKind, string> = {
  physical: "var(--chart-phys)",
  magic: "var(--chart-mag)",
};

export function metricLabel(metric: StatMetric): string {
  if (metric === "level" || metric === "pvpReduction") return STAT_NAMES[metric];
  const [kind, field] = metric.split(".") as [DamageKind, keyof DefenseSide];
  return STAT_NAMES[kind][field];
}

function metricColor(metric: StatMetric): string {
  if (metric.startsWith("physical.")) return KIND_COLOR.physical;
  if (metric.startsWith("magic.")) return KIND_COLOR.magic;
  return "var(--gold)";
}

function formatMetric(metric: StatMetric, value: number): string {
  const key = statLimitKey(metric);
  return key === "percent" || key === "dmgReduction" ? `${formatStat(value)}%` : formatStat(value);
}

function useDateFormat() {
  const { locale } = useLocale();
  const tag = locale === "th" ? "th-TH-u-ca-gregory" : "en-GB";
  const long = new Intl.DateTimeFormat(tag, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const short = new Intl.DateTimeFormat(tag, { day: "numeric", month: "short" });
  const time = new Intl.DateTimeFormat(tag, { hour: "2-digit", minute: "2-digit" });
  return {
    long: (iso: string) => long.format(new Date(iso)),
    short: (iso: string) => short.format(new Date(iso)),
    time: (iso: string) => time.format(new Date(iso)),
  };
}

// ── sync control ──

const STATUS_KEY: Record<ReturnType<typeof useDefenseSyncStatus>, MessageKey> = {
  off: "def.sync.idle",
  syncing: "def.sync.syncing",
  synced: "def.sync.synced",
  error: "def.sync.error",
};

function SyncControl() {
  const t = useT();
  const { data: session, status: sessionStatus } = useSession();
  const enabled = useDefenseSyncEnabled();
  const status = useDefenseSyncStatus();
  const [confirmOff, setConfirmOff] = useState(false);
  const [deleteError, setDeleteError] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (sessionStatus === "loading" || enabled === undefined) return null;

  if (!session?.user) {
    return (
      <div className="flex flex-wrap items-center gap-2 text-xs text-sub">
        <span className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-line px-2 py-1">
          <CloudOff className="size-3.5" />
          {t("def.sync.localOnly")}
        </span>
        <span>{t("def.sync.signInHint")}</span>
        <SignInDialog />
      </div>
    );
  }

  const turnOff = async (deleteCloud: boolean) => {
    if (deleteCloud) {
      setDeleting(true);
      const ok = await deleteCloudDefenseHistory();
      setDeleting(false);
      if (!ok) {
        setDeleteError(true);
        return;
      }
    }
    await setDefenseSyncUser(null);
    setDeleteError(false);
    setConfirmOff(false);
  };

  return (
    <div className="flex flex-col items-start gap-1 sm:items-end">
      <Label className="cursor-pointer gap-2 text-sm font-medium">
        <Checkbox
          checked={enabled}
          onCheckedChange={(v) => {
            if (v === true) void setDefenseSyncUser(session.user.id ?? null);
            else setConfirmOff(true);
          }}
        />
        {t("def.sync.toggle")}
      </Label>
      <p
        role="status"
        className={`inline-flex items-center gap-1.5 text-[11px] ${status === "error" ? "text-danger" : "text-sub"}`}
      >
        {enabled ? (
          status === "syncing" ? (
            <LoaderCircle className="size-3 animate-spin" />
          ) : (
            <Cloud className="size-3" />
          )
        ) : (
          <CloudOff className="size-3" />
        )}
        {enabled ? t(STATUS_KEY[status]) : t("def.sync.offHint")}
      </p>

      <AlertDialog
        open={confirmOff}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmOff(false);
            setDeleteError(false);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("def.sync.offTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("def.sync.offBody")}</AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && (
            <p role="alert" className="text-sm text-danger">
              {t("def.sync.deleteFailed")}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              variant="outline"
              onClick={(e) => {
                e.preventDefault();
                void turnOff(true);
              }}
            >
              {t("def.sync.offDelete")}
            </AlertDialogAction>
            <AlertDialogAction
              disabled={deleting}
              onClick={(e) => {
                e.preventDefault();
                void turnOff(false);
              }}
            >
              {t("def.sync.offKeep")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── chart card ──

type ChartMode = "toughness" | "stat";

function ChartCard({
  snapshots,
  opponent,
}: {
  snapshots: DefenseSnapshot[];
  opponent: Opponent;
}) {
  const t = useT();
  const dates = useDateFormat();
  const [mode, setMode] = useState<ChartMode>("toughness");
  const [metric, setMetric] = useState<StatMetric>("physical.equipment");

  // all saved on one day → the axis would read "8 Oct … 8 Oct"; show times instead
  const sameDay =
    snapshots.length > 1 &&
    dates.short(snapshots[0].savedAt) === dates.short(snapshots[snapshots.length - 1].savedAt);
  const points = snapshots.map((s) => ({
    name: s.name,
    date: sameDay ? `${dates.short(s.savedAt)} ${dates.time(s.savedAt)}` : dates.short(s.savedAt),
  }));
  const layers = Object.fromEntries(
    DAMAGE_KINDS.map((kind) => [kind, chartLayers(opponent, kind)]),
  ) as Record<DamageKind, ReturnType<typeof chartLayers>>;

  const toughness: ChartSeries[] = DAMAGE_KINDS.filter((kind) => layers[kind].length > 0).map(
    (kind) => ({
      id: kind,
      label: t(kind === "physical" ? "def.kind.physicalShort" : "def.kind.magicShort"),
      color: KIND_COLOR[kind],
      // plotted as damage blocked, so a line going UP means getting tougher
      values: snapshots.map((s) => {
        const through = toughnessPoint(s.build, opponent, kind, layers[kind]);
        return through === null ? null : 1 - through;
      }),
    }),
  );
  const toughnessEmpty = toughness.every((s) => s.values.every((v) => v === null));

  const statSeries: ChartSeries[] = [
    {
      id: metric,
      label: metricLabel(metric),
      color: metricColor(metric),
      values: snapshots.map((s) => statValue(s.build, metric)),
    },
  ];
  const statEmpty = statSeries[0].values.every((v) => v === null);

  return (
    <section className="min-w-0 rounded-xl border border-line bg-surface p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span
          role="group"
          aria-label={t("def.chart.mode")}
          className="inline-flex overflow-hidden rounded-lg border border-line text-sm"
        >
          {(["toughness", "stat"] as const).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={mode === m}
              onClick={() => setMode(m)}
              className={`press px-3 py-1.5 ${
                mode === m ? "bg-accent font-semibold text-accent-ink" : "text-sub hover:text-ink"
              }`}
            >
              {t(m === "toughness" ? "def.chart.toughness" : "def.chart.stat")}
            </button>
          ))}
        </span>
        {mode === "stat" && (
          <Select value={metric} onValueChange={(v) => setMetric(v as StatMetric)}>
            <SelectTrigger size="sm" className="w-48 rounded-lg" aria-label={t("def.chart.pickStat")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STAT_METRICS.map((m) => (
                <SelectItem key={m} value={m}>
                  {metricLabel(m)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {mode === "toughness" && toughness.length > 0 && (
          <ul className="ml-auto flex items-center gap-3 text-xs text-sub">
            {toughness.map((s) => (
              <li key={s.id} className="flex items-center gap-1.5">
                <span aria-hidden className="h-0.5 w-4 rounded-sm" style={{ background: s.color }} />
                {s.label}
              </li>
            ))}
          </ul>
        )}
      </div>

      <h3 className="mt-3 text-xs font-semibold">
        {mode === "toughness" ? t("def.chart.toughnessTitle") : metricLabel(metric)}
      </h3>

      <div className="mt-2">
        {mode === "toughness" ? (
          toughness.length === 0 || toughnessEmpty ? (
            <ChartEmpty text={t("def.chart.toughnessEmpty")} />
          ) : (
            <HistoryChart
              series={toughness}
              points={points}
              formatValue={(v) => formatPercent(v)}
              formatTick={(v) => formatPercent(v, 0)}
              ariaLabel={t("def.chart.toughnessTitle")}
            />
          )
        ) : statEmpty ? (
          <ChartEmpty text={t("def.chart.statEmpty")} />
        ) : (
          <HistoryChart
            series={statSeries}
            points={points}
            formatValue={(v) => formatMetric(metric, v)}
            ariaLabel={metricLabel(metric)}
          />
        )}
      </div>

      {mode === "toughness" && toughness.length > 0 && (
        <p className="mt-2 text-[11px] text-sub">
          {t("def.chart.toughnessNote")}{" "}
          {toughness
            .map(
              (s) =>
                `${s.label}: ${layers[s.id as DamageKind]
                  .map((id) => t(LAYER_NAME[id][s.id as DamageKind]))
                  .join(" · ")}`,
            )
            .join(" — ")}
        </p>
      )}
    </section>
  );
}

function ChartEmpty({ text }: { text: string }) {
  return (
    <div className="flex h-[220px] items-center justify-center rounded-lg border border-dashed border-line px-6 text-center text-xs text-sub">
      {text}
    </div>
  );
}

// ── snapshot list ──

function diffChips(current: DefenseSnapshot, previous: DefenseSnapshot | undefined): string[] {
  if (!previous) return [];
  const chips: string[] = [];
  for (const metric of STAT_METRICS) {
    const now = statValue(current.build, metric);
    const before = statValue(previous.build, metric);
    if (now === null || before === null || now === before) continue;
    const key = statLimitKey(metric);
    const suffix = key === "percent" || key === "dmgReduction" ? "%" : "";
    chips.push(`${formatSigned(Number((now - before).toFixed(2)), suffix)} ${metricLabel(metric)}`);
  }
  return chips;
}

function side(snapshot: DefenseSnapshot, kind: DamageKind): string {
  const s = snapshot.build[kind];
  const eq = s.equipment === null ? "—" : formatStat(s.equipment);
  const ref = s.refine === null ? "—" : formatStat(s.refine);
  return `${eq} +${ref}`;
}

function SnapshotList({
  snapshots,
  opponent,
  compareId,
  onLoad,
  onCompare,
  onEdit,
  onDelete,
}: {
  snapshots: DefenseSnapshot[];
  opponent: Opponent;
  compareId: string | null;
  onLoad: (snapshot: DefenseSnapshot) => void;
  onCompare: (id: string | null) => void;
  onEdit: (snapshot: DefenseSnapshot) => void;
  onDelete: (snapshot: DefenseSnapshot) => void;
}) {
  const t = useT();
  const dates = useDateFormat();
  const layers = Object.fromEntries(
    DAMAGE_KINDS.map((kind) => [kind, chartLayers(opponent, kind)]),
  ) as Record<DamageKind, ReturnType<typeof chartLayers>>;

  // newest first; each row diffs against the snapshot saved before it
  const rows = snapshots.map((s, i) => ({ snapshot: s, previous: snapshots[i - 1] })).reverse();

  return (
    <ol className="max-h-[30rem] space-y-2 overflow-y-auto pr-1" aria-label={t("def.history.list")}>
      {rows.map(({ snapshot, previous }) => {
        const chips = diffChips(snapshot, previous);
        const comparing = compareId === snapshot.id;
        const through = DAMAGE_KINDS.map((kind) => {
          const v = toughnessPoint(snapshot.build, opponent, kind, layers[kind]);
          return v === null ? null : `${t(kind === "physical" ? "def.kind.physicalShort" : "def.kind.magicShort")} ${formatPercent(1 - v)}`;
        }).filter((v): v is string => v !== null);
        return (
          <li
            key={snapshot.id}
            className={`rounded-lg border p-3 ${comparing ? "border-accent" : "border-line"}`}
          >
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{snapshot.name}</p>
                <p className="font-mono text-[11px] text-sub tabular-nums">
                  {dates.long(snapshot.savedAt)}
                </p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger
                  aria-label={t("def.history.more").replace("{name}", snapshot.name)}
                  className="press inline-flex size-7 shrink-0 items-center justify-center rounded-lg border border-line text-sub hover:bg-surface-2 hover:text-ink"
                >
                  <MoreHorizontal className="size-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => onEdit(snapshot)}>
                    <Pencil className="size-4" />
                    {t("def.history.edit")}
                  </DropdownMenuItem>
                  <DropdownMenuItem variant="destructive" onSelect={() => onDelete(snapshot)}>
                    <Trash2 className="size-4" />
                    {t("def.history.delete")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <p className="mt-1.5 font-mono text-[11px] tabular-nums">
              <span className="text-sub">PDEF</span> {side(snapshot, "physical")}
              <span className="text-sub"> · MDEF</span> {side(snapshot, "magic")}
              <span className="text-sub"> · PvP</span>{" "}
              {snapshot.build.pvpReduction === null ? "—" : formatStat(snapshot.build.pvpReduction)}
            </p>
            {through.length > 0 && (
              <p className="mt-0.5 text-[11px] text-sub">
                {t("def.history.throughNow")} <span className="font-mono text-ink">{through.join(" · ")}</span>
              </p>
            )}
            {chips.length > 0 && (
              <ul className="mt-1.5 flex flex-wrap gap-1" aria-label={t("def.history.changes")}>
                {chips.slice(0, 4).map((chip) => (
                  <li key={chip} className="rounded-md border border-line px-1.5 py-px font-mono text-[10px] tabular-nums">
                    {chip}
                  </li>
                ))}
                {chips.length > 4 && (
                  <li className="px-1 text-[10px] text-sub">+{chips.length - 4}</li>
                )}
              </ul>
            )}
            {snapshot.note && <p className="mt-1.5 text-xs text-sub">{snapshot.note}</p>}

            <div className="mt-2 flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => onLoad(snapshot)}
                className="press inline-flex items-center gap-1 rounded-lg border border-line px-2 py-1 text-xs hover:bg-surface-2"
              >
                <ArrowDownToLine className="size-3.5" />
                {t("def.history.load")}
              </button>
              <button
                type="button"
                aria-pressed={comparing}
                onClick={() => onCompare(comparing ? null : snapshot.id)}
                className={`press inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs ${
                  comparing
                    ? "border-accent bg-accent font-semibold text-accent-ink"
                    : "border-line hover:bg-surface-2"
                }`}
              >
                <GitCompareArrows className="size-3.5" />
                {t(comparing ? "def.history.comparing" : "def.history.compare")}
              </button>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function HistorySection({
  snapshots,
  opponent,
  compareId,
  onLoad,
  onCompare,
  onEdit,
  onDelete,
}: {
  snapshots: DefenseSnapshot[];
  opponent: Opponent;
  compareId: string | null;
  onLoad: (snapshot: DefenseSnapshot) => void;
  onCompare: (id: string | null) => void;
  onEdit: (snapshot: DefenseSnapshot) => void;
  onDelete: (snapshot: DefenseSnapshot) => void;
}) {
  const t = useT();

  return (
    <section aria-labelledby="def-history" className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="def-history" className="flex items-center gap-2 text-lg font-bold">
            <History className="size-5 text-gold" />
            {t("def.history.title")}
          </h2>
          <p className="mt-0.5 text-xs text-sub">{t("def.history.hint")}</p>
        </div>
        <SyncControl />
      </div>

      {snapshots.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line px-6 py-8 text-center">
          <p className="text-sm font-semibold">{t("def.history.emptyTitle")}</p>
          <p className="mx-auto mt-1 max-w-md text-xs text-sub">{t("def.history.emptyHint")}</p>
        </div>
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
          <ChartCard snapshots={snapshots} opponent={opponent} />
          <SnapshotList
            snapshots={snapshots}
            opponent={opponent}
            compareId={compareId}
            onLoad={onLoad}
            onCompare={onCompare}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        </div>
      )}
    </section>
  );
}
