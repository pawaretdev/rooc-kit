"use client";

import { useState } from "react";
import { ImageOff } from "lucide-react";
import { taskIconUrl } from "@/lib/images";
import { TASK_ICONS } from "@/lib/task-icons";
import { IconPicker } from "@/components/IconPicker";

/**
 * A task's event art beside its name. Tasks without an icon render nothing —
 * unless `reserve` is set, which keeps an empty slot so names in a list where
 * some rows carry art still line up. A missing PNG (unknown id from an older
 * sync payload) collapses to the same empty slot instead of a broken image.
 */
export function TaskIcon({
  icon,
  reserve = false,
  className = "",
}: {
  icon?: string | null;
  reserve?: boolean;
  className?: string;
}) {
  const [missing, setMissing] = useState(false);
  const showArt = Boolean(icon) && !missing;
  if (!showArt && !reserve) return null;

  return (
    <span className={`inline-flex size-6 shrink-0 items-center justify-center ${className}`}>
      {showArt && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={taskIconUrl(icon as string)}
          alt=""
          draggable={false}
          className="h-full w-full object-contain"
          onError={() => setMissing(true)}
        />
      )}
    </span>
  );
}

/** Dailies event art chooser — the shared IconPicker over TASK_ICONS. */
export function TaskIconPicker({
  value,
  onChange,
  disabled = false,
}: {
  value?: string | null;
  onChange: (next: string | null) => void;
  disabled?: boolean;
}) {
  return (
    <IconPicker
      icons={TASK_ICONS}
      urlOf={taskIconUrl}
      value={value}
      onChange={onChange}
      disabled={disabled}
      placeholder={<ImageOff aria-hidden className="size-4 text-sub/60" />}
    />
  );
}
