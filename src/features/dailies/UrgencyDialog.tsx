"use client";

import { RotateCcw } from "lucide-react";
import { setSetting, type Cadence } from "@/lib/local-db";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DEFAULT_URGENCY,
  URGENCY_KEY,
  type UrgencyConfig,
  type UrgencyStage,
} from "./urgency";

const MAX_HOURS = 336;

function clampHours(value: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(0, Math.min(MAX_HOURS, Math.round(value)));
}

function StageRow({
  stage,
  onChange,
  disabled,
}: {
  stage: UrgencyStage;
  onChange: (next: UrgencyStage) => void;
  disabled: boolean;
}) {
  const t = useT();
  return (
    <div className="flex items-center gap-2 py-1.5">
      <input
        type="color"
        value={stage.color}
        disabled={disabled}
        aria-label={t("dailies.urgencyColor")}
        onChange={(e) => onChange({ ...stage, color: e.target.value })}
        className="size-8 shrink-0 cursor-pointer rounded-md border border-line bg-transparent disabled:opacity-50"
      />
      <span className="text-xs text-sub">{t("dailies.urgencyWithin")}</span>
      <Input
        type="number"
        inputMode="numeric"
        min={0}
        max={MAX_HOURS}
        disabled={disabled}
        key={stage.hours}
        defaultValue={stage.hours}
        aria-label={t("dailies.urgencyHours")}
        className="h-8 w-20"
        onBlur={(e) => {
          const next = clampHours(Number(e.target.value), stage.hours);
          e.target.value = String(next);
          if (next !== stage.hours) onChange({ ...stage, hours: next });
        }}
      />
      <span className="text-xs text-sub">{t("dailies.urgencyHoursUnit")}</span>
      <span
        aria-hidden
        style={{ color: disabled ? undefined : stage.color }}
        className={`ml-auto truncate text-sm ${disabled ? "text-sub" : ""}`}
      >
        {t("dailies.urgencyPreview")}
      </span>
    </div>
  );
}

/** Per-device tuning for the reset-urgency tints (never synced to the cloud). */
export function UrgencyDialog({
  open,
  onClose,
  config,
}: {
  open: boolean;
  onClose: () => void;
  config: UrgencyConfig;
}) {
  const t = useT();

  const save = (next: UrgencyConfig) => void setSetting(URGENCY_KEY, next);

  const setStage = (cadence: Cadence, index: number, next: UrgencyStage) =>
    save({
      ...config,
      [cadence]: config[cadence].map((s, i) => (i === index ? next : s)),
    });

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent
        className="max-h-[85vh] overflow-y-auto sm:max-w-lg"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{t("dailies.urgencyTitle")}</DialogTitle>
          <DialogDescription>{t("dailies.urgencyHint")}</DialogDescription>
        </DialogHeader>

        <Label className="flex items-center gap-2.5">
          <Checkbox
            checked={config.enabled}
            onCheckedChange={(v) => save({ ...config, enabled: v === true })}
          />
          <span className="text-sm font-medium">{t("dailies.urgencyOn")}</span>
        </Label>

        {(["daily", "weekly"] as const).map((cadence) => (
          <section key={cadence}>
            <h3 className="border-b border-line pb-2 text-xs font-bold text-sub">
              {t(cadence === "daily" ? "dailies.daily" : "dailies.weekly")}
            </h3>
            <div className="divide-y divide-line/60">
              {config[cadence].map((stage, i) => (
                <StageRow
                  key={i}
                  stage={stage}
                  disabled={!config.enabled}
                  onChange={(next) => setStage(cadence, i, next)}
                />
              ))}
            </div>
          </section>
        ))}

        <div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => save({ ...DEFAULT_URGENCY, enabled: config.enabled })}
          >
            <RotateCcw className="size-3.5" />
            {t("dailies.urgencyReset")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
