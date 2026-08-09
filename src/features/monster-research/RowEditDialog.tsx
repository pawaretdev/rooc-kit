"use client";

import { useState } from "react";
import { getMonster, type ResearchRow } from "@/lib/game-data";
import {
  clampLevel,
  fillMonsterLevels,
  setMonsterLevel,
  MAX_MR_LEVEL,
  type MonsterLevelRecord,
} from "@/lib/local-db";
import { useT } from "@/lib/i18n";
import { MonsterAvatar } from "@/components/MonsterAvatar";
import { ElementBadge } from "@/components/ElementBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { levelOf } from "./rowStats";
import { LevelStepper } from "./LevelStepper";

interface RowEditDialogProps {
  /** null keeps the dialog closed */
  row: ResearchRow | null;
  levels: ReadonlyMap<string, MonsterLevelRecord>;
  onClose: () => void;
}

/** Row editor — fill the whole row at once or step each monster individually. */
export function RowEditDialog({ row, levels, onClose }: RowEditDialogProps) {
  const t = useT();
  const [fillValue, setFillValue] = useState("");

  const applyFill = () => {
    if (!row) return;
    const parsed = Number(fillValue);
    if (fillValue === "" || !Number.isFinite(parsed)) return;
    void fillMonsterLevels([...row.monsterIds], clampLevel(parsed), "confirmed");
    setFillValue("");
  };

  return (
    <Dialog
      open={row !== null}
      onOpenChange={(open) => {
        if (!open) {
          setFillValue("");
          onClose();
        }
      }}
    >
      {row && (
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5">
              <ElementBadge element={row.elementId} className="font-semibold" />
              {t("mr.row")} {row.index}
            </DialogTitle>
            <DialogDescription>{t("mr.editRow.hint")}</DialogDescription>
          </DialogHeader>

          {/* fill the whole row */}
          <div className="flex items-center gap-2 rounded-lg border border-line bg-surface-2 px-3 py-2">
            <span className="text-sm font-medium">{t("mr.fillRow")}</span>
            <Input
              type="number"
              inputMode="numeric"
              min={0}
              max={MAX_MR_LEVEL}
              value={fillValue}
              onChange={(e) => setFillValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  applyFill();
                }
              }}
              aria-label={t("mr.fillRow")}
              placeholder="–"
              className="ml-auto h-8 w-14 text-center font-mono tabular-nums"
            />
            <Button size="sm" variant="outline" onClick={applyFill}>
              {t("entry.apply")}
            </Button>
          </div>

          {/* per-monster steppers */}
          <ul className="divide-y divide-line">
            {row.monsterIds.map((id) => {
              const monster = getMonster(id);
              const level = levelOf(id, levels);
              return (
                <li key={id} className="flex items-center gap-3 py-2">
                  <MonsterAvatar monster={monster} level={level} size="md" />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {monster.name}
                  </span>
                  <LevelStepper
                    value={level}
                    ariaLabel={`${monster.name} ${t("mr.lvShort")}`}
                    onChange={(next) =>
                      void setMonsterLevel(id, next, "confirmed")
                    }
                  />
                </li>
              );
            })}
          </ul>
        </DialogContent>
      )}
    </Dialog>
  );
}
