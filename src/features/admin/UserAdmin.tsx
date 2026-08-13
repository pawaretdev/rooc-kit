"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  ArrowDown,
  ArrowUp,
  CloudOff,
  Search,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { StatTile } from "@/features/admin/StatTile";
import { useLocale, useT, type MessageKey } from "@/lib/i18n";
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

interface AdminUser {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  /** ISO strings — the API serialises Date columns to JSON */
  createdAt: string;
  syncedAt: string | null;
  providers: string[];
  isSuperAdmin: boolean;
}

type Status = "loading" | "idle" | "busy" | "error";

/** `all` is the "no filter" sentinel — Radix Select forbids an empty value. */
const ALL = "all";
type SyncFilter = typeof ALL | "synced" | "never";

type SortKey = "account" | "createdAt" | "syncedAt";
type SortDir = "asc" | "desc";

async function fetchUsers(): Promise<AdminUser[]> {
  const res = await fetch("/api/admin/users");
  if (!res.ok) throw new Error("failed");
  const body = (await res.json()) as { users: AdminUser[] };
  return body.users;
}

function Avatar({ user }: { user: AdminUser }) {
  if (user.image) {
    return (
      <Image
        src={user.image}
        alt=""
        width={32}
        height={32}
        className="size-8 shrink-0 rounded-full"
      />
    );
  }
  return (
    <span
      aria-hidden
      className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-ink"
    >
      {(user.name ?? user.email ?? "?").slice(0, 1).toUpperCase()}
    </span>
  );
}

/** Provider ids are canonical (never translated), like monster/map names. */
function ProviderBadge({ provider }: { provider: string }) {
  return (
    <span className="rounded-[5px] border border-line px-1.5 py-px font-mono text-[10px] font-bold tracking-wider text-sub uppercase">
      {provider}
    </span>
  );
}

/** Sortable column header — click to sort, click again to flip direction. */
function SortHeader({
  labelKey,
  sortKey,
  sort,
  onSort,
  className = "",
}: {
  labelKey: MessageKey;
  sortKey: SortKey;
  sort: { key: SortKey; dir: SortDir };
  onSort: (key: SortKey) => void;
  className?: string;
}) {
  const t = useT();
  const active = sort.key === sortKey;
  const Icon = sort.dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <th
      className={className}
      aria-sort={
        active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"
      }
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`flex items-center gap-1 font-mono text-[10px] font-bold tracking-wider uppercase ${
          active ? "text-ink" : "text-sub hover:text-ink"
        }`}
      >
        {t(labelKey)}
        <Icon className={`size-3 ${active ? "" : "opacity-0"}`} />
      </button>
    </th>
  );
}

/**
 * Backoffice user list. Only OAuth accounts appear — anonymous players are
 * local-only and never reach the database. The /admin layout gates access
 * server-side; the API re-checks on every call.
 *
 * The row count is small (one per signed-in account), so search, filtering and
 * sorting all run client-side on the single list the API returns.
 */
export function UserAdmin() {
  const t = useT();
  const { locale } = useLocale();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [query, setQuery] = useState("");
  const [providerFilter, setProviderFilter] = useState<string>(ALL);
  const [syncFilter, setSyncFilter] = useState<SyncFilter>(ALL);
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({
    key: "createdAt",
    dir: "desc",
  });
  const [confirmDelete, setConfirmDelete] = useState<AdminUser | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await fetchUsers();
        if (!cancelled) {
          setUsers(rows);
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

  const formatDate = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
    });
    return (iso: string) => fmt.format(new Date(iso));
  }, [locale]);

  const remove = async (id: string) => {
    setStatus("busy");
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setUsers(await fetchUsers());
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  };

  /** One tile per provider actually in use — no hardcoded provider list. */
  const providerCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const user of users) {
      for (const provider of user.providers) {
        counts.set(provider, (counts.get(provider) ?? 0) + 1);
      }
    }
    return [...counts].sort(([a], [b]) => a.localeCompare(b));
  }, [users]);

  const toggleSort = (key: SortKey) =>
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : // dates read newest-first by default; names read A→Z
          { key, dir: key === "account" ? "asc" : "desc" },
    );

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const rows = users.filter((user) => {
      if (
        needle &&
        !(user.name ?? "").toLowerCase().includes(needle) &&
        !(user.email ?? "").toLowerCase().includes(needle)
      ) {
        return false;
      }
      if (providerFilter !== ALL && !user.providers.includes(providerFilter)) {
        return false;
      }
      if (syncFilter === "synced" && user.syncedAt === null) return false;
      if (syncFilter === "never" && user.syncedAt !== null) return false;
      return true;
    });

    const factor = sort.dir === "asc" ? 1 : -1;
    return rows.sort((a, b) => {
      if (sort.key === "account") {
        const left = (a.name ?? a.email ?? "").toLowerCase();
        const right = (b.name ?? b.email ?? "").toLowerCase();
        return left.localeCompare(right) * factor;
      }
      const left = sort.key === "createdAt" ? a.createdAt : a.syncedAt;
      const right = sort.key === "createdAt" ? b.createdAt : b.syncedAt;
      // never-synced rows sort last in both directions — they have no date
      if (left === null || right === null) {
        if (left === right) return 0;
        return left === null ? 1 : -1;
      }
      return (Date.parse(left) - Date.parse(right)) * factor;
    });
  }, [users, query, providerFilter, syncFilter, sort]);

  const syncedCount = users.filter((user) => user.syncedAt !== null).length;

  return (
    <div className="space-y-5">
      <header>
        <h2 className="text-xl font-extrabold tracking-tight">
          {t("admin.users")}
        </h2>
        <p className="mt-0.5 max-w-prose text-sm text-sub">
          {t("admin.usersHint")}
        </p>
      </header>

      {status === "error" && (
        <p className="text-sm font-medium text-danger">{t("admin.saveError")}</p>
      )}
      {status === "loading" ? (
        <p className="text-sm text-sub">{t("common.loading")}</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile label={t("admin.total")} value={users.length} />
            {providerCounts.map(([provider, count]) => (
              <StatTile key={provider} label={provider} value={count} />
            ))}
            <StatTile
              label={t("admin.usersSynced")}
              value={syncedCount}
              tone="text-gold"
            />
          </div>

          {/* search + filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-56 flex-1 sm:max-w-sm">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-sub" />
              <Input
                value={query}
                placeholder={t("admin.usersSearch")}
                aria-label={t("admin.usersSearch")}
                className="h-8 pl-8"
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <Select value={providerFilter} onValueChange={setProviderFilter}>
              <SelectTrigger
                size="sm"
                aria-label={t("admin.usersProviders")}
                className="w-40"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>
                  {t("admin.usersAllProviders")}
                </SelectItem>
                {providerCounts.map(([provider, count]) => (
                  <SelectItem key={provider} value={provider}>
                    {provider} ({count})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={syncFilter}
              onValueChange={(v) => setSyncFilter(v as SyncFilter)}
            >
              <SelectTrigger
                size="sm"
                aria-label={t("admin.usersLastSync")}
                className="w-44"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t("admin.usersAllSync")}</SelectItem>
                <SelectItem value="synced">
                  {t("admin.usersSynced")}
                </SelectItem>
                <SelectItem value="never">
                  {t("admin.usersLocalOnly")}
                </SelectItem>
              </SelectContent>
            </Select>
            {visible.length !== users.length && (
              <span className="font-mono text-[11px] text-sub tabular-nums">
                {visible.length}/{users.length}
              </span>
            )}
          </div>

          <div className="w-full overflow-x-auto rounded-xl border border-line bg-surface">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left">
                  <SortHeader
                    labelKey="admin.usersAccount"
                    sortKey="account"
                    sort={sort}
                    onSort={toggleSort}
                    className="px-3 py-2.5"
                  />
                  <th className="w-40 px-3 py-2.5 font-mono text-[10px] font-bold tracking-wider text-sub uppercase">
                    {t("admin.usersProviders")}
                  </th>
                  <SortHeader
                    labelKey="admin.usersJoined"
                    sortKey="createdAt"
                    sort={sort}
                    onSort={toggleSort}
                    className="w-44 px-3 py-2.5"
                  />
                  <SortHeader
                    labelKey="admin.usersLastSync"
                    sortKey="syncedAt"
                    sort={sort}
                    onSort={toggleSort}
                    className="w-44 px-3 py-2.5"
                  />
                  <th className="w-12 px-3 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {visible.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sub">
                      {t(
                        users.length === 0
                          ? "admin.usersEmpty"
                          : "admin.usersNoMatch",
                      )}
                    </td>
                  </tr>
                )}
                {visible.map((user) => (
                  <tr key={user.id} className="hover:bg-surface-2/50">
                    <td className="px-3 py-2">
                      <span className="flex items-center gap-2.5">
                        <Avatar user={user} />
                        <span className="min-w-0">
                          <span className="flex items-center gap-1.5">
                            <span className="truncate font-semibold">
                              {user.name ?? "—"}
                            </span>
                            {user.isSuperAdmin && (
                              <ShieldCheck
                                className="size-3.5 shrink-0 text-accent"
                                aria-label={t("admin.area")}
                              />
                            )}
                          </span>
                          <span className="block truncate font-mono text-[11px] text-sub">
                            {user.email ?? "—"}
                          </span>
                        </span>
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className="flex flex-wrap gap-1">
                        {user.providers.map((provider) => (
                          <ProviderBadge key={provider} provider={provider} />
                        ))}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-sub tabular-nums">
                      {formatDate(user.createdAt)}
                    </td>
                    <td className="px-3 py-2 text-sub tabular-nums">
                      {user.syncedAt ? (
                        formatDate(user.syncedAt)
                      ) : (
                        <span className="flex items-center gap-1.5">
                          <CloudOff className="size-3.5" />
                          {t("admin.usersNeverSynced")}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        disabled={status === "busy" || user.isSuperAdmin}
                        aria-label={t("admin.usersDelete")}
                        title={t(
                          user.isSuperAdmin
                            ? "admin.usersDeleteAdmin"
                            : "admin.usersDelete",
                        )}
                        className="text-danger hover:text-danger"
                        onClick={() => setConfirmDelete(user)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
            <AlertDialogTitle>
              {confirmDelete?.email ?? confirmDelete?.name}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("admin.usersDeleteConfirm")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmDelete) void remove(confirmDelete.id);
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
