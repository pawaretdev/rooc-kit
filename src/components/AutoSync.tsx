"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useSession } from "next-auth/react";
import { liveQuery, type Subscription } from "dexie";
import { dataVersion } from "@/lib/game-data";
import {
  localDb,
  replaceAllDailies,
  replaceAllGoldShop,
  replaceAllLevels,
  type DailiesSnapshot,
  type GoldShopSnapshot,
  type MonsterLevelRecord,
} from "@/lib/local-db";
import { buildProgressExport, parseProgressExport } from "@/lib/progress-io";

/**
 * Automatic cloud sync — mounted once in Providers so it lives for the whole
 * session. While signed in, local progress (levels + dailies + gold shop) is
 * pushed to /api/progress on every change; nobody has to press a sync button.
 *
 * On sign-in / page load the local and cloud snapshots are reconciled with
 * last-write-wins: whichever side changed most recently replaces the other
 * wholesale (same replace semantics as the old manual restore). Anonymous
 * usage never reaches this — the whole effect is gated on the session.
 */

export type AutoSyncStatus = "idle" | "syncing" | "synced" | "error";

let currentStatus: AutoSyncStatus = "idle";
const listeners = new Set<() => void>();

function setStatus(next: AutoSyncStatus) {
  if (currentStatus === next) return;
  currentStatus = next;
  for (const notify of listeners) notify();
}

/** Live auto-sync state for status displays (account menu, /setup). */
export function useAutoSyncStatus(): AutoSyncStatus {
  return useSyncExternalStore(
    (onChange) => {
      listeners.add(onChange);
      return () => listeners.delete(onChange);
    },
    () => currentStatus,
    () => "idle" as const,
  );
}

interface LocalSnapshot {
  levels: MonsterLevelRecord[];
  dailies: DailiesSnapshot;
  goldShop: GoldShopSnapshot;
}

async function readLocalSnapshot(): Promise<LocalSnapshot> {
  const [levels, accounts, tasks, completions, categories, items, plans, incomes, diary] =
    await Promise.all([
      localDb.monsterLevels.toArray(),
      localDb.gameAccounts.toArray(),
      localDb.dailyTasks.toArray(),
      localDb.taskCompletions.toArray(),
      localDb.shopCategories.toArray(),
      localDb.shopItems.toArray(),
      localDb.buyPlans.toArray(),
      localDb.goldIncomes.toArray(),
      localDb.goldDiary.toArray(),
    ]);
  return {
    levels,
    dailies: { accounts, tasks, completions },
    goldShop: { categories, items, plans, incomes, diary },
  };
}

function isEmpty({ levels, dailies, goldShop }: LocalSnapshot): boolean {
  return (
    levels.length === 0 &&
    dailies.accounts.length === 0 &&
    dailies.tasks.length === 0 &&
    dailies.completions.length === 0 &&
    goldShop.categories.length === 0 &&
    goldShop.items.length === 0 &&
    goldShop.plans.length === 0 &&
    goldShop.incomes.length === 0 &&
    goldShop.diary.length === 0
  );
}

/** Most recent write across everything the snapshot carries (ISO strings sort). */
function latestLocalWrite({ levels, dailies, goldShop }: LocalSnapshot): string {
  let latest = "";
  const consider = (ts: string) => {
    if (ts > latest) latest = ts;
  };
  for (const r of levels) consider(r.updatedAt);
  for (const a of dailies.accounts) consider(a.createdAt);
  for (const t of dailies.tasks) consider(t.updatedAt);
  for (const c of dailies.completions) consider(c.completedAt);
  for (const c of goldShop.categories) consider(c.updatedAt);
  for (const i of goldShop.items) consider(i.updatedAt);
  for (const p of goldShop.plans) consider(p.updatedAt);
  for (const i of goldShop.incomes) consider(i.updatedAt);
  for (const d of goldShop.diary) consider(d.updatedAt);
  return latest;
}

async function putSnapshot(
  snapshot: LocalSnapshot,
  keepalive = false,
): Promise<boolean> {
  const doc = buildProgressExport(
    snapshot.levels,
    dataVersion,
    snapshot.dailies,
    snapshot.goldShop,
  );
  const res = await fetch("/api/progress", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(doc),
    ...(keepalive ? { keepalive: true } : {}),
  });
  return res.ok;
}

const DEBOUNCE_MS = 2_000;
const RETRY_MS = 15_000;

export function AutoSync() {
  const { data: session } = useSession();
  const authed = Boolean(session?.user);

  useEffect(() => {
    if (!authed) {
      setStatus("idle");
      return;
    }

    let cancelled = false;
    let debounceTimer: ReturnType<typeof setTimeout> | undefined;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let subscription: Subscription | undefined;
    /** latest liveQuery emission — lets the pagehide flush skip an async read */
    let latest: LocalSnapshot | undefined;
    let dirty = false;

    const fail = (retry: () => void) => {
      setStatus("error");
      clearTimeout(retryTimer);
      retryTimer = setTimeout(retry, RETRY_MS);
    };

    const upload = async () => {
      setStatus("syncing");
      try {
        const ok = await putSnapshot(latest ?? (await readLocalSnapshot()));
        if (cancelled) return;
        if (ok) setStatus("synced");
        else fail(() => void upload());
      } catch {
        if (!cancelled) fail(() => void upload());
      }
    };

    const scheduleUpload = () => {
      dirty = true;
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        dirty = false;
        void upload();
      }, DEBOUNCE_MS);
    };

    const startWatch = () => {
      if (cancelled) return;
      let first = true;
      subscription = liveQuery(readLocalSnapshot).subscribe({
        next: (value) => {
          latest = value;
          // The initial emission mirrors what reconcile just settled — no upload.
          if (first) {
            first = false;
            return;
          }
          scheduleUpload();
        },
        // Dexie errors here are unrecoverable for the watcher; surface as error.
        error: () => setStatus("error"),
      });
    };

    const reconcile = async () => {
      setStatus("syncing");
      try {
        const res = await fetch("/api/progress");
        const cloud =
          res.status === 404
            ? null
            : res.ok
              ? parseProgressExport(await res.text())
              : (() => {
                  throw new Error(`sync fetch ${res.status}`);
                })();
        if (cancelled) return;

        const local = await readLocalSnapshot();
        if (cloud && (isEmpty(local) || cloud.exportedAt > latestLocalWrite(local))) {
          // Cloud is newer (or this browser is fresh) — cloud wins.
          await replaceAllLevels(cloud.levels);
          if (cloud.dailies) await replaceAllDailies(cloud.dailies);
          if (cloud.goldShop) await replaceAllGoldShop(cloud.goldShop);
          if (!cancelled) setStatus("synced");
        } else if (!isEmpty(local)) {
          // Local is newer (or cloud has nothing yet) — push it up.
          if (!(await putSnapshot(local))) throw new Error("sync put failed");
          if (!cancelled) setStatus("synced");
        } else {
          setStatus("synced");
        }
        startWatch();
      } catch {
        if (!cancelled) fail(() => void reconcile());
      }
    };

    // Best-effort last write when the tab closes mid-debounce.
    const flush = () => {
      if (!dirty || !latest) return;
      dirty = false;
      clearTimeout(debounceTimer);
      try {
        void putSnapshot(latest, true);
      } catch {
        // keepalive rejects on oversized bodies — nothing else to do here
      }
    };
    window.addEventListener("pagehide", flush);

    void reconcile();

    return () => {
      cancelled = true;
      clearTimeout(debounceTimer);
      clearTimeout(retryTimer);
      subscription?.unsubscribe();
      window.removeEventListener("pagehide", flush);
      setStatus("idle");
    };
  }, [authed]);

  return null;
}
