import { type DragEvent, type KeyboardEvent, useRef, useState } from 'react';
import { mergeProps, useDrag, useDrop } from 'react-aria';

import { GripIcon } from '../components/icons.tsx';

/** Marks the element that is shown under the pointer while its handle is dragged. */
export const dragRowAttribute = 'data-drag-row';

/** Focuses the drag handle of an item after the next render. */
export function focusHandle(key: string) {
  requestAnimationFrame(() => {
    document.querySelector<HTMLElement>(`[data-handle="${CSS.escape(key)}"]`)?.focus();
  });
}

/**
 * A drag handle for an item. Dragging it with a pointer moves the item onto a
 * `useDropTarget`. The arrow keys move the item up and down.
 */
export function DragHandle(props: {
  /** A MIME type that drop targets accept, such as `application/x-cookbook-ingredient`. */
  type: string;
  itemKey: string;
  label: string;
  onStep: (direction: -1 | 1) => void;
  onDraggingChange?: (dragging: boolean) => void;
  className?: string;
}) {
  const { type, itemKey, label, onStep, onDraggingChange, className = '' } = props;
  const { dragProps } = useDrag({
    getItems: () => [{ [type]: itemKey }],
    getAllowedDropOperations: () => ['move'],
    // Keyboard users move items with the arrow keys instead of a drag session.
    hasDragButton: true,
    onDragStart: () => onDraggingChange?.(true),
    onDragEnd: () => onDraggingChange?.(false),
  });

  const ownProps = {
    onDragStart: (e: DragEvent<HTMLElement>) => {
      // Show the whole row, not just the handle, under the pointer.
      const row = e.currentTarget.closest(`[${dragRowAttribute}]`);
      if (row) {
        const rect = row.getBoundingClientRect();
        e.dataTransfer.setDragImage(row, e.clientX - rect.x, e.clientY - rect.y);
      }
    },
    onKeyDown: (e: KeyboardEvent<HTMLElement>) => {
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        onStep(e.key === 'ArrowUp' ? -1 : 1);
      }
    },
  };

  return (
    <button
      type="button"
      aria-label={label}
      data-handle={itemKey}
      className={`grid h-11 w-9 flex-none cursor-grab touch-none place-items-center rounded-[10px] text-faint hover:bg-panel hover:text-ink focus-visible:outline-2 focus-visible:outline-accent ${className}`}
      {...mergeProps(dragProps, ownProps)}
    >
      <GripIcon />
    </button>
  );
}

export type DropPosition = 'before' | 'after';

/**
 * Makes an element accept dropped items of a type. `onDrop` gets the key of the
 * dropped item and whether it landed on the upper or the lower half.
 */
export function useDropTarget<T extends HTMLElement>(
  type: string,
  onDrop: (key: string, position: DropPosition) => void,
  /** Drop everything before the element, such as on an "add" button below a list. */
  fixedPosition?: DropPosition,
) {
  const ref = useRef<T>(null);
  const [position, setPosition] = useState<DropPosition | null>(null);
  const positionAt = (y: number): DropPosition =>
    fixedPosition ?? (y < (ref.current?.offsetHeight ?? 0) / 2 ? 'before' : 'after');

  const { dropProps } = useDrop({
    ref,
    getDropOperation: (types) => (types.has(type) ? 'move' : 'cancel'),
    onDropEnter: (e) => setPosition(positionAt(e.y)),
    onDropMove: (e) => setPosition(positionAt(e.y)),
    onDropExit: () => setPosition(null),
    onDrop: (e) => {
      setPosition(null);
      const item = e.items.find((i) => i.kind === 'text' && i.types.has(type));
      if (item?.kind === 'text') {
        const at = positionAt(e.y);
        void item.getText(type).then((key) => onDrop(key, at));
      }
    },
  });

  return { ref, dropProps, position };
}

/** A line that shows where a dragged item will land. Place it in a `relative` element. */
export function DropIndicator({ position }: { position: DropPosition | null }) {
  if (!position) return null;
  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute inset-x-0 h-[3px] rounded-full bg-accent ${
        position === 'before' ? '-top-[5.5px]' : '-bottom-[5.5px]'
      }`}
    />
  );
}
