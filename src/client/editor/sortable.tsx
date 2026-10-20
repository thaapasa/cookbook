import {
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

import { GripIcon } from '../components/icons.tsx';

/** Marks the element that is shown under the pointer while its handle is dragged. */
export const dragRowAttribute = 'data-drag-row';

/** Focuses the drag handle of an item after the next render. */
export function focusHandle(key: string) {
  requestAnimationFrame(() => {
    document.querySelector<HTMLElement>(`[data-handle="${CSS.escape(key)}"]`)?.focus();
  });
}

/** How far the pointer moves before a press turns into a drag, in pixels. */
const dragThreshold = 4;
/** Dragging this close to the top or bottom of the window scrolls it, in pixels. */
const scrollZone = 60;
const maxScrollSpeed = 16;

interface DropTarget {
  type: string;
  ref: { current: HTMLElement | null };
  positionAt: (clientY: number) => DropPosition;
  setPosition: (position: DropPosition | null) => void;
  onDrop: (key: string, position: DropPosition) => void;
}

const dropTargets = new Set<DropTarget>();

function dropTargetAt(type: string, x: number, y: number): DropTarget | undefined {
  const hit = document.elementFromPoint(x, y);
  if (!hit) return undefined;
  for (const target of dropTargets) {
    if (target.type === type && target.ref.current?.contains(hit)) return target;
  }
  return undefined;
}

/** Copies the row under the pointer, with the current values of its fields. */
function createGhost(row: HTMLElement) {
  const rect = row.getBoundingClientRect();
  const ghost = row.cloneNode(true) as HTMLElement;
  const sources = row.querySelectorAll<HTMLInputElement>('input, textarea, select');
  ghost.querySelectorAll<HTMLInputElement>('input, textarea, select').forEach((field, i) => {
    field.value = sources[i]?.value ?? '';
  });
  ghost.querySelectorAll('[id], [data-handle]').forEach((el) => {
    el.removeAttribute('id');
    el.removeAttribute('data-handle');
  });
  ghost.setAttribute('aria-hidden', 'true');
  Object.assign(ghost.style, {
    position: 'fixed',
    left: `${rect.left}px`,
    top: `${rect.top}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    margin: '0',
    pointerEvents: 'none',
    zIndex: '50',
    opacity: '0.9',
    boxShadow: '0 8px 24px rgb(0 0 0 / 0.18)',
  });
  document.body.appendChild(ghost);
  return ghost;
}

/**
 * A drag handle for an item. Dragging it with a mouse, finger or pen moves the
 * item onto a `useDropTarget`. The arrow keys move the item up and down.
 */
export function DragHandle(props: {
  /** Drop targets accept items of the same type, such as `application/x-cookbook-ingredient`. */
  type: string;
  itemKey: string;
  label: string;
  onStep: (direction: -1 | 1) => void;
  onDraggingChange?: (dragging: boolean) => void;
  className?: string;
}) {
  const { type, itemKey, label, onStep, onDraggingChange, className = '' } = props;
  const latest = useRef({ type, itemKey, onDraggingChange });
  useLayoutEffect(() => {
    latest.current = { type, itemKey, onDraggingChange };
  });
  const cleanup = useRef<(() => void) | null>(null);
  useEffect(() => () => cleanup.current?.(), []);

  const onPointerDown = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    cleanup.current?.();
    const handle = e.currentTarget;
    const pointerId = e.pointerId;
    const startX = e.clientX;
    const startY = e.clientY;
    let x = startX;
    let y = startY;
    let ghost: HTMLElement | null = null;
    let target: DropTarget | undefined;
    let scrollFrame = 0;
    handle.setPointerCapture(pointerId);

    const updateTarget = () => {
      const next = dropTargetAt(latest.current.type, x, y);
      if (next !== target) target?.setPosition(null);
      target = next;
      target?.setPosition(target.positionAt(y));
    };

    const autoScroll = () => {
      scrollFrame = 0;
      const speed =
        y < scrollZone
          ? -(scrollZone - y)
          : y > window.innerHeight - scrollZone
            ? y - (window.innerHeight - scrollZone)
            : 0;
      if (speed === 0) return;
      window.scrollBy(0, Math.round((speed / scrollZone) * maxScrollSpeed));
      updateTarget();
      scrollFrame = requestAnimationFrame(autoScroll);
    };

    const start = () => {
      const row = handle.closest<HTMLElement>(`[${dragRowAttribute}]`) ?? handle;
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'grabbing';
      latest.current.onDraggingChange?.(true);
      return createGhost(row);
    };

    const onMove = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      x = ev.clientX;
      y = ev.clientY;
      if (!ghost) {
        if (Math.hypot(x - startX, y - startY) < dragThreshold) return;
        ghost = start();
      }
      ghost.style.transform = `translate(${x - startX}px, ${y - startY}px)`;
      updateTarget();
      if (!scrollFrame) scrollFrame = requestAnimationFrame(autoScroll);
    };

    const finish = (drop: boolean) => {
      const dropOn = drop ? target : undefined;
      const position = dropOn?.positionAt(y);
      end();
      if (dropOn && position) dropOn.onDrop(latest.current.itemKey, position);
    };
    const onUp = (ev: PointerEvent) => ev.pointerId === pointerId && finish(true);
    const onCancel = (ev: PointerEvent) => ev.pointerId === pointerId && finish(false);
    const onKey = (ev: globalThis.KeyboardEvent) => {
      if (ev.key === 'Escape' && ghost) {
        ev.preventDefault();
        finish(false);
      }
    };

    const end = () => {
      cleanup.current = null;
      handle.removeEventListener('pointermove', onMove);
      handle.removeEventListener('pointerup', onUp);
      handle.removeEventListener('pointercancel', onCancel);
      window.removeEventListener('keydown', onKey, true);
      if (handle.hasPointerCapture(pointerId)) handle.releasePointerCapture(pointerId);
      cancelAnimationFrame(scrollFrame);
      target?.setPosition(null);
      if (ghost) {
        ghost.remove();
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
        latest.current.onDraggingChange?.(false);
      }
    };

    handle.addEventListener('pointermove', onMove);
    handle.addEventListener('pointerup', onUp);
    handle.addEventListener('pointercancel', onCancel);
    window.addEventListener('keydown', onKey, true);
    cleanup.current = end;
  };

  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      onStep(e.key === 'ArrowUp' ? -1 : 1);
    }
  };

  return (
    <button
      type="button"
      aria-label={label}
      data-handle={itemKey}
      className={`grid h-11 w-9 flex-none cursor-grab touch-none place-items-center rounded-[10px] text-faint select-none [-webkit-touch-callout:none] hover:bg-panel hover:text-ink focus-visible:outline-2 focus-visible:outline-accent ${className}`}
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
      onContextMenu={(e) => e.preventDefault()}
    >
      <GripIcon />
    </button>
  );
}

export type DropPosition = 'before' | 'after';

/**
 * Makes an element accept dragged items of a type. Attach `ref` to the element.
 * `onDrop` gets the key of the dropped item and whether it landed on the upper
 * or the lower half.
 */
export function useDropTarget<T extends HTMLElement>(
  type: string,
  onDrop: (key: string, position: DropPosition) => void,
  /** Drop everything before the element, such as on an "add" button below a list. */
  fixedPosition?: DropPosition,
) {
  const ref = useRef<T>(null);
  const [position, setPosition] = useState<DropPosition | null>(null);
  const latest = useRef({ onDrop, fixedPosition });
  useLayoutEffect(() => {
    latest.current = { onDrop, fixedPosition };
  });

  useEffect(() => {
    const target: DropTarget = {
      type,
      ref,
      positionAt: (clientY) => {
        if (latest.current.fixedPosition) return latest.current.fixedPosition;
        const rect = ref.current?.getBoundingClientRect();
        return rect && clientY < rect.top + rect.height / 2 ? 'before' : 'after';
      },
      setPosition,
      onDrop: (key, at) => latest.current.onDrop(key, at),
    };
    dropTargets.add(target);
    return () => {
      dropTargets.delete(target);
    };
  }, [type]);

  return { ref, position };
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
