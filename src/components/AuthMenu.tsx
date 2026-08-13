"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import {
  Archive,
  ChevronDown,
  CloudUpload,
  LogOut,
  Settings,
  ShieldCheck,
} from "lucide-react";
import { dataVersion } from "@/lib/game-data";
import { localDb, readAllDailies } from "@/lib/local-db";
import { buildProgressExport } from "@/lib/progress-io";
import { useT } from "@/lib/i18n";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LocaleSegment } from "./LocaleSegment";
import { SignInDialog } from "./SignInDialog";

function Avatar({
  image,
  name,
  size,
}: {
  image?: string | null;
  name?: string | null;
  size: number;
}) {
  if (image) {
    return (
      <Image
        src={image}
        alt=""
        width={size}
        height={size}
        className="shrink-0 rounded-full"
      />
    );
  }
  return (
    <span
      aria-hidden
      style={{ width: size, height: size }}
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-ink"
    >
      {(name ?? "?").slice(0, 1).toUpperCase()}
    </span>
  );
}

type SyncState = "idle" | "busy" | "done" | "error";

export function AuthMenu() {
  const { data: session, status } = useSession();
  const t = useT();
  const [syncState, setSyncState] = useState<SyncState>("idle");

  if (status === "loading") {
    // avatar-sized skeleton so the bar doesn't jump when the session arrives
    return (
      <span
        aria-hidden
        className="h-9 w-9 animate-pulse rounded-full bg-surface-2"
      />
    );
  }

  if (!session?.user) return <SignInDialog />;
  const { user } = session;

  const syncNow = async () => {
    setSyncState("busy");
    try {
      const records = await localDb.monsterLevels.toArray();
      const res = await fetch("/api/progress", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          buildProgressExport(records, dataVersion, await readAllDailies()),
        ),
      });
      setSyncState(res.ok ? "done" : "error");
    } catch {
      setSyncState("error");
    }
  };

  const syncLabel: Record<SyncState, string> = {
    idle: t("sync.upload"),
    busy: t("common.loading"),
    done: t("sync.done"),
    error: t("sync.error"),
  };

  return (
    // modal={false}: no body scroll-lock — locking removes the scrollbar and
    // shifts the full-width bar, which reads as the navbar "shrinking"
    <DropdownMenu modal={false} onOpenChange={() => setSyncState("idle")}>
      <DropdownMenuTrigger
        aria-label={t("auth.menu")}
        className="press inline-flex items-center gap-1 rounded-full border border-transparent p-0.5 pr-1.5 text-sub hover:border-line hover:bg-surface-2 data-[state=open]:border-line data-[state=open]:bg-surface-2"
      >
        <Avatar image={user.image} name={user.name} size={36} />
        <ChevronDown className="size-3 transition-transform duration-150 [[data-state=open]>&]:rotate-180" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <div className="flex items-center gap-2.5 px-2 py-1.5">
          <Avatar image={user.image} name={user.name} size={40} />
          <span className="min-w-0 text-sm">
            <span className="block truncate font-semibold">{user.name}</span>
            <span className="block truncate text-xs text-sub">
              {user.email}
            </span>
          </span>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/setup">
            <Archive />
            {t("entry.title")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <Settings />
            {t("nav.settings")}
          </Link>
        </DropdownMenuItem>
        {user.isSuperAdmin && (
          <DropdownMenuItem asChild>
            <Link href="/admin">
              <ShieldCheck />
              {t("admin.area")}
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          disabled={syncState === "busy"}
          onSelect={(e) => {
            // keep the menu open so the result label is visible
            e.preventDefault();
            if (syncState !== "busy") void syncNow();
          }}
        >
          <CloudUpload
            className={syncState === "error" ? "text-danger" : undefined}
          />
          {syncLabel[syncState]}
        </DropdownMenuItem>
        <div className="flex items-center justify-between px-2 py-1.5 text-sm">
          <span className="text-sub">{t("locale.label")}</span>
          <LocaleSegment />
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onSelect={() => void signOut()}
        >
          <LogOut />
          {t("auth.signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
