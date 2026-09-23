"use client";

import { useRef } from "react";
import type { CaveArrowPosition } from "./caveLayout";

/** Screen-sized controls; coordinates stay relative to the parent map cell. */
export function CaveArrowHandle({ label, part, arrow, x, y, scale, cellSize, onSelect, onChange }: {
  label: string;
  part: "whole" | "start" | "end";
  arrow: CaveArrowPosition;
  x: number;
  y: number;
  scale: number;
  cellSize: number;
  onSelect: () => void;
  onChange: (arrow: CaveArrowPosition, commit: boolean) => void;
}) {
  const drag = useRef<{ id: number; x: number; y: number; arrow: CaveArrowPosition } | null>(null);
  const shift = (base: CaveArrowPosition, dx: number, dy: number) => ({
    startX: base.startX + (part !== "end" ? dx : 0),
    startY: base.startY + (part !== "end" ? dy : 0),
    endX: base.endX + (part !== "start" ? dx : 0),
    endY: base.endY + (part !== "start" ? dy : 0),
  });
  const at = (clientX: number, clientY: number) => {
    const origin = drag.current!;
    return shift(origin.arrow, (clientX - origin.x) / (scale * cellSize), (clientY - origin.y) / (scale * cellSize));
  };
  // Keep endpoint targets from covering each other on a short arrow.
  const lengthOnScreen = Math.hypot(arrow.endX - arrow.startX, arrow.endY - arrow.startY) * cellSize * scale;
  const handleSize = part === "whole" ? 28 : Math.min(28, Math.max(10, lengthOnScreen * 0.7));
  return (
    <button
      type="button"
      data-cave-arrow
      aria-label={label}
      title={label}
      style={{ width: handleSize, height: handleSize, left: x * cellSize, top: y * cellSize, transform: `translate(-50%, -50%) scale(${1 / scale})` }}
      className="pointer-events-auto absolute z-20 grid size-7 touch-none cursor-move place-items-center focus-visible:outline-2 focus-visible:outline-accent"
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        event.stopPropagation(); event.preventDefault();
        onSelect();
        event.currentTarget.focus({ preventScroll: true });
        drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, arrow };
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        if (drag.current?.id === event.pointerId) onChange(at(event.clientX, event.clientY), false);
      }}
      onPointerUp={(event) => {
        if (drag.current?.id !== event.pointerId) return;
        onChange(at(event.clientX, event.clientY), true);
        drag.current = null;
        event.currentTarget.releasePointerCapture(event.pointerId);
      }}
      onPointerCancel={() => {
        if (drag.current) onChange(drag.current.arrow, true);
        drag.current = null;
      }}
      onLostPointerCapture={() => {
        if (drag.current) onChange(arrow, true);
        drag.current = null;
      }}
      onKeyDown={(event) => {
        const direction = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key];
        if (!direction) return;
        event.preventDefault(); event.stopPropagation(); onSelect();
        const step = event.shiftKey ? 0.1 : 0.025;
        onChange(shift(arrow, direction[0] * step, direction[1] * step), true);
      }}
    >
      <span className={part === "whole" ? "size-2 rounded-sm border border-surface bg-gold" : `size-3 border-2 border-accent bg-surface ${part === "end" ? "rotate-45" : "rounded-sm"}`} />
    </button>
  );
}
