"use client";

import { useEffect, useRef, useState } from "react";
import { SquarePen } from "lucide-react";
import { getMap, getMonster } from "@/lib/game-data";
import { MAX_MR_LEVEL, type MonsterLevelRecord } from "@/lib/local-db";
import { useT } from "@/lib/i18n";
import { kindBadgeUrl } from "@/lib/images";
import { MonsterAvatar, type AvatarTone } from "@/components/MonsterAvatar";
import { ElementBadge } from "@/components/ElementBadge";
import { BlockerIcon, CheckIcon, MapPinIcon } from "@/components/icons";
import { levelOf, type RowView } from "./rowStats";
import { MonsterDetailDialog } from "./MonsterDetailDialog";
import { RowEditDialog } from "./RowEditDialog";
import { RowMeter } from "./RowMeter";

const mvpBadge = kindBadgeUrl("mvp");
const miniBadge = kindBadgeUrl("mini");

interface RowCardProps {
  view: RowView;
  levels: ReadonlyMap<string, MonsterLevelRecord>;
}

/**
 * Ledger layout: identity+level | monsters | best trip — columns align across
 * rows. The card itself opens the row editor; monster tiles open their sheet.
 */
export function RowCard({ view, levels }: RowCardProps) {
  const t = useT();
  const {
    row,
    hasRowLevel,
    rowLevel,
    blockerIds,
    blockerCount,
    maxSameMapBlockers,
    bestMapId,
    hasMvp,
    hasMini,
    completed,
    demoted,
    allMapsExcluded,
  } = view;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  // when every monster sits at the minimum, "blocker" carries no information —
  // ring monsters only when the blockers are a strict subset of the row
  const markBlockers = !completed && blockerCount < row.monsterIds.length;

  // Celebrate the app's key moment: the row level rising when a blocker clears.
  const prevLevel = useRef(rowLevel);
  const [pop, setPop] = useState(false);
  useEffect(() => {
    const rose = rowLevel > prevLevel.current;
    prevLevel.current = rowLevel;
    if (!rose) return;
    setPop(true);
    const id = setTimeout(() => setPop(false), 320);
    return () => clearTimeout(id);
  }, [rowLevel]);

  // …and the bigger one: the whole row reaching Lv 10 — one gold bloom
  const prevCompleted = useRef(completed);
  const [bloom, setBloom] = useState(false);
  useEffect(() => {
    const justCompleted = completed && !prevCompleted.current;
    prevCompleted.current = completed;
    if (!justCompleted) return;
    setBloom(true);
    const id = setTimeout(() => setBloom(false), 700);
    return () => clearTimeout(id);
  }, [completed]);

  const selected = selectedId ? getMonster(selectedId) : null;
  const clearedIds = bestMapId
    ? blockerIds.filter((id) => getMonster(id).mapIds.includes(bestMapId))
    : [];

  return (
    <section
      onClick={() => setEditing(true)}
      className={`group/card grid cursor-pointer rounded-xl border transition-colors sm:grid-cols-[164px_1fr_190px] ${
        completed
          ? "border-gold/45 bg-gold/5"
          : "border-line bg-surface hover:border-accent/40"
      } ${demoted ? "opacity-60" : ""} ${bloom ? "animate-row-complete" : ""}`}
    >
      {/* ── identity + level ── */}
      <div className="relative flex flex-col gap-1.5 border-b border-line p-4 sm:border-r sm:border-b-0">
        {/* the real (keyboard-reachable) way into the editor the card click mirrors */}
        <button
          type="button"
          aria-haspopup="dialog"
          aria-label={t("mr.editRow")}
          onClick={(e) => {
            e.stopPropagation();
            setEditing(true);
          }}
          className="press absolute top-3 right-2.5 rounded-md p-1 text-sub opacity-60 group-hover/card:opacity-100 hover:bg-surface-2 hover:text-accent"
        >
          <SquarePen className="size-3.5" />
        </button>
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1 pr-7">
          <ElementBadge element={row.elementId} className="font-semibold" />
          <span className="text-sm whitespace-nowrap text-sub">
            {t("mr.row")} {row.index}
          </span>
        </span>
        <span className="flex flex-wrap gap-x-2 gap-y-1 text-[11px] text-sub">
          {!completed && blockerCount > 0 && (
            <span>
              {t("mr.blockerCount").replace("{n}", String(blockerCount))}
            </span>
          )}
          {demoted && <span>{t("mr.demotedFlag")}</span>}
          {!hasRowLevel && <span>{t("mr.noRowLevel")}</span>}
        </span>
        <span
          title={t("mr.rowLevel")}
          className={`mt-auto pt-1 font-mono text-3xl leading-none font-extrabold tabular-nums ${
            hasRowLevel ? "text-gold" : "text-sub"
          } ${pop ? "animate-lv-pop" : ""}`}
        >
          {hasRowLevel ? rowLevel : "–"}
          <span className="text-sm font-medium text-sub">/{MAX_MR_LEVEL}</span>
        </span>
        <RowMeter rowLevel={rowLevel} hasRowLevel={hasRowLevel} />
      </div>

      {/* ── monsters ── */}
      <ul className="flex flex-wrap content-center items-start gap-x-3.5 gap-y-3 p-4">
        {row.monsterIds.map((id) => {
          const monster = getMonster(id);
          const level = levelOf(id, levels);
          const isBlocker = markBlockers && blockerIds.includes(id);
          const maxed = level >= MAX_MR_LEVEL;
          const isSelected = selectedId === id;
          // one ring at a time: the selection ring replaces the blocker ring
          // (the blocker stays signaled via badge, icon, and tooltip)
          const tone: AvatarTone =
            isBlocker && !isSelected ? "danger" : "default";
          return (
            <li key={id} className="flex w-16 flex-col items-center">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedId(id);
                }}
                aria-haspopup="dialog"
                aria-label={`${monster.name} — ${t("mr.lvShort")} ${level}${
                  isBlocker ? ` — ${t("mr.blockerFlag")}` : ""
                }`}
                className={`group press relative block rounded-lg hover:-translate-y-0.5 ${
                  isSelected ? "outline-2 outline-offset-2 outline-accent" : ""
                }`}
              >
                <MonsterAvatar
                  monster={monster}
                  level={level}
                  size="lg"
                  tone={tone}
                />
                <span
                  aria-hidden
                  className={`absolute -right-1.5 -bottom-1.5 flex h-5 min-w-5 items-center justify-center rounded-md border-2 border-surface px-0.5 font-mono text-[10px] font-bold tabular-nums ${
                    isBlocker
                      ? "bg-danger text-white"
                      : maxed
                        ? "bg-gold text-gold-ink"
                        : "bg-surface-2 text-ink"
                  }`}
                >
                  {level}
                </span>
                {/* top-left is the in-game kind badge's spot — blocker marker sits top-right */}
                {isBlocker && (
                  <BlockerIcon
                    size={12}
                    className="absolute -top-1.5 -right-1.5 rounded-full bg-surface p-px text-danger"
                  />
                )}
                <span className="tile-tip" aria-hidden>
                  {monster.name} · {t("mr.lvShort")} {level}
                  {isBlocker && (
                    <span className="text-danger"> — {t("mr.blockerFlag")}</span>
                  )}
                </span>
              </button>
              <span
                className={`mt-1.5 w-full truncate text-center text-[10px] ${
                  maxed ? "text-sub/70" : "text-sub"
                }`}
              >
                {monster.name}
              </span>
            </li>
          );
        })}
      </ul>

      {/* ── best trip ── */}
      <div className="flex flex-col gap-1 border-t border-line p-4 text-sm sm:border-t-0 sm:border-l">
        {completed ? (
          // mission stamp — nothing left to plan here, so mark it cleared
          <span className="flex flex-1 items-center justify-center">
            <span className="inline-flex -rotate-6 items-center gap-2 rounded-md border-2 border-gold/60 px-3.5 py-1.5 font-mono text-sm font-extrabold tracking-[0.18em] text-gold/90 uppercase">
              <CheckIcon size={14} />
              {t("mr.completedFlag")}
            </span>
          </span>
        ) : allMapsExcluded ? (
          <span className="inline-flex items-start gap-1.5 text-xs text-sub">
            <MapPinIcon size={13} className="mt-0.5 shrink-0" />
            {t("mr.allMapsExcludedFlag")}
          </span>
        ) : bestMapId && maxSameMapBlockers > 0 ? (
          <>
            <span className="font-mono text-[9.5px] font-bold tracking-[0.13em] text-sub uppercase">
              {t("mr.bestTrip")}
            </span>
            <span className="flex items-start gap-1.5 leading-tight font-bold">
              <MapPinIcon size={13} className="mt-0.5 shrink-0 text-accent" />
              {getMap(bestMapId).name}
            </span>
            <span className="text-xs text-sub">
              {maxSameMapBlockers === 1
                ? t("mr.trip.clearsOne")
                : t("mr.trip.clears").replace(
                    "{n}",
                    String(maxSameMapBlockers),
                  )}
            </span>
            {/* who this trip clears — avatars scan better than a name run-on */}
            {clearedIds.length > 0 && (
              <span className="flex flex-wrap gap-1.5 pt-1">
                {clearedIds.map((id) => (
                  <span
                    key={id}
                    title={getMonster(id).name}
                    className="inline-flex"
                  >
                    <MonsterAvatar
                      monster={getMonster(id)}
                      level={levelOf(id, levels)}
                      size="sm"
                    />
                  </span>
                ))}
              </span>
            )}
            {(hasMvp || hasMini) && (
              <span className="mt-auto flex flex-wrap gap-1.5 pt-1">
                {/* the in-game kind badges — alt/title carry the label */}
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
            )}
          </>
        ) : null}
      </div>

      {/* React portals bubble events through the REACT tree — without this
          barrier every click inside a dialog re-triggers the card's onClick
          (the close button would close and instantly reopen the editor) */}
      <div className="contents" onClick={(e) => e.stopPropagation()}>
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
      </div>
    </section>
  );
}
