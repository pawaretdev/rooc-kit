"use client";

import { Lightbulb, X } from "lucide-react";
import { setSetting } from "@/lib/local-db";
import { useT, type MessageKey } from "@/lib/i18n";
import { useSetting } from "@/features/monster-research/useProgress";

/**
 * A one-line contextual nudge shown at the moment the feature becomes
 * relevant — never a tour, never blocking. Dismissal is permanent and lives
 * in local settings, so it never nags twice.
 */
export function Hint({
  settingKey,
  messageKey,
  show,
}: {
  /** local settings key holding the dismissed flag */
  settingKey: string;
  messageKey: MessageKey;
  /** the context that makes this hint useful right now */
  show: boolean;
}) {
  const t = useT();
  const dismissed = useSetting<boolean>(settingKey, false);
  if (!show || dismissed) return null;

  return (
    <p className="animate-rise-in flex items-center gap-2 rounded-lg border border-dashed border-line bg-surface/60 px-3 py-2 text-xs text-sub">
      <Lightbulb className="size-3.5 shrink-0 text-gold" />
      <span className="min-w-0 flex-1">{t(messageKey)}</span>
      <button
        type="button"
        aria-label={t("dailies.dismissHint")}
        title={t("dailies.dismissHint")}
        onClick={() => void setSetting(settingKey, true)}
        className="press shrink-0 rounded-md p-0.5 text-sub hover:text-ink"
      >
        <X className="size-3.5" />
      </button>
    </p>
  );
}
