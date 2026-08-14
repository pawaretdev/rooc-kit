"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import {
  clearGoldIncome,
  setGoldIncome,
  type GoldIncomeRecord,
} from "@/lib/local-db";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Per = GoldIncomeRecord["per"];

/** Average gold income per selected account — amount + day/week unit. */
export function IncomeDialog({
  open,
  onClose,
  accountId,
  income,
  diaryAvg,
}: {
  open: boolean;
  onClose: () => void;
  accountId: string;
  income: GoldIncomeRecord | null;
  /** avg gold per logged diary day (recent weeks) — powers the shortcut */
  diaryAvg?: number;
}) {
  const t = useT();

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("shop.incomeTitle")}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-sub">{t("shop.incomeHint")}</p>
        {/* keyed so reopening (or switching accounts) resets to the stored record */}
        {open && (
          <IncomeEditor
            key={accountId}
            accountId={accountId}
            income={income}
            diaryAvg={diaryAvg}
            onClose={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function IncomeEditor({
  accountId,
  income,
  diaryAvg,
  onClose,
}: {
  accountId: string;
  income: GoldIncomeRecord | null;
  diaryAvg?: number;
  onClose: () => void;
}) {
  const t = useT();
  const [amount, setAmount] = useState(
    income ? String(income.amount) : "",
  );
  const [per, setPer] = useState<Per>(income?.per ?? "day");

  const parsed = Math.floor(Number(amount));
  const valid = Number.isFinite(parsed) && parsed > 0;

  const save = () => {
    if (!valid) return;
    void setGoldIncome(accountId, parsed, per);
    onClose();
  };

  return (
    <>
      <form
        className="flex flex-wrap items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <Input
          value={amount}
          type="number"
          min={1}
          inputMode="numeric"
          placeholder="0"
          aria-label={t("shop.incomeAmount")}
          className="h-8 w-32 font-mono tabular-nums"
          onChange={(e) => setAmount(e.target.value)}
        />
        <span
          role="group"
          aria-label={t("shop.income")}
          className="inline-flex overflow-hidden rounded-lg border border-line text-sm"
        >
          {(["day", "week"] as const).map((unit) => (
            <button
              key={unit}
              type="button"
              aria-pressed={per === unit}
              onClick={() => setPer(unit)}
              className={`press px-3 py-1.5 ${
                per === unit
                  ? "bg-accent font-semibold text-accent-ink"
                  : "text-sub hover:text-ink"
              }`}
            >
              {t(unit === "day" ? "shop.perDay" : "shop.perWeek")}
            </button>
          ))}
        </span>
      </form>

      {diaryAvg !== undefined && (
        <Button
          variant="outline"
          size="sm"
          className="self-start"
          onClick={() => {
            void setGoldIncome(accountId, Math.round(diaryAvg), "day");
            onClose();
          }}
        >
          <Sparkles className="size-3.5 text-gold" />
          {t("shop.useDiaryAvg")}
          <span className="font-mono text-xs text-gold tabular-nums">
            {Math.round(diaryAvg).toLocaleString()} / {t("shop.perDay")}
          </span>
        </Button>
      )}

      <div className="flex items-center gap-2 border-t border-line pt-3">
        <Button size="sm" onClick={save} disabled={!valid}>
          {t("common.save")}
        </Button>
        {income && (
          <Button
            variant="ghost"
            size="sm"
            className="text-danger hover:text-danger"
            onClick={() => {
              void clearGoldIncome(accountId);
              onClose();
            }}
          >
            {t("common.clear")}
          </Button>
        )}
      </div>
    </>
  );
}
