"use client";

import { useSession } from "next-auth/react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  getMap,
  getMonster,
  monsters,
  worldMapCellSize,
  worldMapImageFile,
  type Monster,
} from "@/lib/game-data";
import {
  setMonsterLevel,
  MAX_MR_LEVEL,
  type MonsterLevelRecord,
} from "@/lib/local-db";
import { useT } from "@/lib/i18n";
import { monsterImageUrl, worldMapImageUrl } from "@/lib/images";
import { MonsterAvatar } from "@/components/MonsterAvatar";
import {
  CheckIcon,
  FitIcon,
  MapPinIcon,
  MinusIcon,
  PlusIcon,
  SearchIcon,
} from "@/components/icons";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { levelOf } from "../monster-research/rowStats";
import { LevelStepper } from "../monster-research/LevelStepper";
import {
  allPins,
  caveLabelWidth,
  caveArrow,
  cellsOf,
  floorLabel,
  mapProgress,
  type Callout,
  type MapPin,
} from "./mapGroups";
import { useMapCamera } from "./useMapCamera";
import { CAVE_LAYOUT_STORAGE_KEY, CAVE_ARROWS_STORAGE_KEY, caveLayoutKey, readCaveLayout, readCaveArrows, type CaveArrowPosition } from "./caveLayout";
import { CaveArrowHandle } from "./CaveArrowHandle";

/** CSS pixels of the map layer at scale 1 — the art is 1536². */
const MAP_SIZE = 1536;
const CELL_PX = worldMapCellSize * MAP_SIZE;
/**
 * Ceiling for the opening zoom: close enough to read the terrain when only a
 * map or two is in frame. `fitPoints` zooms out below this whenever the content
 * needs it to frame the map cells. Cave visibility never changes the camera.
 */
const OPEN_SCALE = 1.2;
/** Below this the cells are too small to hold a legible sprite and name. */
const CROWDED = 0.8;

/**
 * Base-level brackets, mirroring the in-game monster list. Grouping by level
 * beats grouping by element here: on the world map you are picking somewhere to
 * farm, and what matters is whether the monsters there can kill you.
 */
const BRACKETS = [
  { id: "1-20", min: 1, max: 20 },
  { id: "21-40", min: 21, max: 40 },
  { id: "41-60", min: 41, max: 60 },
  { id: "61-80", min: 61, max: 80 },
  { id: "81-100", min: 81, max: 100 },
  { id: "101+", min: 101, max: Infinity },
] as const;
type BracketId = (typeof BRACKETS)[number]["id"];

function bracketOf(monster: Monster): BracketId | null {
  const level = monster.baseLevel;
  if (level === undefined) return null;
  return BRACKETS.find((b) => level >= b.min && level <= b.max)?.id ?? null;
}

type KindFilter = "normal" | "boss";
type MobileTab = "list" | "map" | "roster";

interface WorldMapDialogProps {
  /** null keeps the dialog closed */
  monster: Monster | null;
  /** open straight onto this map instead of the monster's first one */
  focusMapId?: string | null;
  levels: ReadonlyMap<string, MonsterLevelRecord>;
  onClose: () => void;
}

export function WorldMapDialog({
  monster,
  focusMapId,
  levels,
  onClose,
}: WorldMapDialogProps) {
  return (
    <Dialog
      open={monster !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      {monster && (
        <DialogContent
          showCloseButton={false}
          className="flex h-[min(94svh,900px)] w-[min(96vw,1400px)] max-w-none flex-col gap-0 overflow-hidden p-0 sm:max-w-none"
        >
          <WorldMapBody
            initial={monster}
            focusMapId={focusMapId ?? null}
            levels={levels}
            onClose={onClose}
          />
        </DialogContent>
      )}
    </Dialog>
  );
}

/**
 * The World Map itself. Split out so every bit of state resets when the dialog
 * reopens, and so the standalone /world-map page can mount the same thing
 * without a dialog around it — `onClose` is omitted there and the close button
 * disappears with it.
 */
export function WorldMapBody({
  initial,
  focusMapId,
  levels,
  onClose,
}: {
  initial: Monster | null;
  focusMapId: string | null;
  levels: ReadonlyMap<string, MonsterLevelRecord>;
  onClose?: () => void;
}) {
  const t = useT();
  // null = nothing pinned: the map shows no monster at all
  const [selectedId, setSelectedId] = useState<string | null>(initial?.id ?? null);
  const [kind, setKind] = useState<KindFilter>(
    !initial || initial.kind === "normal" ? "normal" : "boss",
  );
  const [bracket, setBracket] = useState<BracketId | "All">("All");
  const [query, setQuery] = useState("");
  // which map's roster is open — seeded from the row the user clicked
  const [activeMapId, setActiveMapId] = useState<string | null>(
    focusMapId ?? initial?.mapIds[0] ?? null,
  );
  const [tab, setTab] = useState<MobileTab>("map");
  // mirrors the in-game world map's "Hide Cave" / "ตรวจสอบ Cave" button: it
  // reveals the names of the dungeons tucked inside cells, it does not hide
  // anything. Off by default, so the map starts uncluttered.
  const [showDungeons, setShowDungeons] = useState(false);

  const selected = selectedId ? getMonster(selectedId) : null;
  // every cell is clickable, so the map never feels like a dead backdrop
  const pins = useMemo(() => allPins(levels), [levels]);
  const spawnCells = useMemo(
    () => (selected ? cellsOf(selected.mapIds) : new Set<string>()),
    [selected],
  );

  const activePin =
    pins.find((pin) => pin.maps.some((m) => m.id === activeMapId)) ?? null;
  const activeMap =
    activePin?.maps.find((m) => m.id === activeMapId) ?? activePin?.maps[0];

  const { viewportRef, camera, centerOn, fitPoints, zoomBy } =
    useMapCamera(MAP_SIZE);

  // Frame the selection on open and whenever the monster changes. Two frames:
  // the first lands after layout, the second after a mobile tab swap resizes it.
  const spawnAnchors = useMemo(
    () => {
      const chosen = pins.filter((pin) => spawnCells.has(pin.id));
      const frame = chosen.length > 0 ? chosen : pins;
      return frame.map((pin) => pin.anchor);
    },
    [pins, spawnCells],
  );
  // Opening on a specific map centres it; otherwise frame every spawn cell.
  // Only the monster the dialog opened with honours focusMapId — once the user
  // picks someone else in the rail, framing their whole spread is what helps.
  const framing = useMemo(() => {
    const focus =
      selectedId === initial?.id && focusMapId
        ? getMap(focusMapId).anchor
        : undefined;
    return focus ? { focus } : { anchors: spawnAnchors };
  }, [selectedId, initial?.id, focusMapId, spawnAnchors]);

  useEffect(() => {
    const apply = () => {
      if (framing.focus) centerOn(framing.focus.x, framing.focus.y, OPEN_SCALE);
      // With no selection, frame the world on initial entry.
      else if (framing.anchors?.length) fitPoints(framing.anchors, 90, OPEN_SCALE);
    };
    // two frames: the first lands after layout, the second after a mobile tab
    // swap has resized the viewport
    let second = 0;
    const first = requestAnimationFrame(() => {
      apply();
      second = requestAnimationFrame(apply);
    });
    return () => {
      cancelAnimationFrame(first);
      cancelAnimationFrame(second);
    };
  }, [framing, tab, centerOn, fitPoints]);

  return (
    <>
      <header className="flex flex-none items-center gap-3 border-b border-line px-4 py-2.5">
        {onClose ? (
          <>
            <DialogTitle className="text-base font-bold">
              {t("wm.title")}
            </DialogTitle>
            <DialogDescription className="hidden truncate text-xs text-sub sm:block">
              {t("wm.subtitle")}
            </DialogDescription>
          </>
        ) : (
          <>
            <h1 className="text-base font-bold">{t("wm.title")}</h1>
            <p className="hidden truncate text-xs text-sub sm:block">
              {t("wm.subtitle")}
            </p>
          </>
        )}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label={t("wm.close")}
            className="press ml-auto grid h-8 w-8 place-items-center rounded-md border border-line bg-surface-2 text-sub hover:border-accent hover:text-accent"
          >
            <span aria-hidden>✕</span>
          </button>
        )}
      </header>

      <div className="flex min-h-0 flex-1">
        <MonsterRail
          hidden={tab !== "list"}
          selectedId={selectedId}
          kind={kind}
          bracket={bracket}
          query={query}
          levels={levels}
          onKind={(next) => {
            setKind(next);
            setBracket("All");
          }}
          onBracket={setBracket}
          onQuery={setQuery}
          onPick={(id) => {
            // tapping the pinned monster again unpins it and clears the map
            if (id === selectedId) {
              setSelectedId(null);
              return;
            }
            setSelectedId(id);
            setActiveMapId(getMonster(id).mapIds[0] ?? null);
            setTab("map");
          }}
        />

        <MapStage
          hidden={tab !== "map"}
          viewportRef={viewportRef}
          camera={camera}
          pins={pins}
          spawnCells={spawnCells}
          activePinId={activePin?.id}
          monster={selected}
          showDungeons={showDungeons}
          onToggleDungeons={() => setShowDungeons((on) => !on)}
          onPick={(pin) => {
            // deliberately no camera move: yanking the view to the cell the
            // user just clicked loses the place they were reading
            setActiveMapId(pin.maps[0].id);
            setTab("roster");
          }}
          onZoom={zoomBy}
          onFit={() => fitPoints(spawnAnchors, 90, OPEN_SCALE)}
        />

        <RosterPanel
          hidden={tab !== "roster"}
          pin={activePin}
          activeMapId={activeMap?.id}
          selectedId={selectedId}
          levels={levels}
          onMap={setActiveMapId}
        />
      </div>

      <nav className="flex flex-none border-t border-line lg:hidden">
        {(["list", "map", "roster"] as const).map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={tab === value}
            onClick={() => setTab(value)}
            className={`flex-1 border-t-2 px-1 py-2.5 text-center text-[11.5px] whitespace-nowrap ${
              tab === value
                ? "border-accent bg-surface-2 font-semibold text-accent"
                : "border-transparent text-sub"
            }`}
          >
            {t(`wm.tab.${value}` as const)}
          </button>
        ))}
      </nav>
    </>
  );
}

/* ── left rail: pick the monster ─────────────────────────────── */

function MonsterRail({
  hidden,
  selectedId,
  kind,
  bracket,
  query,
  levels,
  onKind,
  onBracket,
  onQuery,
  onPick,
}: {
  hidden: boolean;
  selectedId: string | null;
  kind: KindFilter;
  bracket: BracketId | "All";
  query: string;
  levels: ReadonlyMap<string, MonsterLevelRecord>;
  onKind: (kind: KindFilter) => void;
  onBracket: (bracket: BracketId | "All") => void;
  onQuery: (query: string) => void;
  onPick: (id: string) => void;
}) {
  const t = useT();

  const inKind = useMemo(
    () =>
      [...monsters.values()].filter((m) =>
        kind === "boss" ? m.kind !== "normal" : m.kind === "normal",
      ),
    [kind],
  );

  const counts = useMemo(() => {
    const byBracket = new Map<BracketId | "All", number>([
      ["All", inKind.length],
    ]);
    for (const b of BRACKETS) byBracket.set(b.id, 0);
    for (const m of inKind) {
      const id = bracketOf(m);
      if (id) byBracket.set(id, (byBracket.get(id) ?? 0) + 1);
    }
    return byBracket;
  }, [inKind]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return inKind
      .filter((m) => bracket === "All" || bracketOf(m) === bracket)
      .filter((m) => !needle || m.name.toLowerCase().includes(needle))
      .sort(
        (a, b) =>
          (a.baseLevel ?? Number.MAX_SAFE_INTEGER) -
            (b.baseLevel ?? Number.MAX_SAFE_INTEGER) ||
          a.name.localeCompare(b.name),
      );
  }, [inKind, bracket, query]);

  return (
    <div
      className={`${
        hidden ? "hidden" : "flex"
      } w-full min-w-0 flex-col border-line lg:flex lg:w-[300px] lg:flex-none lg:border-r`}
    >
      <div className="flex-none border-b border-line p-3">
        <label className="flex items-center gap-2 rounded-lg border border-line bg-surface-2 px-2.5 py-1.5">
          <SearchIcon size={14} className="shrink-0 text-sub" />
          <input
            value={query}
            onChange={(event) => onQuery(event.target.value)}
            placeholder={t("wm.search")}
            aria-label={t("wm.search")}
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-sub"
          />
        </label>
        <div className="mt-2 flex gap-1.5">
          {(["normal", "boss"] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={kind === value}
              onClick={() => onKind(value)}
              className={`press flex-1 rounded-lg border px-2 py-1.5 text-xs ${
                kind === value
                  ? "border-accent bg-accent font-semibold text-accent-ink"
                  : "border-line bg-surface-2 text-sub hover:border-accent hover:text-accent"
              }`}
            >
              {t(`wm.kind.${value}` as const)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        <div className="w-[76px] flex-none overflow-y-auto border-r border-line py-1.5">
          {(["All", ...BRACKETS.map((b) => b.id)] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={bracket === value}
              onClick={() => onBracket(value)}
              className={`block w-full border-l-2 px-2 py-2 text-left leading-tight ${
                bracket === value
                  ? "border-accent bg-surface-2"
                  : "border-transparent hover:bg-surface-2"
              }`}
            >
              <span className="block text-[9px] tracking-wide text-sub uppercase">
                {value === "All" ? "" : t("wm.baseLv")}
              </span>
              <span
                className={`block font-mono text-[12.5px] font-bold tabular-nums ${
                  bracket === value ? "text-accent" : ""
                }`}
              >
                {value === "All" ? t("wm.all") : value}
              </span>
              <span className="font-mono text-[10px] text-sub tabular-nums">
                {counts.get(value) ?? 0}
              </span>
            </button>
          ))}
        </div>

        {visible.length === 0 ? (
          <p className="flex-1 p-5 text-center text-sm text-sub">
            {t("wm.noMatch")}
          </p>
        ) : (
          <div className="grid min-w-0 flex-1 auto-rows-max grid-cols-[repeat(auto-fill,minmax(54px,1fr))] gap-1.5 overflow-y-auto p-2">
            {visible.map((m) => (
              <MonsterCard
                key={m.id}
                monster={m}
                level={levelOf(m.id, levels)}
                selected={m.id === selectedId}
                onPick={() => onPick(m.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * A pickable monster. Selection reads three ways at once — the frame tilts, a
 * pin badge appears, and the card fills with accent — so it survives both
 * themes and colour-blind vision.
 */
function MonsterCard({
  monster,
  level,
  selected,
  onPick,
}: {
  monster: Monster;
  level: number;
  selected: boolean;
  onPick: () => void;
}) {
  const t = useT();
  return (
    <button
      type="button"
      onClick={onPick}
      aria-pressed={selected}
      aria-label={`${monster.name} — ${t("mr.lvShort")} ${level}`}
      title={`${monster.name} — ${t("mr.lvShort")} ${level}`}
      className={`press relative flex min-w-0 flex-col items-center gap-0.5 rounded-lg border p-1 ${
        selected
          ? "border-accent bg-accent/15"
          : "border-line bg-surface-2 hover:border-accent/60"
      }`}
    >
      <MonsterAvatar monster={monster} level={level} size="md" />
      <span
        className={`w-full truncate text-center text-[9.5px] leading-tight ${
          selected ? "font-bold text-accent" : "text-sub"
        }`}
      >
        {monster.name}
      </span>
      {selected && (
        <span className="absolute -top-1.5 -right-1.5 grid h-4 w-4 place-items-center rounded-md border border-surface bg-accent text-accent-ink">
          <MapPinIcon size={10} />
        </span>
      )}
    </button>
  );
}

/* ── centre: the world map ───────────────────────────────────── */

function MapStage({
  hidden,
  viewportRef,
  camera,
  pins,
  spawnCells,
  activePinId,
  monster,
  showDungeons,
  onToggleDungeons,
  onPick,
  onZoom,
  onFit,
}: {
  hidden: boolean;
  viewportRef: React.RefObject<HTMLDivElement | null>;
  camera: { x: number; y: number; scale: number };
  pins: MapPin[];
  spawnCells: ReadonlySet<string>;
  activePinId?: string;
  /** null when nothing is pinned — the map then shows no monster at all */
  monster: Monster | null;
  showDungeons: boolean;
  onToggleDungeons: () => void;
  onPick: (pin: MapPin) => void;
  onZoom: (factor: number) => void;
  onFit: () => void;
}) {
  const t = useT();
  const [artMissing, setArtMissing] = useState(false);
  const { data: session } = useSession();
  const canArrange = session?.user?.isSuperAdmin === true;
  const [arranging, setEditing] = useState(false);
  const editing = canArrange && arranging;
  const [offsets, setOffsets] = useState(readCaveLayout);
  const offsetsRef = useRef(offsets);
  const [layoutStatus, setLayoutStatus] = useState("");
  const [arrows, setArrows] = useState(readCaveArrows);
  const arrowsRef = useRef(arrows);
  const [activeArrow, setActiveArrow] = useState<string | null>(null);
  const moveArrow = (key: string, arrow: CaveArrowPosition, commit: boolean) => {
    if (!canArrange) return;
    const next = { ...arrowsRef.current, [key]: arrow };
    arrowsRef.current = next;
    setArrows(next);
    if (commit) {
      try {
        localStorage.setItem(CAVE_ARROWS_STORAGE_KEY, JSON.stringify(next));
        setLayoutStatus(t("wm.layoutSaved"));
      } catch { setLayoutStatus(t("wm.layoutSaveFailed")); }
    }
  };
  const moveLabel = (pinId: string, name: string, dx: number, dy: number, commit: boolean) => {
    if (!canArrange) return;
    const next = { ...offsetsRef.current, [caveLayoutKey(pinId, name)]: { dx, dy } };
    offsetsRef.current = next;
    setOffsets(next);
    if (commit) {
      try {
        localStorage.setItem(CAVE_LAYOUT_STORAGE_KEY, JSON.stringify(next));
        setLayoutStatus(t("wm.layoutSaved"));
      } catch {
        setLayoutStatus(t("wm.layoutSaveFailed"));
      }
    }
  };
  const layoutJson = () => JSON.stringify({
    version: 2,
    coordinateSystem: "cell-relative",
    labels: pins.flatMap((pin) => pin.callouts.map((callout) => {
      const key = caveLayoutKey(pin.id, callout.name);
      const position = offsetsRef.current[key] ?? callout;
      const automatic = caveArrow({ ...callout, ...position });
      return {
        pinId: pin.id, name: callout.name, dx: position.dx, dy: position.dy,
        arrow: arrowsRef.current[key] ?? callout.arrow ?? {
          startX: automatic.startX + position.dx, startY: automatic.startY + position.dy,
          endX: automatic.endX + position.dx, endY: automatic.endY + position.dy,
        },
      };
    })),
  }, null, 2);
  const copyLayout = async () => {
    if (!canArrange) return;
    try {
      await navigator.clipboard.writeText(layoutJson());
      setLayoutStatus(t("wm.layoutCopied"));
    } catch {
      setLayoutStatus(t("wm.layoutCopyFailed"));
    }
  };
  const downloadLayout = () => {
    if (!canArrange) return;
    const url = URL.createObjectURL(new Blob([layoutJson()], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "world-map-cave-layout.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };


  return (
    <div
      className={`${
        hidden ? "hidden" : "block"
      } relative min-w-0 flex-1 overflow-hidden bg-bg lg:block`}
    >
      <div
        ref={viewportRef}
        className="absolute inset-0 touch-none cursor-grab data-[dragging]:cursor-grabbing"
      >
        <div
          className="absolute top-0 left-0 origin-top-left will-change-transform"
          style={{
            transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.scale})`,
          }}
        >
          {artMissing ? (
            <div
              style={{ width: MAP_SIZE, height: MAP_SIZE }}
              className="grid place-items-center bg-surface-2 text-sub"
            >
              {t("wm.mapMissing")}
            </div>
          ) : (
            // Plain <img>: a pre-sized JPEG from /public, panned by transform —
            // next/image would only add a wrapper we then have to fight.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={worldMapImageUrl(worldMapImageFile)}
              alt=""
              draggable={false}
              onError={() => setArtMissing(true)}
              style={{ width: MAP_SIZE, height: MAP_SIZE }}
              className="block max-w-none select-none"
            />
          )}

          {/* Darkens the whole map so the cells the monster lives in — which
              render above this layer — read as lit. Cheaper and steadier than
              brightening each cell against terrain of every colour. */}
          {monster && (
            <span
              aria-hidden
              style={{ width: MAP_SIZE, height: MAP_SIZE }}
              className="pointer-events-none absolute top-0 left-0 bg-black/45"
            />
          )}

          {pins.map((pin) => (
            <MapCell
              key={pin.id}
              pin={pin}
              monster={monster}
              spawns={spawnCells.has(pin.id)}
              active={pin.id === activePinId}
              scale={camera.scale}
              onPick={() => onPick(pin)}
            />
          ))}

          {/* Cave callouts ride above every cell so a label can never be
              painted over by the next cell's border or name. */}
          {showDungeons &&
            pins.flatMap((pin) => pin.callouts.map((callout) => (
              <CaveCallout
                key={`cave-${pin.id}-${callout.name}`}
                pin={pin}
                complete={
                  pin.areas.find((area) => area.name === callout.name)?.complete ?? false
                }
                callout={{ ...callout, ...(canArrange ? offsets[caveLayoutKey(pin.id, callout.name)] : {}) }}
                scale={camera.scale}
                editing={editing}
                arrowOverride={canArrange ? arrows[caveLayoutKey(pin.id, callout.name)] : undefined}
                arrowSelected={activeArrow === caveLayoutKey(pin.id, callout.name)}
                onSelectArrow={() => setActiveArrow(caveLayoutKey(pin.id, callout.name))}
                onArrowMove={(arrow, commit) => moveArrow(caveLayoutKey(pin.id, callout.name), arrow, commit)}
                onMove={(dx, dy, commit) => moveLabel(pin.id, callout.name, dx, dy, commit)}
              />
            )))}
        </div>
      </div>

      <div className="pointer-events-none absolute top-3 left-3 flex gap-1.5">
        <span className="rounded-md border border-line bg-surface/90 px-2 py-1 font-mono text-[11px] tabular-nums">
          {Math.round(camera.scale * 100)}%
        </span>
        {monster && (
          <span className="rounded-md border border-line bg-surface/90 px-2 py-1 text-[11px]">
            {monster.mapIds.length === 1
              ? t("wm.mapCountOne")
              : t("wm.mapCount").replace("{n}", String(monster.mapIds.length))}
          </span>
        )}
      </div>

      <div className="absolute top-3 right-3 flex max-w-[70%] flex-wrap justify-end gap-1.5">
        <button
          type="button"
          aria-pressed={!showDungeons}
          onClick={onToggleDungeons}
          className={`press rounded-md border px-2.5 py-1 text-[11.5px] font-medium ${
            showDungeons
              ? "border-line bg-surface/90 text-sub hover:border-accent hover:text-accent"
              : "border-accent bg-accent text-accent-ink"
          }`}
        >
          {showDungeons ? t("wm.hideDungeons") : t("wm.showDungeons")}
        </button>
        {showDungeons && canArrange && (
          <button type="button" aria-pressed={editing} onClick={() => setEditing((value) => !value)}
            className="rounded-md border border-accent bg-surface px-2.5 py-1 text-[11.5px] font-medium text-accent">
            {editing ? t("wm.finishLayout") : t("wm.arrangeLabels")}
          </button>
        )}
        {showDungeons && canArrange && (editing || Object.keys(offsets).length > 0 || Object.keys(arrows).length > 0) && (
          <>
            <button type="button" onClick={() => void copyLayout()} className="rounded-md border border-line bg-surface px-2.5 py-1 text-[11.5px] text-ink">{t("wm.copyLayout")}</button>
            <button type="button" onClick={downloadLayout} className="rounded-md border border-line bg-surface px-2.5 py-1 text-[11.5px] text-ink">{t("wm.downloadLayout")}</button>
          </>
        )}
      </div>

      {showDungeons && canArrange && (editing || layoutStatus) && (
        <div className="pointer-events-none absolute bottom-3 left-3 max-w-[calc(100%-4.5rem)] rounded-md border border-line bg-surface px-3 py-2 text-xs text-sub">
          {editing && <p>{t("wm.layoutHint")}</p>}
          <p role="status" aria-live="polite">{layoutStatus}</p>
        </div>
      )}

      <div className="absolute right-3 bottom-3 flex flex-col gap-1.5">
        {[
          { key: "in", label: t("wm.zoomIn"), icon: <PlusIcon size={14} />, run: () => onZoom(1.25) },
          { key: "out", label: t("wm.zoomOut"), icon: <MinusIcon size={14} />, run: () => onZoom(1 / 1.25) },
          { key: "fit", label: t("wm.fit"), icon: <FitIcon size={13} />, run: onFit },
        ].map((button) => (
          <button
            key={button.key}
            type="button"
            aria-label={button.label}
            title={button.label}
            onClick={button.run}
            className="press grid h-8 w-8 place-items-center rounded-md border border-line bg-surface/90 text-sub hover:border-accent hover:text-accent"
          >
            {button.icon}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * One square on the world map. Every cell is clickable, so the map can be
 * browsed on its own; the selected monster's cells are the ones that light up.
 *
 * A spawn cell shows exactly one frame — the monster's own tile, tilted, with a
 * pin at its corner — matching the in-game world map. Stacking a highlight box
 * behind the tile as well read as a double border.
 */
function MapCell({
  pin,
  monster,
  spawns,
  active,
  scale,
  onPick,
}: {
  pin: MapPin;
  /** null when nothing is pinned — no sprite is drawn in any cell */
  monster: Monster | null;
  spawns: boolean;
  active: boolean;
  scale: number;
  onPick: () => void;
}) {
  // Sprite and name are sized as a share of the cell, so they grow and shrink
  // with the square they belong to — the cell is the frame, and its contents
  // stay inside it at every zoom. Below `CROWDED` the squares are smaller than
  // legible text, so the contents drop out and the coloured box carries it.
  const t = useT();
  const tooSmall = scale < CROWDED;
  // The box is sized in map units, so a CSS border is multiplied by the camera
  // too: 2px reads as a 9px slab at 460% and the dashes stretch with it.
  // Dividing by the scale keeps every outline the same weight on screen.
  const hairline = `${2 / scale}px`;
  const done = pin.progress.complete;
  // The check is the one mark that must survive zooming all the way out, since
  // that is when the map is scanned for where to go next — so unlike the name
  // it never drops out; it just claims more of the cell once squares get small.
  const badge = Math.min(CELL_PX * 0.5, Math.max(CELL_PX * 0.26, 14 / scale));

  return (
    <button
      type="button"
      data-map-pin
      onClick={onPick}
      aria-pressed={active}
      aria-label={`${pin.label} — ${pin.progress.maxed}/${pin.progress.total}${
        done ? ` — ${t("wm.complete")}` : ""
      }`}
      style={{
        left: pin.anchor.x * MAP_SIZE,
        top: pin.anchor.y * MAP_SIZE,
        width: CELL_PX,
        height: CELL_PX,
        borderWidth: hairline,
        // set here, not as a utility class: `border-dashed` and `border-solid`
        // have equal specificity, so whichever Tailwind emits last silently wins
        borderStyle: spawns && !active ? "dashed" : "solid",
      }}
      className={`absolute grid -translate-x-1/2 -translate-y-1/2 cursor-pointer place-items-center rounded-sm transition-colors ${
        active
          ? // the cell whose roster is open — solid accent, the one "here" mark
            "border-accent bg-accent/25"
          : spawns
            ? // A spawn of the selected monster. Dashed so it never reads as the
              // current selection; cyan because the map art is all yellow-olive
              // and a gold dash vanished straight into the terrain.
              "border-[var(--pin-line)]"
            : "border-white/15 hover:border-[var(--pin-line)] hover:bg-white/15"
      }`}
    >
      {/* Nothing left to farm here: a scrim lets the square recede, the same
          "nothing left to do" vocabulary as the Shop Planner's sold-out cards.
          A spawn of the pinned monster stays lit — that is why it was picked. */}
      {done && !spawns && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-black/45"
        />
      )}

      {/* lifts this cell out of the dimming layer below, so the places the
          monster actually lives look lit while the rest of the map recedes */}
      {spawns && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-white/25 mix-blend-overlay"
        />
      )}

      {spawns && monster && !tooSmall && (
        /* just the sprite: no research frame, no tilt — the tilt belongs to the
           picker on the left, where it marks the chosen monster */
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={monsterImageUrl(monster)}
          alt=""
          draggable={false}
          style={{ width: "58%", height: "58%", marginBottom: "16%" }}
          className="pointer-events-none object-contain object-bottom drop-shadow-[0_2px_3px_rgba(0,0,0,0.7)]"
        />
      )}

      {/* Name sits in the cell's own footer and is always visible, faint until
          the cell matters. It counter-scales like the icon, so the box it has
          to fit inside is the cell at 1:1 — hence the fixed width and the wrap
          rather than nowrap, which would spill over the neighbouring cells. */}
      {!tooSmall && (
        <span
          aria-hidden
          style={{ width: CELL_PX, fontSize: CELL_PX * 0.135 }}
          className={`pointer-events-none absolute bottom-0 px-0.5 pb-px text-center leading-[1.1] font-semibold ${
            active || spawns ? "text-white" : "text-white/55"
          }`}
        >
          {/* Plain text over painted terrain: a shadow, not a plate, keeps it
              legible without covering the map. */}
          <span className="[text-shadow:0_1px_2px_rgba(0,0,0,0.95),0_0_3px_rgba(0,0,0,0.85)]">
            {pin.label}
          </span>
        </span>
      )}

      {/* gold check = maxed, as everywhere else in the app; the dark rim keeps
          it off the yellow-olive terrain, which swallows plain gold */}
      {done && (
        <span
          aria-hidden
          style={{
            width: badge,
            height: badge,
            top: CELL_PX * 0.05,
            right: CELL_PX * 0.05,
            borderWidth: `${1.5 / scale}px`,
          }}
          className="pointer-events-none absolute grid place-items-center rounded-full border-black/70 bg-gold text-gold-ink shadow-[0_1px_3px_rgba(0,0,0,0.6)]"
        >
          <CheckIcon size={badge * 0.62} strokeWidth={2.5} />
        </span>
      )}
    </button>
  );
}

/**
 * Each dungeon has its own short arrow, measured edge-to-edge in map space.
 */
function CaveCallout({
  pin,
  complete,
  callout,
  scale,
  editing,
  arrowOverride,
  arrowSelected,
  onSelectArrow,
  onArrowMove,
  onMove,
}: {
  pin: MapPin;
  /** every floor of this dungeon is maxed */
  complete: boolean;
  callout: Callout;
  scale: number;
  editing: boolean;
  arrowOverride?: CaveArrowPosition;
  arrowSelected: boolean;
  onSelectArrow: () => void;
  onArrowMove: (arrow: CaveArrowPosition, commit: boolean) => void;
  onMove: (dx: number, dy: number, commit: boolean) => void;
}) {
  const drag = useRef<{ id: number; x: number; y: number; dx: number; dy: number } | null>(null);
  const positionAt = (clientX: number, clientY: number) => {
    const origin = drag.current!;
    return {
      dx: Math.max(-pin.anchor.x / worldMapCellSize, Math.min((1 - pin.anchor.x) / worldMapCellSize, origin.dx + (clientX - origin.x) / (scale * CELL_PX))),
      dy: Math.max(-pin.anchor.y / worldMapCellSize, Math.min((1 - pin.anchor.y) / worldMapCellSize, origin.dy + (clientY - origin.y) / (scale * CELL_PX))),
    };
  };
  const cellX = pin.anchor.x * MAP_SIZE;
  const cellY = pin.anchor.y * MAP_SIZE;
  const labelX = cellX + callout.dx * CELL_PX;
  const labelY = cellY + callout.dy * CELL_PX;
  const t = useT();
  const automatic = caveArrow(callout);
  const absoluteArrow = arrowOverride ?? callout.arrow ?? {
    startX: automatic.startX + callout.dx, startY: automatic.startY + callout.dy,
    endX: automatic.endX + callout.dx, endY: automatic.endY + callout.dy,
  };
  const arrow = {
    startX: absoluteArrow.startX - callout.dx, startY: absoluteArrow.startY - callout.dy,
    endX: absoluteArrow.endX - callout.dx, endY: absoluteArrow.endY - callout.dy,
  };
  const dx = (arrow.endX - arrow.startX) * CELL_PX;
  const dy = (arrow.endY - arrow.startY) * CELL_PX;
  const distance = Math.hypot(dx, dy);
  const ux = dx / (distance || 1);
  const uy = dy / (distance || 1);
  const font = CELL_PX * 0.15;
  // Same clearance at both ends; the shortest edge-to-edge route avoids long
  // diagonal tails caused by aiming every label through the cell's centre.
  const clearance = Math.min(CELL_PX * 0.06, distance * 0.15);
  const start = clearance;
  const end = distance - clearance;
  const head = Math.min(CELL_PX * 0.145, (end - start) * 0.6);
  const thickness = Math.max(1 / scale, CELL_PX * 0.022);
  const point = (along: number, across = 0) =>
    `${arrow.startX * CELL_PX + ux * along - uy * across},${arrow.startY * CELL_PX + uy * along + ux * across}`;

  return (
    <span
      style={{ left: labelX, top: labelY }}
      className="pointer-events-none absolute z-10"
    >
      {end > start && (
        <svg
          width="1"
          height="1"
          overflow="visible"
          className="absolute top-0 left-0 text-gold"
        >
          <path
            d={`M ${point(start)}
              Q ${point(start, head * 0.06)} ${point(end - head, head * 0.24)}
              L ${point(end - head * 1.08, head * 0.62)}
              Q ${point(end - head * 1.12, head * 0.76)} ${point(end - head * 0.9, head * 0.62)}
              L ${point(end - head * 0.08, head * 0.1)}
              Q ${point(end + head * 0.06)} ${point(end - head * 0.08, -head * 0.1)}
              L ${point(end - head * 0.9, -head * 0.62)}
              Q ${point(end - head * 1.12, -head * 0.76)} ${point(end - head * 1.08, -head * 0.62)}
              L ${point(end - head, -head * 0.24)}
              Q ${point(start, -head * 0.06)} ${point(start)} Z`}
            fill="currentColor"
            stroke="var(--surface)"
            strokeWidth={thickness * 0.5}
            strokeLinejoin="round"
            paintOrder="stroke fill"
          />
        </svg>
      )}

      {editing && (["whole", "start", "end"] as const).filter((part) => part === "whole" || arrowSelected).map((part) => (
        <CaveArrowHandle
          key={part}
          part={part}
          label={`${callout.name}: ${t(part === "whole" ? "wm.moveArrow" : part === "start" ? "wm.arrowTail" : "wm.arrowTip")}`}
          arrow={absoluteArrow}
          x={part === "whole" ? (arrow.startX + arrow.endX) / 2 : part === "start" ? arrow.startX : arrow.endX}
          y={part === "whole" ? (arrow.startY + arrow.endY) / 2 : part === "start" ? arrow.startY : arrow.endY}
          scale={scale}
          cellSize={CELL_PX}
          onSelect={onSelectArrow}
          onChange={onArrowMove}
        />
      ))}

      <span
        data-cave-label
        role={editing ? "button" : undefined}
        tabIndex={editing ? 0 : undefined}
        aria-label={complete ? `${callout.name} — ${t("wm.complete")}` : callout.name}
        onPointerDown={(event) => {
          if (!editing || event.button !== 0) return;
          event.stopPropagation();
          event.preventDefault();
          event.currentTarget.focus({ preventScroll: true });
          onSelectArrow();
          drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, dx: callout.dx, dy: callout.dy };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (drag.current?.id !== event.pointerId) return;
          const next = positionAt(event.clientX, event.clientY);
          onMove(next.dx, next.dy, false);
        }}
        onPointerUp={(event) => {
          if (drag.current?.id !== event.pointerId) return;
          const next = positionAt(event.clientX, event.clientY);
          onMove(next.dx, next.dy, true);
          drag.current = null;
          event.currentTarget.releasePointerCapture(event.pointerId);
        }}
        onPointerCancel={() => {
          if (!drag.current) return;
          onMove(drag.current.dx, drag.current.dy, true);
          drag.current = null;
        }}
        onLostPointerCapture={() => {
          if (!drag.current) return;
          onMove(callout.dx, callout.dy, true);
          drag.current = null;
        }}
        onKeyDown={(event) => {
          if (!editing) return;
          const direction = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key];
          if (!direction) return;
          event.preventDefault();
          event.stopPropagation();
          const step = event.shiftKey ? 0.1 : 0.025;
          onMove(callout.dx + direction[0] * step, callout.dy + direction[1] * step, true);
        }}
        style={{ pointerEvents: editing ? "auto" : "none", cursor: editing ? "move" : undefined, touchAction: "none", userSelect: "none", fontSize: font, width: caveLabelWidth(callout.name) * CELL_PX, height: CELL_PX * 0.32, lineHeight: `${CELL_PX * 0.32 - 2}px`, textAlign: "center" }}
        className="absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 rounded border border-gold/50 bg-surface leading-[1.3] font-semibold whitespace-nowrap text-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        {callout.name}
        {/* hangs off the corner so the chip keeps the width its saved layout
            was arranged for */}
        {complete && (
          <span
            aria-hidden
            style={{
              width: CELL_PX * 0.2,
              height: CELL_PX * 0.2,
              top: -CELL_PX * 0.09,
              right: -CELL_PX * 0.09,
            }}
            className="absolute grid place-items-center rounded-full border border-black/70 bg-gold text-gold-ink"
          >
            <CheckIcon size={CELL_PX * 0.13} strokeWidth={2.5} />
          </span>
        )}
      </span>
    </span>
  );
}

/* ── right: who lives in the selected cell ───────────────────── */

function RosterPanel({
  hidden,
  pin,
  activeMapId,
  selectedId,
  levels,
  onMap,
}: {
  hidden: boolean;
  pin: MapPin | null;
  activeMapId: string | undefined;
  selectedId: string | null;
  levels: ReadonlyMap<string, MonsterLevelRecord>;
  onMap: (mapId: string) => void;
}) {
  const t = useT();
  const rosterRef = useRef<HTMLDivElement | null>(null);

  // switching map should start the list at the top, not mid-scroll
  useEffect(() => {
    rosterRef.current?.scrollTo({ top: 0 });
  }, [activeMapId]);

  if (!pin || !activeMapId) {
    return (
      <div
        className={`${
          hidden ? "hidden" : "grid"
        } w-full place-items-center border-line p-6 text-center text-sm text-sub lg:grid lg:w-[340px] lg:flex-none lg:border-l`}
      >
        {t("wm.pickMonster")}
      </div>
    );
  }

  const progress = mapProgress(activeMapId, levels);
  const activeMap = pin.maps.find((m) => m.id === activeMapId) ?? pin.maps[0];
  const activeArea = pin.areas.find((a) =>
    a.maps.some((m) => m.id === activeMap.id),
  );

  return (
    <div
      className={`${
        hidden ? "hidden" : "flex"
      } w-full min-w-0 flex-col border-line lg:flex lg:w-[340px] lg:flex-none lg:border-l`}
    >
      <div className="flex-none border-b border-line px-4 pt-3 pb-2.5">
        <div className="flex items-center gap-2">
          <h3 className="min-w-0 truncate text-[15px] font-bold">
            {activeMap.name}
          </h3>
          {progress.complete && (
            <span className="inline-flex flex-none items-center gap-1 rounded-md border border-gold/60 px-1.5 py-px text-[10.5px] font-semibold text-gold">
              <CheckIcon size={11} />
              {t("wm.complete")}
            </span>
          )}
        </div>
        <p className="mt-0.5 text-[11.5px] text-sub">{t("wm.editHint")}</p>

        {/* Two levels, not one long row: pick the place first, then its floor.
            One cell can hold nine maps (Glast Heim and its interiors) and a
            single row of nine tabs is unreadable. The floor row only appears
            when the chosen place actually has floors. */}
        {pin.areas.length > 1 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {pin.areas.map((area) => {
              const stats = area.maps.map((m) => mapProgress(m.id, levels));
              const maxed = stats.reduce((n, p) => n + p.maxed, 0);
              const total = stats.reduce((n, p) => n + p.total, 0);
              const on = area.maps.some((m) => m.id === activeMapId);
              return (
                <button
                  key={area.name}
                  type="button"
                  aria-pressed={on}
                  onClick={() => onMap(area.maps[0].id)}
                  // every chip is laid out at its BOLD width, so selecting one
                  // cannot re-wrap the row and move the others under the cursor
                  className={`press rounded-md border px-2 py-1 text-[11.5px] font-semibold ${
                    on
                      ? "border-accent bg-accent text-accent-ink"
                      : "border-line bg-surface-2 text-sub hover:border-accent hover:text-accent"
                  }`}
                >
                  {area.name}
                  <span
                    className={`ml-1.5 font-mono text-[10px] tabular-nums ${
                      on ? "text-accent-ink" : "text-sub"
                    }`}
                  >
                    {maxed}/{total}
                  </span>
                  {area.complete && (
                    <CheckIcon
                      size={11}
                      aria-label={t("wm.complete")}
                      aria-hidden={false}
                      className={`ml-1 inline align-[-1px] ${
                        on ? "text-accent-ink" : "text-gold"
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </div>
        )}

        {activeArea && activeArea.maps.length > 1 && (
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span className="font-mono text-[9px] tracking-[0.1em] text-sub uppercase">
              {t("wm.floor")}
            </span>
            {activeArea.maps.map((map) => {
              const stats = mapProgress(map.id, levels);
              const label = floorLabel(map.name, activeArea.maps.length);
              const on = map.id === activeMapId;
              return (
                <button
                  key={map.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => onMap(map.id)}
                  className={`press rounded-md border px-2 py-0.5 text-[11px] font-semibold ${
                    on
                      ? "border-accent bg-accent text-accent-ink"
                      : "border-line bg-surface-2 text-sub hover:border-accent hover:text-accent"
                  }`}
                >
                  {label}
                  <span
                    className={`ml-1 font-mono text-[9.5px] tabular-nums ${
                      on ? "text-accent-ink" : "text-sub"
                    }`}
                  >
                    {stats.maxed}/{stats.total}
                  </span>
                  {stats.complete && (
                    <CheckIcon
                      size={10}
                      aria-label={t("wm.complete")}
                      aria-hidden={false}
                      className={`ml-1 inline align-[-1px] ${
                        on ? "text-accent-ink" : "text-gold"
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <dl className="grid flex-none grid-cols-3 gap-px border-b border-line bg-line">
        {[
          { key: "wm.total" as const, value: progress.total, tone: "" },
          { key: "wm.maxed" as const, value: progress.maxed, tone: "text-gold" },
          { key: "wm.left" as const, value: progress.remaining, tone: "text-accent" },
        ].map((stat) => (
          <div key={stat.key} className="bg-surface-2 px-2.5 py-1.5">
            <dt className="font-mono text-[8.5px] font-bold tracking-[0.1em] text-sub uppercase">
              {t(stat.key)}
            </dt>
            <dd
              className={`mt-0.5 font-mono text-base font-extrabold tabular-nums ${stat.tone}`}
            >
              {stat.value}
            </dd>
          </div>
        ))}
      </dl>

      <div ref={rosterRef} className="min-h-0 flex-1 overflow-y-auto">
        {progress.monsterIds.map((id) => (
          <RosterRow
            key={id}
            monster={getMonster(id)}
            level={levelOf(id, levels)}
            highlighted={id === selectedId}
          />
        ))}
      </div>

      <p
        className={`flex flex-none items-center gap-1.5 border-t border-line px-4 py-2 text-[11.5px] ${
          progress.complete ? "font-semibold text-gold" : "text-sub"
        }`}
      >
        {progress.complete && <CheckIcon size={12} className="flex-none" />}
        {progress.complete
          ? t("wm.mapComplete")
          : t("wm.levelsLeft").replace("{n}", String(progress.levelsLeft))}
      </p>
    </div>
  );
}

function RosterRow({
  monster,
  level,
  highlighted,
}: {
  monster: Monster;
  level: number;
  highlighted: boolean;
}) {
  const t = useT();
  return (
    <div
      className={`flex items-center gap-2.5 border-b border-line px-3 py-1.5 ${
        highlighted ? "bg-accent/12 shadow-[inset_2px_0_0_var(--accent)]" : ""
      }`}
    >
      <MonsterAvatar monster={monster} level={level} size="md" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px]">{monster.name}</p>
        <p className="mt-0.5 flex items-center gap-1.5 text-[10.5px] text-sub">
          <span
            aria-hidden
            className="h-1.5 w-1.5 shrink-0 rounded-full"
            style={{ background: `var(--el-${monster.elementId.toLowerCase()})` }}
          />
          {monster.elementId}
          {monster.baseLevel !== undefined && ` · Base ${monster.baseLevel}`}
        </p>
      </div>
      <span
        className={`shrink-0 rounded-md border px-1.5 font-mono text-[11px] tabular-nums ${
          level >= MAX_MR_LEVEL
            ? "border-gold bg-gold font-bold text-gold-ink"
            : level === 0
              ? "border-dashed border-line text-sub"
              : "border-line text-sub"
        }`}
      >
        {level}/{MAX_MR_LEVEL}
      </span>
      <LevelStepper
        value={level}
        ariaLabel={`${monster.name} ${t("mr.lvShort")}`}
        onChange={(next) => void setMonsterLevel(monster.id, next, "confirmed")}
      />
    </div>
  );
}
