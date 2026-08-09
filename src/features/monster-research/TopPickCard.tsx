"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { getMap, getMonster } from "@/lib/game-data";
import {
  setSetting,
  MAX_MR_LEVEL,
  type MonsterLevelRecord,
} from "@/lib/local-db";
import { useT } from "@/lib/i18n";
import { kindBadgeUrl } from "@/lib/images";
import { MonsterAvatar } from "@/components/MonsterAvatar";
import { ElementBadge } from "@/components/ElementBadge";
import { MapPinIcon } from "@/components/icons";
import { levelOf, type RowView } from "./rowStats";
import { MonsterDetailDialog } from "./MonsterDetailDialog";
import { RowEditDialog } from "./RowEditDialog";

const mvpBadge = kindBadgeUrl("mvp");
const miniBadge = kindBadgeUrl("mini");

interface TopPickCardProps {
  view: RowView;
  levels: ReadonlyMap<string, MonsterLevelRecord>;
}

/**
 * "Tonight's pick" hero — the Smart-priority #1 row, led by the blockers the
 * best trip clears. Hideable via mr.hideTopPick (Settings turns it back on).
 */
export function TopPickCard({ view, levels }: TopPickCardProps) {
  const t = useT();
  const { row, rowLevel, blockerIds, bestMapId, maxSameMapBlockers, hasMvp, hasMini } =
    view;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  if (!bestMapId || maxSameMapBlockers === 0) return null;
  const clearedIds = blockerIds.filter((id) =>
    getMonster(id).mapIds.includes(bestMapId),
  );
  const restIds = row.monsterIds.filter((id) => !clearedIds.includes(id));
  const selected = selectedId ? getMonster(selectedId) : null;

  return (
    <section className="rounded-xl border border-accent/40 bg-surface p-4">
      <header className="mb-3 flex items-center gap-3">
        <span className="text-sm font-semibold text-accent">
          {t("mr.topPick")}
        </span>
        <ElementBadge element={row.elementId} />
        <span className="text-sm text-sub">
          {t("mr.row")} {row.index} · {t("mr.lvShort")} {rowLevel}
        </span>
        <button
          type="button"
          aria-label={t("mr.topPick.hide")}
          title={t("mr.topPick.hide")}
          onClick={() => void setSetting("mr.hideTopPick", true)}
          className="press ml-auto rounded-md p-1 text-sub hover:bg-surface-2 hover:text-ink"
        >
          <X className="size-3.5" />
        </button>
      </header>

      {/* the answer: these blockers, this map */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-lg border border-danger/35 bg-danger/5 px-4 py-3">
        <span className="flex items-center gap-2.5">
          {clearedIds.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setSelectedId(id)}
              aria-haspopup="dialog"
              aria-label={getMonster(id).name}
              className="press rounded-lg hover:-translate-y-0.5"
            >
              <MonsterAvatar
                monster={getMonster(id)}
                level={levelOf(id, levels)}
                size="lg"
                tone="danger"
              />
            </button>
          ))}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-mono text-[9.5px] font-bold tracking-[0.13em] text-danger uppercase">
            {t("mr.blockerFlag")} · {t("mr.farmThis")}
          </span>
          <span className="mt-0.5 block text-[15px] font-bold">
            {clearedIds.map((id) => getMonster(id).name).join(", ")}
          </span>
          <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-sub">
            <MapPinIcon size={12} className="shrink-0 text-accent" />
            <span className="font-semibold text-ink">
              {getMap(bestMapId).name}
            </span>
            {maxSameMapBlockers === 1
              ? `— ${t("mr.trip.clearsOne")}`
              : `— ${t("mr.trip.clears").replace("{n}", String(maxSameMapBlockers))}`}
            {hasMvp && mvpBadge && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={mvpBadge}
                alt={t("mr.mapHasMvp")}
                title={t("mr.mapHasMvp")}
                draggable={false}
                className="h-4 w-4 shrink-0"
              />
            )}
            {hasMini && miniBadge && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={miniBadge}
                alt={t("mr.mapHasMini")}
                title={t("mr.mapHasMini")}
                draggable={false}
                className="h-4 w-4 shrink-0"
              />
            )}
          </span>
        </span>
        <button
          type="button"
          onClick={() => setEditing(true)}
          aria-haspopup="dialog"
          className="press rounded-lg border border-line px-3.5 py-1.5 text-xs font-semibold text-sub hover:border-accent hover:text-accent"
        >
          {t("mr.editRow")}
        </button>
      </div>

      {/* the rest of the row, quiet */}
      {restIds.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-3">
          {restIds.map((id) => {
            const monster = getMonster(id);
            const level = levelOf(id, levels);
            const maxed = level >= MAX_MR_LEVEL;
            return (
              <li key={id} className={maxed ? "opacity-50" : undefined}>
                <button
                  type="button"
                  onClick={() => setSelectedId(id)}
                  aria-haspopup="dialog"
                  aria-label={`${monster.name} — ${t("mr.lvShort")} ${level}`}
                  title={`${monster.name} · ${t("mr.lvShort")} ${level}`}
                  className="press relative block rounded-lg hover:-translate-y-0.5"
                >
                  <MonsterAvatar monster={monster} level={level} size="md" />
                  <span
                    aria-hidden
                    className={`absolute -right-1 -bottom-1 flex h-4 min-w-4 items-center justify-center rounded border border-surface px-0.5 font-mono text-[9px] font-bold tabular-nums ${
                      maxed ? "bg-gold text-gold-ink" : "bg-surface-2 text-ink"
                    }`}
                  >
                    {level}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <MonsterDetailDialog
        monster={selected}
        levels={levels}
        onClose={() => setSelectedId(null)}
      />
      <RowEditDialog
        row={editing ? row : null}
        levels={levels}
        onClose={() => setEditing(false)}
      />
    </section>
  );
}
