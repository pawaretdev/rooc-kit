"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  restrictToParentElement,
  restrictToVerticalAxis,
} from "@dnd-kit/modifiers";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

/**
 * Vertical drag-to-reorder built on dnd-kit: pointer + touch + keyboard, with
 * the live transform/transition that makes neighbours slide out of the way.
 *
 * The list is controlled — `onReorder` receives the ids in their new order and
 * is responsible for persisting them.
 */
export function SortableList({
  ids,
  onReorder,
  children,
}: {
  ids: string[];
  onReorder: (nextIds: string[]) => void;
  children: React.ReactNode;
}) {
  const sensors = useSensors(
    // a small activation distance keeps clicks on row controls from dragging
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    if (from < 0 || to < 0) return;
    onReorder(arrayMove(ids, from, to));
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis, restrictToParentElement]}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        {children}
      </SortableContext>
    </DndContext>
  );
}

export interface SortableRenderProps {
  /** spread onto the drag handle element */
  handleProps: Record<string, unknown>;
  isDragging: boolean;
}

/**
 * One sortable item. `as` lets the same hook drive a <li> or a table <tr>;
 * the render prop hands back the handle bindings so only the grip drags.
 */
export function SortableItem({
  id,
  as: Tag = "li",
  className,
  elementRef,
  style,
  children,
  ...rest
}: {
  id: string;
  as?: "li" | "tr" | "div";
  className?: string;
  /** extra ref for callers that need to measure the row */
  elementRef?: (el: HTMLElement | null) => void;
  children: (props: SortableRenderProps) => React.ReactNode;
} & Omit<React.HTMLAttributes<HTMLElement>, "children">) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  return (
    <Tag
      ref={(el: HTMLElement | null) => {
        setNodeRef(el);
        elementRef?.(el);
      }}
      style={{
        // caller styles first: the drag transform below must always win
        ...style,
        transform: CSS.Transform.toString(transform),
        transition,
        // Lift the dragged row above its neighbours. It needs an opaque
        // background of its own only while it floats — otherwise rows stay
        // transparent so they inherit whatever surface they sit on.
        ...(isDragging
          ? {
              position: "relative",
              zIndex: 10,
              backgroundColor: "var(--surface-2)",
              boxShadow: "0 8px 24px oklch(0 0 0 / 0.35)",
            }
          : {}),
      }}
      className={className}
      {...rest}
    >
      {children({
        isDragging,
        handleProps: {
          ref: setActivatorNodeRef,
          ...attributes,
          ...listeners,
        },
      })}
    </Tag>
  );
}

/** Standard grip button — spread `handleProps` from SortableItem onto it. */
export function DragHandle({
  label,
  ...props
}: { label: string } & Record<string, unknown>) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className="press inline-flex h-8 w-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg border border-line text-sub hover:border-accent hover:text-accent active:cursor-grabbing"
      {...props}
    >
      <GripVertical className="size-4" />
    </button>
  );
}
