"use client";

import { MAX_MR_LEVEL } from "@/lib/local-db";
import { MinusIcon, PlusIcon } from "@/components/icons";

interface LevelStepperProps {
  value: number;
  onChange: (level: number) => void;
  ariaLabel: string;
}

/**
 * Buttons render at 28px (36px on coarse pointers) with an invisible
 * ::after expansion that brings the touch target to ≥44px.
 */
const stepBtn =
  "press relative inline-flex h-7 w-7 items-center justify-center rounded-md border border-line bg-surface text-sub hover:border-accent hover:text-accent disabled:opacity-30 disabled:hover:border-line disabled:hover:text-sub pointer-coarse:h-9 pointer-coarse:w-9 pointer-coarse:after:absolute pointer-coarse:after:-inset-1";

export function LevelStepper({ value, onChange, ariaLabel }: LevelStepperProps) {
  return (
    <span className="inline-flex items-center gap-0.5">
      <button
        type="button"
        aria-label={`${ariaLabel} −1`}
        disabled={value <= 0}
        onClick={() => onChange(value - 1)}
        className={stepBtn}
      >
        <MinusIcon />
      </button>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        max={MAX_MR_LEVEL}
        value={value}
        aria-label={ariaLabel}
        onChange={(e) => {
          const parsed = Number(e.target.value);
          if (Number.isFinite(parsed)) onChange(parsed);
        }}
        className="h-7 w-9 rounded-md border border-line bg-surface text-center font-mono text-sm tabular-nums pointer-coarse:h-9"
        data-adv
      />
      <button
        type="button"
        aria-label={`${ariaLabel} +1`}
        disabled={value >= MAX_MR_LEVEL}
        onClick={() => onChange(value + 1)}
        className={stepBtn}
      >
        <PlusIcon />
      </button>
    </span>
  );
}
