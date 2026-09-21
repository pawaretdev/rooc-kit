"use client";

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
  cellsOf,
  floorLabel,
  mapProgress,
  type Callout,
  type MapPin,
} from "./mapGroups";
import { useMapCamera } from "./useMapCamera";

/** CSS pixels of the map layer at scale 1 — the art is 1536². */
const MAP_SIZE = 1536;
const CELL_PX = worldMapCellSize * MAP_SIZE;
/**
 * Ceiling for the opening zoom: close enough to read the terrain when only a
 * map or two is in frame. `fitPoints` zooms out below this whenever the content
 * needs it — with every cave label on screen the fit lands near 90%.
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
  initial: Monster;
  focusMapId: string | null;
  levels: ReadonlyMap<string, MonsterLevelRecord>;
  onClose?: () => void;
}) {
  const t = useT();
  // null = nothing pinned: the map shows no monster at all
  const [selectedId, setSelectedId] = useState<string | null>(initial.id);
  const [kind, setKind] = useState<KindFilter>(
    initial.kind === "normal" ? "normal" : "boss",
  );
  const [bracket, setBracket] = useState<BracketId | "All">("All");
  const [query, setQuery] = useState("");
  // which map's roster is open — seeded from the row the user clicked
  const [activeMapId, setActiveMapId] = useState<string | null>(
    focusMapId ?? initial.mapIds[0] ?? null,
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
      // With the cave names on, a label can sit two cells out — Glast Heim's
      // six fan that far — so they have to be framed as well or they land off
      // screen. Off, the cells alone give a tighter, closer view.
      return frame.flatMap((pin) => [
        pin.anchor,
        ...(showDungeons
          ? pin.callouts.map((callout) => ({
              x: pin.anchor.x + callout.dx * worldMapCellSize,
              y: pin.anchor.y + callout.dy * worldMapCellSize,
            }))
          : []),
      ]);
    },
    [pins, spawnCells, showDungeons],
  );
  // Opening on a specific map centres it; otherwise frame every spawn cell.
  // Only the monster the dialog opened with honours focusMapId — once the user
  // picks someone else in the rail, framing their whole spread is what helps.
  const framing = useMemo(() => {
    const focus =
      selectedId === initial.id && focusMapId
        ? getMap(focusMapId).anchor
        : undefined;
    return focus ? { focus } : { anchors: spawnAnchors };
  }, [selectedId, initial.id, focusMapId, spawnAnchors]);

  useEffect(() => {
    const apply = () => {
      if (framing.focus) centerOn(framing.focus.x, framing.focus.y, OPEN_SCALE);
      // nothing pinned means nothing to frame — leave the view where it is
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
            pins.flatMap((pin) =>
              pin.callouts.map((callout) => (
                <CaveCallout
                  key={`cave-${pin.id}-${callout.name}`}
                  pin={pin}
                  callout={callout}
                  scale={camera.scale}
                />
              )),
            )}
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

      <div className="absolute top-3 right-3">
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
      </div>

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
  const tooSmall = scale < CROWDED;
  // The box is sized in map units, so a CSS border is multiplied by the camera
  // too: 2px reads as a 9px slab at 460% and the dashes stretch with it.
  // Dividing by the scale keeps every outline the same weight on screen.
  const hairline = `${2 / scale}px`;

  return (
    <button
      type="button"
      data-map-pin
      onClick={onPick}
      aria-pressed={active}
      aria-label={`${pin.label} — ${pin.progress.maxed}/${pin.progress.total}`}
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
    </button>
  );
}

/**
 * A floating name for the dungeons inside a cell, with a leader line down to
 * the square — the shape the game's own world map uses to reveal caves.
 */
function CaveCallout({
  pin,
  callout,
  scale,
}: {
  pin: MapPin;
  callout: Callout;
  scale: number;
}) {
  const cellX = pin.anchor.x * MAP_SIZE;
  const cellY = pin.anchor.y * MAP_SIZE;
  const labelX = cellX + callout.dx * CELL_PX;
  const labelY = cellY + callout.dy * CELL_PX;
  const dx = cellX - labelX;
  const dy = cellY - labelY;
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;

  const font = CELL_PX * 0.15;
  // the chip's own box, so the line can start where the chip actually ends
  const halfW = (callout.name.length * font * 0.55) / 2 + font * 0.55;
  const halfH = font * 0.65 + font * 0.2;

  // Distance from the label's centre to its edge along the line's direction —
  // a fixed gap left the first stretch of the line hidden under a wide chip,
  // so it looked like the arrow floated free of the text it belongs to.
  const ux = dx / (Math.hypot(dx, dy) || 1);
  const uy = dy / (Math.hypot(dx, dy) || 1);
  const edge = Math.min(
    Math.abs(ux) > 1e-3 ? Math.abs(halfW / ux) : Infinity,
    Math.abs(uy) > 1e-3 ? Math.abs(halfH / uy) : Infinity,
  );
  const start = edge + font * 0.25;
  const line = Math.max(
    CELL_PX * 0.1,
    Math.hypot(dx, dy) - CELL_PX * 0.5 - start,
  );
  const thickness = Math.max(1 / scale, CELL_PX * 0.03);
  const head = CELL_PX * 0.15;

  return (
    <span
      aria-hidden
      style={{ left: labelX, top: labelY }}
      className="pointer-events-none absolute z-10"
    >
      {/* the connector rotates as one piece, so any offset angle works */}
      <span
        style={{ transform: `rotate(${angle}deg)`, transformOrigin: "0 50%" }}
        className="absolute top-0 left-0 flex items-center"
      >
        <span style={{ width: start }} />
        <span style={{ width: line, height: thickness }} className="bg-gold" />
        {/* solid arrowhead: a filled triangle, not an outline */}
        <svg
          width={head}
          height={head}
          viewBox="0 0 10 10"
          style={{ marginLeft: -0.5 }}
          className="fill-gold"
        >
          <path d="M0 0.8 L10 5 L0 9.2 Z" />
        </svg>
      </span>

      <span
        style={{ fontSize: font }}
        className="absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 rounded border border-gold/70 bg-black/85 px-1.5 leading-[1.3] font-semibold whitespace-nowrap text-gold"
      >
        {callout.name}
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
        <h3 className="text-[15px] font-bold">{activeMap.name}</h3>
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

      <p className="flex-none border-t border-line px-4 py-2 text-[11.5px] text-sub">
        {progress.levelsLeft === 0
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
