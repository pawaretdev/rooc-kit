"use client";

import { useEffect, useState } from "react";
import {
  Columns3,
  Grid3x3,
  LayoutList,
  ListChecks,
  Palette,
  Pencil,
  Plus,
  Sparkles,
  UserCog,
} from "lucide-react";
import {
  addGameAccount,
  pruneStaleCompletions,
  setSetting,
  SELECTED_ACCOUNT_KEY,
} from "@/lib/local-db";
import { useT, type MessageKey } from "@/lib/i18n";
import { useSetting } from "@/features/monster-research/useProgress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AccountTabs } from "./AccountTabs";
import { AccountsDialog } from "./AccountsDialog";
import { Checklist } from "./Checklist";
import { ColumnsView } from "./ColumnsView";
import { Hint } from "./Hint";
import { MatrixView } from "./MatrixView";
import { currentLocalDateTime, isWithinEventWindow } from "./period";
import { TasksDialog } from "./TasksDialog";
import { UrgencyDialog } from "./UrgencyDialog";
import { GoldCalendarDialog } from "@/features/gold-diary/GoldCalendarDialog";
import { GoldTodayCard } from "@/features/gold-diary/GoldTodayCard";
import { useGoldDiaryByAccount } from "@/features/gold-diary/useGoldDiary";
import { normalizeUrgency, urgencyColor, URGENCY_KEY } from "./urgency";
import {
  useAllCompletionCounts,
  useCompletionCounts,
  useCurrentPeriods,
  useDailyTasks,
  useGameAccounts,
} from "./useDailies";

function FirstRunCard() {
  const t = useT();
  const [name, setName] = useState("");

  return (
    <section className="mx-auto max-w-md rounded-xl border border-line bg-surface p-6 text-center">
      <ListChecks className="mx-auto mb-3 size-8 text-accent" />
      <h2 className="mb-1 font-bold">{t("dailies.createFirstAccount")}</h2>
      <p className="mb-4 text-sm text-sub">{t("dailies.firstRunHint")}</p>
      <form
        className="flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const trimmed = name.trim();
          if (trimmed) void addGameAccount(trimmed);
        }}
      >
        <Input
          value={name}
          maxLength={100}
          placeholder={t("dailies.defaultAccountName")}
          aria-label={t("dailies.accountName")}
          className="min-w-0 flex-1"
          onChange={(e) => setName(e.target.value)}
        />
        <Button type="submit" disabled={!name.trim()}>
          <Plus className="size-4" />
          {t("dailies.addAccount")}
        </Button>
      </form>
    </section>
  );
}

type DailiesLayout = "single" | "columns" | "matrix";
const LAYOUT_KEY = "dailies.layout";

const LAYOUTS: {
  value: DailiesLayout;
  labelKey: MessageKey;
  icon: React.ReactNode;
}[] = [
  { value: "single", labelKey: "dailies.layoutSingle", icon: <LayoutList className="size-3.5" /> },
  { value: "columns", labelKey: "dailies.layoutColumns", icon: <Columns3 className="size-3.5" /> },
  { value: "matrix", labelKey: "dailies.layoutMatrix", icon: <Grid3x3 className="size-3.5" /> },
];

function LayoutSegment({ value }: { value: DailiesLayout }) {
  const t = useT();
  return (
    <span
      role="group"
      aria-label={t("dailies.layout")}
      className="inline-flex overflow-hidden rounded-lg border border-line"
    >
      {LAYOUTS.map((layout) => (
        <button
          key={layout.value}
          type="button"
          aria-pressed={value === layout.value}
          title={t(layout.labelKey)}
          aria-label={t(layout.labelKey)}
          onClick={() => void setSetting(LAYOUT_KEY, layout.value)}
          className={`press inline-flex h-8 w-9 items-center justify-center ${
            value === layout.value
              ? "bg-accent text-accent-ink"
              : "text-sub hover:text-ink"
          }`}
        >
          {layout.icon}
        </button>
      ))}
    </span>
  );
}

type OpenDialog = "tasks" | "accounts" | "urgency" | "gold" | null;

export function Dailies() {
  const t = useT();
  const accounts = useGameAccounts();
  const tasks = useDailyTasks();
  const periods = useCurrentPeriods();
  const [dialog, setDialog] = useState<OpenDialog>(null);
  const layout = useSetting<DailiesLayout>(LAYOUT_KEY, "single");

  const selectedSetting = useSetting<string | undefined>(
    SELECTED_ACCOUNT_KEY,
    undefined,
  );
  // Fall back to the first account when nothing (or a deleted id) is selected.
  const selected =
    accounts?.find((a) => a.id === selectedSetting) ?? accounts?.[0];
  const counts = useCompletionCounts(selected?.id, periods);
  const allCounts = useAllCompletionCounts(periods);
  const diary = useGoldDiaryByAccount();
  // the daily period key carries the game date — same refresh-on-focus source
  const today = periods.daily.slice(2);

  // Opt-in "urgency colors": pending rows tint as the reset gets close.
  // Recomputed on every render — the periods focus/visibility refresh keeps
  // a long-open tab honest here too.
  const urgencyConfig = normalizeUrgency(
    useSetting<unknown>(URGENCY_KEY, undefined),
  );
  const urgencyColors = {
    daily: urgencyColor(urgencyConfig, "daily"),
    weekly: urgencyColor(urgencyConfig, "weekly"),
  };

  // Old-period rows no longer count; drop them so the table stays tiny.
  useEffect(() => {
    void pruneStaleCompletions([periods.daily, periods.weekly]);
  }, [periods.daily, periods.weekly]);

  if (accounts === undefined || tasks === undefined) {
    return <p className="py-10 text-center text-sub">{t("common.loading")}</p>;
  }

  // Single place the event window is applied: a task outside its window is
  // gone from every checklist surface. The edit modal still gets the full
  // list so expired events can be deleted.
  const nowLocal = currentLocalDateTime();
  const visibleTasks = tasks.filter((task) =>
    isWithinEventWindow(task, nowLocal),
  );
  const hasContent = accounts.length > 0 && visibleTasks.length > 0;
  // single-account view constrains width for readability; the multi-account
  // layouts get the whole page
  const containerWidth = layout === "single" ? "max-w-2xl" : "max-w-6xl";

  // Gold entry sits with the checklist: the single layout logs the selected
  // ID, the multi-ID layouts log every ID at once.
  const goldAccounts =
    layout === "single" ? (selected ? [selected] : []) : accounts;
  const goldCard = diary !== undefined && goldAccounts.length > 0 && (
    <GoldTodayCard
      accounts={goldAccounts}
      diary={diary}
      today={today}
      onOpenHistory={() => setDialog("gold")}
    />
  );

  return (
    <div className={`mx-auto w-full ${containerWidth} space-y-5`}>
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-extrabold tracking-tight">
          {t("dailies.title")}
        </h1>
        {hasContent && (
          <span className="ml-auto flex items-center gap-2">
            <LayoutSegment value={layout} />
            <Button
              variant={urgencyConfig.enabled ? "default" : "outline"}
              size="icon-sm"
              aria-label={t("dailies.urgencyTitle")}
              title={t("dailies.urgencyTitle")}
              onClick={() => setDialog("urgency")}
            >
              <Palette className="size-4" />
            </Button>
            {layout !== "single" && (
              <Button
                variant="outline"
                size="icon-sm"
                aria-label={t("dailies.manageAccounts")}
                title={t("dailies.manageAccounts")}
                onClick={() => setDialog("accounts")}
              >
                <UserCog className="size-4" />
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDialog("tasks")}
            >
              <Pencil className="size-3.5" />
              {t("dailies.edit")}
            </Button>
          </span>
        )}
      </div>

      {accounts.length === 0 ? (
        <FirstRunCard />
      ) : visibleTasks.length === 0 ? (
        /* the fastest path to value is the curated list, so it leads */
        <section className="rounded-xl border border-line bg-surface p-6 text-center">
          <ListChecks className="mx-auto mb-3 size-8 text-accent" />
          <p className="mb-4 text-sm text-sub">{t("dailies.emptyTasks")}</p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button size="sm" onClick={() => setDialog("tasks")}>
              <Sparkles className="size-3.5" />
              {t("dailies.browseSuggestions")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDialog("tasks")}
            >
              <Plus className="size-3.5" />
              {t("dailies.addOwnTask")}
            </Button>
          </div>
          {goldCard && <div className="mt-5 text-left">{goldCard}</div>}
        </section>
      ) : layout === "single" ? (
        <>
          <AccountTabs
            accounts={accounts}
            selectedId={selected?.id ?? ""}
            onManage={() => setDialog("accounts")}
          />
          {/* the whole point of the feature — surfaced once the user has
              something to check off, and only while they have a single ID */}
          <Hint
            settingKey="dailies.hint.secondAccount"
            messageKey="dailies.hint.secondAccount"
            show={accounts.length === 1}
          />
          {/* second aha: once there are two IDs, they can be seen together */}
          <Hint
            settingKey="dailies.hint.layouts"
            messageKey="dailies.hint.layouts"
            show={accounts.length > 1}
          />
          {goldCard}
          {selected && counts !== undefined && (
            /* keyed by account: switching IDs replays the row stagger, which
               reads as "this is a different ID's list" */
            <div key={selected.id} className="animate-rise-in">
              <Checklist
                tasks={visibleTasks}
                accountId={selected.id}
                periods={periods}
                counts={counts}
                urgencyColors={urgencyColors}
              />
            </div>
          )}
        </>
      ) : allCounts === undefined ? (
        <p className="py-10 text-center text-sub">{t("common.loading")}</p>
      ) : layout === "columns" ? (
        <div key="columns" className="animate-rise-in space-y-5">
          {goldCard}
          <ColumnsView
            accounts={accounts}
            tasks={visibleTasks}
            periods={periods}
            allCounts={allCounts}
            urgencyColors={urgencyColors}
          />
        </div>
      ) : (
        <div key="matrix" className="animate-rise-in space-y-5">
          {goldCard}
          <MatrixView
            accounts={accounts}
            tasks={visibleTasks}
            periods={periods}
            allCounts={allCounts}
          />
        </div>
      )}

      {hasContent && (
        <p className="px-1 text-xs text-sub">{t("dailies.resetNote")}</p>
      )}

      <TasksDialog
        open={dialog === "tasks"}
        onClose={() => setDialog(null)}
        tasks={tasks}
      />
      <AccountsDialog
        open={dialog === "accounts"}
        onClose={() => setDialog(null)}
        accounts={accounts}
      />
      <UrgencyDialog
        open={dialog === "urgency"}
        onClose={() => setDialog(null)}
        config={urgencyConfig}
      />
      {diary !== undefined && (
        <GoldCalendarDialog
          open={dialog === "gold"}
          onClose={() => setDialog(null)}
          accounts={accounts}
          initialAccountId={selected?.id}
          diary={diary}
          today={today}
        />
      )}
    </div>
  );
}
