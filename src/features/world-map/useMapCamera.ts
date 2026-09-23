"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface Camera {
  x: number;
  y: number;
  scale: number;
}

const MIN_SCALE = 0.4;
const MAX_SCALE = 5;

/** Keeps the image covering the viewport; centres it when it is smaller. */
function clamp(camera: Camera, view: DOMRect, size: number): Camera {
  const span = size * camera.scale;
  return {
    scale: camera.scale,
    x:
      span <= view.width
        ? (view.width - span) / 2
        : Math.min(0, Math.max(view.width - span, camera.x)),
    y:
      span <= view.height
        ? (view.height - span) / 2
        : Math.min(0, Math.max(view.height - span, camera.y)),
  };
}

/**
 * Pan/zoom for a square map image of `size` CSS pixels.
 *
 * Dragging and wheel-zoom are bound natively rather than through React props:
 * a passive wheel listener cannot call preventDefault, so the page would scroll
 * behind the map.
 */
export function useMapCamera(size: number) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [camera, setCamera] = useState<Camera>({ x: 0, y: 0, scale: 1 });
  // the pointer drag writes through a ref so a moving finger never queues a
  // render per frame; React state only catches up on release
  const cameraRef = useRef(camera);
  const setBoth = useCallback((next: Camera) => {
    cameraRef.current = next;
    setCamera(next);
  }, []);

  const withView = useCallback(
    (fn: (view: DOMRect) => Camera) => {
      const node = viewportRef.current;
      if (!node) return;
      const view = node.getBoundingClientRect();
      if (!view.width || !view.height) return;
      setBoth(clamp(fn(view), view, size));
    },
    [setBoth, size],
  );

  /** Centres a point given in 0..1 image fractions. */
  const centerOn = useCallback(
    (fx: number, fy: number, scale?: number) =>
      withView((view) => {
        const next = scale ?? cameraRef.current.scale;
        return {
          scale: next,
          x: view.width / 2 - fx * size * next,
          y: view.height / 2 - fy * size * next,
        };
      }),
    [size, withView],
  );

  /**
   * Frames every point (0..1 fractions) with a little breathing room.
   *
   * `maxFit` keeps a lone map from filling the screen: fitting one point means
   * fitting a box of only twice the padding, which would zoom past 400% and
   * throw away the surrounding geography that makes the map worth showing.
   */
  const fitPoints = useCallback(
    (points: readonly { x: number; y: number }[], padding = 90, maxFit = 1.8) =>
      withView((view) => {
        if (points.length === 0) return cameraRef.current;
        const xs = points.map((p) => p.x * size);
        const ys = points.map((p) => p.y * size);
        const minX = Math.min(...xs) - padding;
        const maxX = Math.max(...xs) + padding;
        const minY = Math.min(...ys) - padding;
        const maxY = Math.max(...ys) + padding;
        const scale = Math.min(
          maxFit,
          Math.max(
            MIN_SCALE,
            Math.min(view.width / (maxX - minX), view.height / (maxY - minY)),
          ),
        );
        return {
          scale,
          x: view.width / 2 - ((minX + maxX) / 2) * scale,
          y: view.height / 2 - ((minY + maxY) / 2) * scale,
        };
      }),
    [size, withView],
  );

  /** Zooms about the viewport centre — what the +/− buttons do. */
  const zoomBy = useCallback(
    (factor: number) =>
      withView((view) => {
        const current = cameraRef.current;
        const scale = Math.min(
          MAX_SCALE,
          Math.max(MIN_SCALE, current.scale * factor),
        );
        const cx = view.width / 2;
        const cy = view.height / 2;
        return {
          scale,
          x: cx - (cx - current.x) * (scale / current.scale),
          y: cy - (cy - current.y) * (scale / current.scale),
        };
      }),
    [withView],
  );

  useEffect(() => {
    const node = viewportRef.current;
    if (!node) return;

    let dragging: { x: number; y: number; id: number } | null = null;

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const view = node.getBoundingClientRect();
      const current = cameraRef.current;
      // Trackpads fire many small deltas per gesture, so a fixed per-event
      // factor races away. Scale the step by the delta and keep it gentle.
      const step = Math.min(Math.abs(event.deltaY), 50) / 50;
      const factor =
        event.deltaY < 0 ? 1 + 0.06 * step : 1 / (1 + 0.06 * step);
      const scale = Math.min(
        MAX_SCALE,
        Math.max(MIN_SCALE, current.scale * factor),
      );
      const px = event.clientX - view.left;
      const py = event.clientY - view.top;
      setBoth(
        clamp(
          {
            scale,
            x: px - (px - current.x) * (scale / current.scale),
            y: py - (py - current.y) * (scale / current.scale),
          },
          view,
          size,
        ),
      );
    };

    const onPointerDown = (event: PointerEvent) => {
      // let the pins handle their own taps
      if ((event.target as HTMLElement).closest("[data-map-pin], [data-cave-label], [data-cave-arrow]")) return;
      dragging = { x: event.clientX, y: event.clientY, id: event.pointerId };
      node.setPointerCapture(event.pointerId);
      node.dataset.dragging = "true";
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!dragging || event.pointerId !== dragging.id) return;
      const view = node.getBoundingClientRect();
      const current = cameraRef.current;
      setBoth(
        clamp(
          {
            scale: current.scale,
            x: current.x + (event.clientX - dragging.x),
            y: current.y + (event.clientY - dragging.y),
          },
          view,
          size,
        ),
      );
      dragging = { ...dragging, x: event.clientX, y: event.clientY };
    };

    const endDrag = (event: PointerEvent) => {
      if (!dragging || event.pointerId !== dragging.id) return;
      node.releasePointerCapture?.(dragging.id);
      dragging = null;
      delete node.dataset.dragging;
    };

    node.addEventListener("wheel", onWheel, { passive: false });
    node.addEventListener("pointerdown", onPointerDown);
    node.addEventListener("pointermove", onPointerMove);
    node.addEventListener("pointerup", endDrag);
    node.addEventListener("pointercancel", endDrag);
    return () => {
      node.removeEventListener("wheel", onWheel);
      node.removeEventListener("pointerdown", onPointerDown);
      node.removeEventListener("pointermove", onPointerMove);
      node.removeEventListener("pointerup", endDrag);
      node.removeEventListener("pointercancel", endDrag);
    };
  }, [setBoth, size]);

  return { viewportRef, camera, centerOn, fitPoints, zoomBy };
}
