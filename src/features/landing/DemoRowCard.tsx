"use client";

import { useState } from "react";
import { MonsterAvatar } from "@/components/MonsterAvatar";
import { CheckIcon, MapPinIcon } from "@/components/icons";
import { getMap, getMonster, getRow } from "@/lib/game-data";
import { useT } from "@/lib/i18n";
import { MAX_MR_LEVEL } from "@/lib/local-db";
import { RowMeter } from "@/features/monster-research/RowMeter";

/**
 * The hero's playable proof: a real research row (Earth · Row 1) seeded with
 * sample levels, running the actual row rules — level = lowest monster,
 * blockers ringed, best trip = map covering the most blockers. Rendered in
 * the tracker's real ledger layout so the demo IS the product. State is
 * local only; it never touches the visitor's stored progress.
 */
const DEMO_ROW_ID = "earth-1";
const SEED_LEVELS: Record<string, number> = {
  pupa: 4,
  fabre: 4,
  willow: 5,
  "savage-babe": 6,
  "worm-tail": 7,
};

export function DemoRowCard() {
  const t = useT();
  const row = getRow(DEMO_ROW_ID);
  const [levels, setLevels] = useState<Record<string, number>>(() =>
    Object.fromEntries(
      row.monsterIds.map((id, i) => [id, SEED_LEVELS[id] ?? 4 + i]),
    ),
  );
  // increments only when the ROW level rises — the pop must teach the real rule
  const [popCount, setPopCount] = useState(0);

  const monsters = row.monsterIds.map(getMonster);
  const rowLevel = Math.min(...row.monsterIds.map((id) => levels[id]));
  const complete = rowLevel >= MAX_MR_LEVEL;
  const blockerIds = complete
    ? new Set<string>()
    : new Set(row.monsterIds.filter((id) => levels[id] === rowLevel));
  const markBlockers = blockerIds.size < row.monsterIds.length;

  let bestTrip: { mapName: string; clears: number; names: string[] } | null =
    null;
  if (!complete) {
    const counts = new Map<string, number>();
    for (const m of monsters) {
      if (!blockerIds.has(m.id)) continue;
      for (const mapId of m.mapIds) {
        counts.set(mapId, (counts.get(mapId) ?? 0) + 1);
      }
    }
    const best = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
    if (best) {
      bestTrip = {
        mapName: getMap(best[0]).name,
        clears: best[1],
        names: monsters
          .filter((m) => blockerIds.has(m.id) && m.mapIds.includes(best[0]))
          .map((m) => m.name),
      };
    }
  }

  function levelUp(id: string) {
    if (levels[id] >= MAX_MR_LEVEL) return;
    const next = { ...levels, [id]: levels[id] + 1 };
    const nextRowLevel = Math.min(...row.monsterIds.map((m) => next[m]));
    if (nextRowLevel > rowLevel) setPopCount((c) => c + 1);
    setLevels(next);
  }

  return (
    <div>
      <span className="mb-2.5 inline-block rounded-md border border-dashed border-gold px-2 py-0.5 text-xs font-medium tracking-wide text-gold">
        {t("landing.demo.tag")}
      </span>
      <div
        className={`rounded-xl border ${
          complete ? "border-gold/45 bg-gold/5" : "border-line bg-surface"
        }`}
      >
        {/* identity strip + big level — the tracker's ledger language, stacked
            for the hero's narrow column */}
        <div className="flex items-center gap-2.5 p-4 pb-2.5">
          <span className="flex items-center gap-2 text-sm font-bold">
            <span
              aria-hidden
              className="inline-block h-2 w-2 rounded-full bg-el-earth"
            />
            Earth
          </span>
          <span className="text-xs text-sub">
            {t("mr.row")} {row.index}
          </span>
          <span
            key={popCount}
            className={`ml-auto font-mono text-2xl leading-none font-extrabold tabular-nums text-gold ${
              popCount > 0 ? "animate-lv-pop" : ""
            }`}
          >
            {rowLevel}
            <span className="text-sm font-medium text-sub">
              /{MAX_MR_LEVEL}
            </span>
          </span>
        </div>
        <div className="px-4">
          <RowMeter rowLevel={rowLevel} hasRowLevel />
        </div>

        {/* monsters — tap to level up */}
        <div className="flex flex-wrap gap-x-3.5 gap-y-2.5 p-4">
          {monsters.map((m) => {
            const lv = levels[m.id];
            const isBlocker = markBlockers && blockerIds.has(m.id);
            const maxed = lv >= MAX_MR_LEVEL;
            return (
              <span key={m.id} className="flex w-14 flex-col items-center">
                <button
                  type="button"
                  onClick={() => levelUp(m.id)}
                  aria-label={`${m.name} — ${t("mr.lvShort")} ${lv}${
                    isBlocker ? ` (${t("mr.blockerFlag")})` : ""
                  }`}
                  className="press group relative rounded-lg hover:-translate-y-0.5"
                >
                  <MonsterAvatar
                    monster={m}
                    level={lv}
                    size="md"
                    tone={isBlocker ? "danger" : "default"}
                  />
                  <span
                    className={`absolute -right-1.5 -bottom-1.5 z-2 min-w-4.5 rounded-md px-1 text-center font-mono text-[10px] font-bold tabular-nums ${
                      isBlocker
                        ? "bg-danger text-white"
                        : maxed
                          ? "bg-gold text-gold-ink"
                          : "bg-surface-2 text-ink"
                    }`}
                  >
                    {lv}
                  </span>
                  <span className="tile-tip" aria-hidden>
                    {m.name}
                  </span>
                </button>
                <span className="mt-1 w-full truncate text-center text-[10px] text-sub">
                  {m.name}
                </span>
              </span>
            );
          })}
        </div>

        {/* best trip strip — or the cleared stamp */}
        <div className="flex min-h-12 items-center gap-2 border-t border-line px-4 py-2.5 text-sm">
          {complete ? (
            <span className="flex flex-1 items-center justify-center gap-3">
              <span className="inline-flex -rotate-6 items-center gap-2 rounded-md border-2 border-gold/60 px-3 py-1 font-mono text-xs font-extrabold tracking-[0.18em] text-gold/90 uppercase">
                <CheckIcon size={12} />
                {t("mr.completedFlag")}
              </span>
              <span className="text-xs text-sub">
                {t("landing.demo.complete")}
              </span>
            </span>
          ) : (
            bestTrip && (
              <>
                <span className="font-mono text-[9.5px] font-bold tracking-[0.13em] text-sub uppercase">
                  {t("mr.bestTrip")}
                </span>
                <MapPinIcon size={13} className="shrink-0 text-accent" />
                <span className="min-w-0 truncate text-[13px] font-bold">
                  {bestTrip.mapName}
                </span>
                <span className="ml-auto shrink-0 text-xs text-sub">
                  {bestTrip.clears === 1
                    ? t("mr.trip.clearsOne")
                    : t("mr.trip.clears").replace(
                        "{n}",
                        String(bestTrip.clears),
                      )}
                </span>
              </>
            )
          )}
        </div>
      </div>
    </div>
  );
}
