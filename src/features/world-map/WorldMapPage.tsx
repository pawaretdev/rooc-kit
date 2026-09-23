"use client";

import { useMonsterLevels } from "../monster-research/useProgress";
import { WorldMapBody } from "./WorldMapDialog";

/**
 * The World Map as its own page. Same component the tracker's dialog mounts,
 * minus the dialog chrome: no close button, and it fills the viewport under
 * the app header instead of floating over it.
 */
export function WorldMapPage() {
  const levels = useMonsterLevels();

  // useLiveQuery returns undefined until IndexedDB answers; rendering the map
  // with an empty map of levels would flash every monster at 0
  // The map fills the viewport below the 56px header. The page body only sets
  // `min-h-full`, so without an explicit height the stage grows to fit its own
  // 1536px content and the map scrolls off the bottom of the screen.
  const frame = "flex flex-col overflow-hidden h-[calc(100svh-3.5rem)]";

  if (!levels) {
    return <div className={frame} aria-busy="true" />;
  }

  return (
    <div className={frame}>
      <WorldMapBody initial={null} focusMapId={null} levels={levels} />
    </div>
  );
}
