"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useSession } from "next-auth/react";
import { useLiveQuery } from "dexie-react-hooks";
import { liveQuery, type Subscription } from "dexie";
import {
  DEFENSE_SYNC_KEY,
  localDb,
  mergeIntoDefenseHistory,
  setSetting,
} from "@/lib/local-db";
import { historyKey, parseHistoryEntries, type DefenseHistoryEntry } from "./history";

/**
 * Opt-in cloud sync for DEF Planner history. Mounted once in Providers,
 * but idle unless this browser turned history sync on AND someone is signed
 * in — history stays local by default.
 *
 * On start it pulls the cloud list and merges it in per record, pushing back
 * only if the merge produced something the server lacks; afterwards every
 * local change is debounce-pushed and the server's merged answer folded back.
 */

export type DefenseSyncStatus = "off" | "syncing" | "synced" | "error";

let currentStatus: DefenseSyncStatus = "off";
const listeners = new Set<() => void>();

function setStatus(next: DefenseSyncStatus) {
  if (currentStatus === next) return;
  currentStatus = next;
  for (const notify of listeners) notify();
}

export function useDefenseSyncStatus(): DefenseSyncStatus {
  return useSyncExternalStore(
    (onChange) => {
      listeners.add(onChange);
      return () => listeners.delete(onChange);
    },
    () => currentStatus,
    () => "off" as const,
  );
}

/**
 * Whether history sync is on for the signed-in account in this browser;
 * undefined while loading. The opt-in stores WHICH account turned it on, so
 * someone else signing in on a shared browser never uploads this history
 * into their account without opting in themselves.
 */
export function useDefenseSyncEnabled(): boolean | undefined {
  const { data: session, status } = useSession();
  const userId = session?.user?.id;
  const stored = useLiveQuery(
    async () => (await localDb.settings.get(DEFENSE_SYNC_KEY))?.value ?? null,
    [],
    "loading" as const,
  );
  if (status === "loading" || stored === "loading") return undefined;
  return Boolean(userId) && stored === userId;
}

/** Turns sync on for `userId` in this browser, or off (null). */
export async function setDefenseSyncUser(userId: string | null): Promise<void> {
  await setSetting(DEFENSE_SYNC_KEY, userId);
}

/** Removes the cloud copy; the local history is untouched. */
export async function deleteCloudDefenseHistory(): Promise<boolean> {
  try {
    const res = await fetch("/api/defense-history", { method: "DELETE" });
    return res.ok;
  } catch {
    return false;
  }
}

/** A 4xx won't fix itself on retry (bad payload, signed out) — stop and show it. */
class SyncHttpError extends Error {
  constructor(readonly status: number) {
    super(`defense history ${status}`);
  }
}

function retryable(error: unknown): boolean {
  return !(error instanceof SyncHttpError) || error.status >= 500;
}

async function readEntries(res: Response): Promise<DefenseHistoryEntry[]> {
  if (!res.ok) throw new SyncHttpError(res.status);
  const body: unknown = await res.json();
  return parseHistoryEntries(
    typeof body === "object" && body !== null ? (body as { entries?: unknown }).entries : undefined,
  );
}

function put(entries: DefenseHistoryEntry[], keepalive = false): Promise<Response> {
  return fetch("/api/defense-history", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ entries }),
    ...(keepalive ? { keepalive: true } : {}),
  });
}

const DEBOUNCE_MS = 1_500;
const RETRY_MS = 15_000;

export function DefenseHistorySync() {
  const active = useDefenseSyncEnabled() === true;

  useEffect(() => {
    if (!active) {
      setStatus("off");
      return;
    }

    let cancelled = false;
    let debounceTimer: ReturnType<typeof setTimeout> | undefined;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let subscription: Subscription | undefined;
    /** historyKey of what the server holds as of the last exchange */
    let serverKey: string | null = null;
    let latest: DefenseHistoryEntry[] | undefined;
    let dirty = false;

    const fail = (error: unknown, retry: () => void) => {
      if (cancelled) return;
      setStatus("error");
      clearTimeout(retryTimer);
      if (retryable(error)) retryTimer = setTimeout(retry, RETRY_MS);
    };

    const upload = async () => {
      setStatus("syncing");
      try {
        const local = await localDb.defenseHistory.toArray();
        const merged = await readEntries(await put(local));
        if (cancelled) return;
        serverKey = historyKey(merged);
        await mergeIntoDefenseHistory(merged);
        if (!cancelled) setStatus("synced");
      } catch (error) {
        fail(error, () => void upload());
      }
    };

    const startWatch = () => {
      if (cancelled || subscription) return;
      subscription = liveQuery(() => localDb.defenseHistory.toArray()).subscribe({
        next: (entries) => {
          latest = entries;
          // Folding the server's answer back in also emits — nothing new then.
          if (historyKey(entries) === serverKey) return;
          dirty = true;
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => {
            dirty = false;
            void upload();
          }, DEBOUNCE_MS);
        },
        error: () => setStatus("error"),
      });
    };

    const reconcile = async () => {
      setStatus("syncing");
      try {
        const remote = await readEntries(await fetch("/api/defense-history"));
        if (cancelled) return;
        serverKey = historyKey(remote);
        const merged = await mergeIntoDefenseHistory(remote);
        if (cancelled) return;
        if (historyKey(merged) !== serverKey) await upload();
        else setStatus("synced");
        startWatch();
      } catch (error) {
        fail(error, () => void reconcile());
      }
    };

    // Best-effort last push when the tab closes mid-debounce.
    const flush = () => {
      if (!dirty || !latest) return;
      dirty = false;
      clearTimeout(debounceTimer);
      void put(latest, true).catch(() => {
        // keepalive rejects oversized bodies — the next visit reconciles anyway
      });
    };
    window.addEventListener("pagehide", flush);

    void reconcile();

    return () => {
      cancelled = true;
      clearTimeout(debounceTimer);
      clearTimeout(retryTimer);
      subscription?.unsubscribe();
      window.removeEventListener("pagehide", flush);
      setStatus("off");
    };
  }, [active]);

  return null;
}
