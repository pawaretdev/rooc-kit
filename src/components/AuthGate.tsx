"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useSession } from "next-auth/react";
import type { ReactNode } from "react";
import { useT } from "@/lib/i18n";
import { localDb, setSetting } from "@/lib/local-db";
import { BlobMark } from "./icons";
import { LegalNotice } from "./LegalNotice";
import { ProviderSignInButtons } from "./ProviderSignInButtons";

/**
 * One-time entry choice for app pages: sign in (Discord/Google) or continue
 * anonymously with data kept in this browser. The choice is stored in local
 * settings, so the gate shows once per browser; signed-in sessions skip it.
 * Core features stay fully usable without an account (anonymous path).
 */
const AUTH_CHOICE_KEY = "authChoice";

export function AuthGate({ children }: { children: ReactNode }) {
  const t = useT();
  const { data: session, status } = useSession();
  const choiceRecord = useLiveQuery(
    () => localDb.settings.get(AUTH_CHOICE_KEY),
    [],
    "loading" as const,
  );

  if (session?.user) return <>{children}</>;

  if (status === "loading" || choiceRecord === "loading") {
    return (
      <div className="flex flex-1 items-center justify-center py-24 text-sm text-sub">
        {t("common.loading")}
      </div>
    );
  }

  if (choiceRecord?.value === "anonymous") return <>{children}</>;

  return (
    <div className="flex flex-1 items-start justify-center px-4 py-16">
      <div className="w-full max-w-sm rounded-xl border border-line bg-surface p-6 animate-rise-in">
        <h1 className="flex items-center gap-2 text-lg font-bold tracking-tight">
          <BlobMark size={20} className="text-accent" />
          {t("gate.title")}
        </h1>
        <p className="mt-1 mb-5 text-sm text-sub">{t("gate.subtitle")}</p>
        <ProviderSignInButtons />
        <div
          aria-hidden
          className="my-4 flex items-center gap-3 text-xs tracking-widest text-sub uppercase"
        >
          <span className="h-px flex-1 bg-line" />
          {t("gate.or")}
          <span className="h-px flex-1 bg-line" />
        </div>
        <button
          type="button"
          onClick={() => {
            void setSetting(AUTH_CHOICE_KEY, "anonymous");
          }}
          className="press w-full rounded-lg border border-line px-4 py-2.5 text-sm font-medium hover:bg-surface-2"
        >
          {t("gate.anonymous")}
        </button>
        <p className="mt-3 rounded-lg border border-dashed border-line px-3 py-2 text-xs text-sub">
          {t("gate.anonymousNote")}
        </p>
        <p className="mt-3 text-xs text-sub">{t("gate.syncNote")}</p>
        <div className="mt-3">
          <LegalNotice />
        </div>
      </div>
    </div>
  );
}
