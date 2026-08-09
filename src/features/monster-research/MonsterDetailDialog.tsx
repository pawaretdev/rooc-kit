"use client";

import {
  getMap,
  getRow,
  mapsWithMini,
  mapsWithMvp,
  type Monster,
} from "@/lib/game-data";
import {
  setMonsterLevel,
  MAX_MR_LEVEL,
  type MonsterLevelRecord,
} from "@/lib/local-db";
import { useT } from "@/lib/i18n";
import { kindBadgeUrl } from "@/lib/images";
import { MonsterAvatar } from "@/components/MonsterAvatar";
import { ElementBadge } from "@/components/ElementBadge";
import { MapPinIcon } from "@/components/icons";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { levelOf } from "./rowStats";
import { LevelStepper } from "./LevelStepper";
import { RowMeter } from "./RowMeter";

const mvpBadge = kindBadgeUrl("mvp");
const miniBadge = kindBadgeUrl("mini");

export function KindTag({ kind }: { kind: Monster["kind"] }) {
  if (kind === "normal") return null;
  return (
    <span
      className={`rounded-md px-1 text-[10px] font-bold uppercase tracking-wide ${
        kind === "mvp" ? "bg-gold/15 text-gold" : "bg-el-water/15 text-el-water"
      }`}
    >
      {kind}
    </span>
  );
}

const chipClass =
  "inline-flex items-center gap-1 rounded-md bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-sub";

interface MonsterDetailDialogProps {
  /** null keeps the dialog closed */
  monster: Monster | null;
  levels: ReadonlyMap<string, MonsterLevelRecord>;
  onClose: () => void;
}

/** Bestiary sheet — identity chips, the research-level block, and spawn maps. */
export function MonsterDetailDialog({
  monster,
  levels,
  onClose,
}: MonsterDetailDialogProps) {
  const t = useT();
  const level = monster ? levelOf(monster.id, levels) : 0;
  const maxed = level >= MAX_MR_LEVEL;

  return (
    <Dialog
      open={monster !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      {monster && (
        <DialogContent className="sm:max-w-md">
          {/* ── identity plate ── */}
          <DialogHeader className="flex-row items-center gap-3.5 space-y-0 text-left">
            <MonsterAvatar monster={monster} level={level} size="lg" />
            <div className="min-w-0">
              <DialogTitle className="flex items-center gap-2 text-lg">
                <span className="truncate">{monster.name}</span>
                <KindTag kind={monster.kind} />
              </DialogTitle>
              <DialogDescription asChild>
                <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <ElementBadge element={monster.elementId} />
                  <span className={chipClass}>
                    {t("mr.row")} {getRow(monster.rowId).index}
                  </span>
                  {monster.baseLevel !== undefined && (
                    <span className={`${chipClass} font-mono tabular-nums`}>
                      Base {t("mr.lvShort")} {monster.baseLevel}
                    </span>
                  )}
                </span>
              </DialogDescription>
            </div>
          </DialogHeader>

          {/* ── research level — the block this sheet exists for ── */}
          <div className="rounded-lg border border-line bg-surface-2 p-3">
            <p className="mb-2.5 font-mono text-[9.5px] font-bold tracking-[0.13em] text-sub uppercase">
              {t("mr.monsterLevel")}
            </p>
            <div className="flex items-center gap-3.5">
              <span
                className={`font-mono text-3xl leading-none font-extrabold tabular-nums ${
                  maxed ? "text-gold" : ""
                }`}
              >
                {level}
                <span className="text-sm font-medium text-sub">
                  /{MAX_MR_LEVEL}
                </span>
              </span>
              <span className="min-w-0 flex-1">
                <RowMeter rowLevel={level} hasRowLevel />
              </span>
              <LevelStepper
                value={level}
                ariaLabel={`${monster.name} ${t("mr.lvShort")}`}
                onChange={(next) =>
                  void setMonsterLevel(monster.id, next, "confirmed")
                }
              />
            </div>
          </div>

          {/* ── spawn maps ── */}
          <div className="text-sm">
            <p className="mb-1.5 flex items-center gap-1.5 font-mono text-[9.5px] font-bold tracking-[0.13em] text-sub uppercase">
              <MapPinIcon size={12} className="shrink-0 text-accent" />
              {t("mr.detail.maps")}
            </p>
            <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line">
              {monster.mapIds.map((mapId) => {
                const map = getMap(mapId);
                return (
                  <li
                    key={mapId}
                    className="flex items-center gap-2 bg-surface-2/50 px-3 py-2"
                  >
                    <span className="truncate">{map.name}</span>
                    {/* kind badges sit right-aligned, just before the level */}
                    <span className="ml-auto flex shrink-0 items-center gap-1.5">
                      {mapsWithMvp.has(mapId) && mvpBadge && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={mvpBadge}
                          alt={t("mr.mapHasMvp")}
                          title={t("mr.mapHasMvp")}
                          draggable={false}
                          className="h-4 w-4 shrink-0"
                        />
                      )}
                      {mapsWithMini.has(mapId) && miniBadge && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={miniBadge}
                          alt={t("mr.mapHasMini")}
                          title={t("mr.mapHasMini")}
                          draggable={false}
                          className="h-4 w-4 shrink-0"
                        />
                      )}
                      {map.level !== undefined && (
                        <span className="font-mono text-[11px] tabular-nums text-sub">
                          {t("mr.lvShort")} {map.level}
                        </span>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </DialogContent>
      )}
    </Dialog>
  );
}
