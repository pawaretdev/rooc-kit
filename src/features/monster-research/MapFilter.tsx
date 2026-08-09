"use client";

import { useMemo, useState } from "react";
import {
  maps,
  mapsWithMini,
  mapsWithMvp,
  type GameMap,
} from "@/lib/game-data";
import { setSetting } from "@/lib/local-db";
import { kindBadgeUrl } from "@/lib/images";
import { useT } from "@/lib/i18n";
import { MapPinIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const BRACKET_SIZE = 20;

interface MapGroup {
  /** bracket start (1, 21, 41, …) or null for maps with unknown level */
  from: number | null;
  to: number;
  maps: GameMap[];
}

/** Maps bucketed into 20-level brackets, sorted by level then name inside each. */
const GROUPS: MapGroup[] = (() => {
  const byBracket = new Map<number, GameMap[]>();
  const unknown: GameMap[] = [];
  for (const map of maps.values()) {
    if (map.level === undefined) {
      unknown.push(map);
      continue;
    }
    const from = Math.floor((map.level - 1) / BRACKET_SIZE) * BRACKET_SIZE + 1;
    byBracket.set(from, [...(byBracket.get(from) ?? []), map]);
  }
  const groups: MapGroup[] = [...byBracket.entries()]
    .sort(([a], [b]) => a - b)
    .map(([from, list]) => ({
      from,
      to: from + BRACKET_SIZE - 1,
      maps: list.sort(
        (a, b) => a.level! - b.level! || a.name.localeCompare(b.name),
      ),
    }));
  if (unknown.length > 0) {
    groups.push({
      from: null,
      to: 0,
      maps: unknown.sort((a, b) => a.name.localeCompare(b.name)),
    });
  }
  return groups;
})();

interface MapFilterProps {
  excluded: ReadonlySet<string>;
}

/** "Avoided maps" filter dialog — checked maps are removed from best-trip planning. */
export function MapFilter({ excluded }: MapFilterProps) {
  const t = useT();
  const [query, setQuery] = useState("");

  const visibleGroups = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return GROUPS;
    return GROUPS.map((g) => ({
      ...g,
      maps: g.maps.filter((m) => m.name.toLowerCase().includes(q)),
    })).filter((g) => g.maps.length > 0);
  }, [query]);

  const write = (next: Set<string>) =>
    void setSetting("mr.excludedMaps", [...next]);

  const toggle = (mapId: string) => {
    const next = new Set(excluded);
    if (!next.delete(mapId)) next.add(mapId);
    write(next);
  };

  const setGroup = (group: MapGroup, exclude: boolean) => {
    const next = new Set(excluded);
    for (const m of group.maps) {
      if (exclude) next.add(m.id);
      else next.delete(m.id);
    }
    write(next);
  };

  const groupLabel = (g: MapGroup) =>
    g.from === null
      ? t("mr.filter.lvUnknown")
      : `${t("mr.lvShort")} ${g.from}–${g.to}`;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={
            excluded.size > 0 ? "border-accent/50 text-accent" : "text-sub"
          }
        >
          <MapPinIcon size={13} />
          {t("mr.filter.maps")}
          {excluded.size > 0 && (
            <span className="rounded-md bg-accent px-1.5 font-mono text-[11px] font-bold tabular-nums text-accent-ink">
              {excluded.size}
            </span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="gap-3 sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{t("mr.filter.maps")}</DialogTitle>
          <DialogDescription>{t("mr.filter.mapsHint")}</DialogDescription>
        </DialogHeader>

        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("common.search")}
          aria-label={t("common.search")}
        />

        <TooltipProvider delayDuration={300}>
          <ScrollArea className="h-[50dvh] rounded-md border border-line">
          {visibleGroups.length === 0 ? (
            <p className="p-4 text-sm text-sub">{t("mr.filter.mapsNoMatch")}</p>
          ) : (
            <div className="space-y-4 p-3">
              {visibleGroups.map((g) => {
                const excludedCount = g.maps.filter((m) =>
                  excluded.has(m.id),
                ).length;
                const groupState =
                  excludedCount === 0
                    ? false
                    : excludedCount === g.maps.length
                      ? true
                      : "indeterminate";
                const headerId = `map-group-${g.from ?? "unknown"}`;
                return (
                  <section key={headerId} aria-labelledby={headerId}>
                    <div className="mb-1.5 flex items-center gap-2 border-b border-line pb-1.5">
                      <Checkbox
                        id={`${headerId}-all`}
                        checked={groupState}
                        onCheckedChange={(v) => setGroup(g, v === true)}
                      />
                      <Label
                        id={headerId}
                        htmlFor={`${headerId}-all`}
                        className="font-mono text-xs font-bold tracking-wider text-sub uppercase"
                      >
                        {groupLabel(g)}
                      </Label>
                      {excludedCount > 0 && (
                        <span className="ml-auto font-mono text-[11px] tabular-nums text-accent">
                          {excludedCount}/{g.maps.length}
                        </span>
                      )}
                    </div>
                    <ul className="grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
                      {g.maps.map((m) => (
                        <li key={m.id}>
                          <Label
                            htmlFor={`avoid-${m.id}`}
                            className="flex max-w-full items-center gap-2 py-0.5 text-sm font-normal"
                          >
                            <Checkbox
                              id={`avoid-${m.id}`}
                              checked={excluded.has(m.id)}
                              onCheckedChange={() => toggle(m.id)}
                            />
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="truncate">{m.name}</span>
                              </TooltipTrigger>
                              <TooltipContent
                                side="top"
                                sideOffset={6}
                                className="pointer-events-none"
                              >
                                {m.name}
                              </TooltipContent>
                            </Tooltip>
                            {/* kind badges sit right-aligned, just before the level */}
                            <span className="ml-auto flex shrink-0 items-center gap-1.5">
                              {mapsWithMvp.has(m.id) && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={kindBadgeUrl("mvp")!}
                                  alt={t("mr.mapHasMvp")}
                                  title={t("mr.mapHasMvp")}
                                  draggable={false}
                                  className="h-4 w-4 shrink-0"
                                />
                              )}
                              {mapsWithMini.has(m.id) && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={kindBadgeUrl("mini")!}
                                  alt={t("mr.mapHasMini")}
                                  title={t("mr.mapHasMini")}
                                  draggable={false}
                                  className="h-4 w-4 shrink-0"
                                />
                              )}
                              {m.level !== undefined && (
                                <span className="font-mono text-[11px] tabular-nums text-sub">
                                  {t("mr.lvShort")} {m.level}
                                </span>
                              )}
                            </span>
                          </Label>
                        </li>
                      ))}
                    </ul>
                  </section>
                );
              })}
            </div>
          )}
          </ScrollArea>
        </TooltipProvider>

        <DialogFooter className="flex-row items-center">
          <span className="mr-auto text-xs text-sub">
            {t("mr.filter.mapsExcludedCount").replace(
              "{n}",
              String(excluded.size),
            )}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={excluded.size === 0}
            onClick={() => write(new Set())}
          >
            {t("common.clear")}
          </Button>
          <DialogClose asChild>
            <Button size="sm">{t("common.close")}</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
