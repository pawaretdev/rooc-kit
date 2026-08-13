"use client";

import { useRef, useState } from "react";
import { Plus, UserCog } from "lucide-react";
import {
  addGameAccount,
  setSetting,
  SELECTED_ACCOUNT_KEY,
  type GameAccountRecord,
} from "@/lib/local-db";
import { useT } from "@/lib/i18n";

/**
 * Segmented account switcher — which game ID the check-offs apply to.
 * "+" appends an inline ghost tab to type the new name right in place
 * (Enter/blur commits, Esc or empty cancels); the pencil opens
 * accounts-only management.
 */
export function AccountTabs({
  accounts,
  selectedId,
  onManage,
}: {
  accounts: GameAccountRecord[];
  selectedId: string;
  onManage: () => void;
}) {
  const t = useT();
  const [draft, setDraft] = useState<string | null>(null);
  // Enter/Escape unmount the input and its blur still fires with a stale
  // closure — this flag makes whichever event runs first the only one counted.
  const doneRef = useRef(false);

  const commit = async () => {
    if (doneRef.current) return;
    doneRef.current = true;
    const name = draft?.trim();
    setDraft(null);
    if (!name) return;
    const id = await addGameAccount(name);
    await setSetting(SELECTED_ACCOUNT_KEY, id);
  };

  const cancel = () => {
    doneRef.current = true;
    setDraft(null);
  };

  const openDraft = () => {
    doneRef.current = false;
    setDraft("");
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="inline-flex overflow-hidden rounded-lg border border-line">
        {accounts.map((account) => (
          <button
            key={account.id}
            type="button"
            aria-pressed={account.id === selectedId}
            onClick={() => void setSetting(SELECTED_ACCOUNT_KEY, account.id)}
            className={`press max-w-40 truncate px-3.5 py-1.5 text-sm ${
              account.id === selectedId
                ? "bg-accent font-semibold text-accent-ink"
                : "text-sub hover:text-ink"
            }`}
          >
            {account.name}
          </button>
        ))}
        {draft !== null && (
          <input
            autoFocus
            // opts into the unlayered [data-slot]:focus-visible escape hatch in
            // globals.css — Tailwind's outline utilities live in a cascade layer
            // and can never beat the unlayered global :focus-visible outline
            data-slot="account-draft"
            value={draft}
            maxLength={100}
            placeholder={t("dailies.accountName")}
            aria-label={t("dailies.accountName")}
            className="w-28 border-l border-dashed border-line bg-transparent px-3.5 py-1.5 text-sm outline-none placeholder:text-sub/60 focus-visible:bg-surface-2"
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => void commit()}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void commit();
              } else if (e.key === "Escape") {
                cancel();
              }
            }}
          />
        )}
      </span>
      {draft === null && (
        <button
          type="button"
          onClick={openDraft}
          aria-label={t("dailies.addAccount")}
          className="press inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line text-sub hover:border-accent hover:text-accent"
        >
          <Plus className="size-4" />
        </button>
      )}
      <button
        type="button"
        onClick={onManage}
        aria-label={t("dailies.manageAccounts")}
        title={t("dailies.manageAccounts")}
        className="press inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line text-sub hover:border-accent hover:text-accent"
      >
        <UserCog className="size-4" />
      </button>
    </div>
  );
}
