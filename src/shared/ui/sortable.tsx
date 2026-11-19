import { closestCenter, DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { rectSortingStrategy, SortableContext, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

const LONG_PRESS_MS = 250;
// Movement allowed while holding; more than this and the press stays a click or scroll instead of a drag.
const LONG_PRESS_TOLERANCE_PX = 5;

interface SortableScopeProps {
  /** Ids of the SortableItems inside, in render order. */
  itemIds: string[];
  /** The moved item takes the target's slot; items between them shift by one. */
  onMove: (movedId: string, targetId: string) => void;
  children: ReactNode;
}

/** Lets its SortableItems be reordered by long-press dragging; works for lists and grids alike. */
export function SortableScope({ itemIds, onMove, children }: SortableScopeProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { delay: LONG_PRESS_MS, tolerance: LONG_PRESS_TOLERANCE_PX } }),
  );
  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (over && active.id !== over.id) onMove(String(active.id), String(over.id));
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={itemIds} strategy={rectSortingStrategy}>{children}</SortableContext>
    </DndContext>
  );
}

interface SortableItemProps {
  id: string;
  children: ReactNode;
  layoutClassName?: string;
}

/**
 * A list item that can be dragged within its SortableScope. While lifted it carries `data-dragging`,
 * so children can restyle themselves with the `in-data-dragging:` variant.
 */
export function SortableItem({ id, children, layoutClassName }: SortableItemProps) {
  const { setNodeRef, listeners, transform, transition, isDragging } = useSortable({ id });

  // NOTE: dnd-kit's `attributes` are left out on purpose: they make the item itself a tab stop,
  // duplicating the button inside that already carries focus and the item's action.
  return (
    <li
      ref={setNodeRef}
      {...listeners}
      data-dragging={isDragging || undefined}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        'transition-[scale] data-dragging:relative data-dragging:z-(--layer-raised) data-dragging:scale-[1.03] data-dragging:cursor-grabbing',
        layoutClassName,
      )}
    >
      {children}
    </li>
  );
}
