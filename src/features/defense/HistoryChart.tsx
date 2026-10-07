"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";

/**
 * Small line chart for the DEF Planner history — one point per saved
 * snapshot, evenly spaced in save order (they are check-ins, not a regular
 * time series). Gaps where a snapshot lacks the stat; crosshair + tooltip
 * on pointer and arrow keys; the snapshot list beside it is the table view.
 */

export interface ChartSeries {
  id: string;
  label: string;
  /** CSS color of the line/dots, e.g. "var(--chart-phys)" */
  color: string;
  values: (number | null)[];
}

export interface ChartPoint {
  name: string;
  date: string;
}

const HEIGHT = 220;
const M = { top: 14, right: 56, bottom: 26, left: 48 };
/** past this many points every-dot markers become noise — keep the ends */
const DOT_LIMIT = 24;

function niceStep(range: number, target: number): number {
  const raw = range / target;
  const power = 10 ** Math.floor(Math.log10(raw));
  const unit = raw / power;
  const nice = unit <= 1 ? 1 : unit <= 2 ? 2 : unit <= 2.5 ? 2.5 : unit <= 5 ? 5 : 10;
  return nice * power;
}

function domain(values: number[]): { min: number; max: number; ticks: number[] } {
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (min === max) {
    const pad = Math.abs(min) * 0.05 || 1;
    min -= pad;
    max += pad;
  }
  const step = niceStep(max - min, 4);
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Number(v.toPrecision(12)));
  return { min: lo, max: hi, ticks };
}

function useWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

export function HistoryChart({
  series,
  points,
  formatValue,
  formatTick = formatValue,
  ariaLabel,
}: {
  series: ChartSeries[];
  points: ChartPoint[];
  formatValue: (value: number) => string;
  formatTick?: (value: number) => string;
  ariaLabel: string;
}) {
  const [ref, width] = useWidth();
  const [active, setActive] = useState<number | null>(null);

  const all = series.flatMap((s) => s.values.filter((v): v is number => v !== null));
  const n = points.length;
  const innerW = Math.max(width - M.left - M.right, 1);
  const innerH = HEIGHT - M.top - M.bottom;

  const scale = all.length > 0 ? domain(all) : null;
  const x = (i: number) => M.left + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const y = (v: number) =>
    scale ? M.top + (1 - (v - scale.min) / (scale.max - scale.min)) * innerH : 0;

  const pathOf = (values: (number | null)[]) => {
    let d = "";
    let pen = false;
    values.forEach((v, i) => {
      if (v === null) {
        pen = false;
        return;
      }
      d += `${pen ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`;
      pen = true;
    });
    return d;
  };

  const lastIndex = (values: (number | null)[]) => {
    for (let i = values.length - 1; i >= 0; i--) if (values[i] !== null) return i;
    return -1;
  };

  // End labels only when they stay clear of each other — never stacked.
  const ends = series
    .map((s) => {
      const i = lastIndex(s.values);
      return i < 0 ? null : { id: s.id, i, v: s.values[i] as number };
    })
    .filter((e): e is { id: string; i: number; v: number } => e !== null);
  const endsClear =
    ends.length <= 1 ||
    ends.every((a, ai) => ends.every((b, bi) => ai === bi || Math.abs(y(a.v) - y(b.v)) >= 14));

  const pickIndex = (clientX: number, rect: DOMRect) => {
    if (n <= 1) return 0;
    const ratio = (clientX - rect.left - M.left) / innerW;
    return Math.max(0, Math.min(n - 1, Math.round(ratio * (n - 1))));
  };

  const onPointerMove = (e: PointerEvent<SVGSVGElement>) =>
    setActive(pickIndex(e.clientX, e.currentTarget.getBoundingClientRect()));

  const onKeyDown = (e: KeyboardEvent<SVGSVGElement>) => {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      const step = e.key === "ArrowLeft" ? -1 : 1;
      setActive((cur) => Math.max(0, Math.min(n - 1, (cur ?? n - 1) + (cur === null ? 0 : step))));
    } else if (e.key === "Escape") {
      setActive(null);
    }
  };

  const tooltipLeft = active === null ? 0 : x(active);
  const flip = tooltipLeft > width * 0.6;

  return (
    <div ref={ref} className="relative w-full" style={{ height: HEIGHT }}>
      {width > 0 && scale && (
        <svg
          width={width}
          height={HEIGHT}
          role="img"
          aria-label={ariaLabel}
          tabIndex={0}
          className="block touch-pan-y select-none outline-none focus-visible:rounded-lg focus-visible:ring-2 focus-visible:ring-accent/50"
          onPointerMove={onPointerMove}
          onPointerLeave={() => setActive(null)}
          onFocus={() => setActive((cur) => cur ?? n - 1)}
          onBlur={() => setActive(null)}
          onKeyDown={onKeyDown}
        >
          {scale.ticks.map((tick) => (
            <g key={tick}>
              <line
                x1={M.left}
                x2={M.left + innerW}
                y1={y(tick)}
                y2={y(tick)}
                stroke="var(--line)"
                strokeWidth={1}
              />
              <text
                x={M.left - 8}
                y={y(tick)}
                dy="0.32em"
                textAnchor="end"
                fontSize={10}
                fill="var(--sub)"
                className="font-mono tabular-nums"
              >
                {formatTick(tick)}
              </text>
            </g>
          ))}

          {n > 0 && (
            <>
              <text x={x(0)} y={HEIGHT - 6} fontSize={10} fill="var(--sub)" textAnchor={n === 1 ? "middle" : "start"}>
                {points[0].date}
              </text>
              {n > 1 && (
                <text x={x(n - 1)} y={HEIGHT - 6} fontSize={10} fill="var(--sub)" textAnchor="end">
                  {points[n - 1].date}
                </text>
              )}
            </>
          )}

          {active !== null && (
            <line
              x1={x(active)}
              x2={x(active)}
              y1={M.top}
              y2={M.top + innerH}
              stroke="var(--sub)"
              strokeOpacity={0.5}
              strokeWidth={1}
            />
          )}

          {series.map((s) => (
            <g key={s.id}>
              <path
                d={pathOf(s.values)}
                fill="none"
                stroke={s.color}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {s.values.map((v, i) => {
                if (v === null) return null;
                const isolated =
                  (i === 0 || s.values[i - 1] === null) &&
                  (i === s.values.length - 1 || s.values[i + 1] === null);
                const show =
                  n <= DOT_LIMIT || i === active || i === lastIndex(s.values) || isolated;
                if (!show) return null;
                return (
                  <circle
                    key={i}
                    cx={x(i)}
                    cy={y(v)}
                    r={i === active ? 5 : 4}
                    fill={s.color}
                    stroke="var(--surface)"
                    strokeWidth={2}
                  />
                );
              })}
            </g>
          ))}

          {endsClear &&
            ends.map((end) => (
              <text
                key={end.id}
                x={x(end.i) + 9}
                y={y(end.v)}
                dy="0.32em"
                fontSize={11}
                fontWeight={600}
                fill="var(--ink)"
                className="font-mono tabular-nums"
              >
                {formatValue(end.v)}
              </text>
            ))}
        </svg>
      )}

      {active !== null && points[active] && (
        <div
          role="status"
          className="pointer-events-none absolute top-2 z-10 min-w-36 rounded-lg border border-line bg-[var(--tip-bg)] px-3 py-2 text-[var(--tip-ink)] shadow-md"
          style={
            flip
              ? { right: Math.max(width - tooltipLeft + 10, 0) }
              : { left: Math.min(tooltipLeft + 10, Math.max(width - 150, 0)) }
          }
        >
          <p className="max-w-48 truncate text-xs font-semibold">{points[active].name}</p>
          <p className="text-[10px] opacity-70">{points[active].date}</p>
          <ul className="mt-1.5 space-y-1">
            {series.map((s) => {
              const v = s.values[active];
              return (
                <li key={s.id} className="flex items-center gap-2 text-xs">
                  <span aria-hidden className="h-0.5 w-3 rounded-sm" style={{ background: s.color }} />
                  <span className="font-mono font-bold tabular-nums">
                    {v === null ? "—" : formatValue(v)}
                  </span>
                  <span className="opacity-70">{s.label}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
