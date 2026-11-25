import {
  type KeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
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
/** How long a finger rests on a long-press source before the drag starts, in milliseconds. */
const longPressMs = 350;
/** Dragging this close to the top or bottom of the window scrolls it, in pixels. */
const scrollZone = 60;
const maxScrollSpeed = 16;

interface DropTarget {
  types: readonly string[];
  ref: { current: HTMLElement | null };
  positionAt: (clientY: number) => DropPosition;
  setPosition: (position: DropPosition | null) => void;
  onDrop: (key: string, position: DropPosition, type: string) => void;
}

const dropTargets = new Set<DropTarget>();

function dropTargetAt(type: string, x: number, y: number): DropTarget | undefined {
  const hit = document.elementFromPoint(x, y);
  if (!hit) return undefined;
  for (const target of dropTargets) {
    if (target.types.includes(type) && target.ref.current?.contains(hit)) return target;
  }
  return undefined;
}

/** The type of the item that is being dragged, so drop targets can show that they take it. */
let activeType: string | null = null;
const activeTypeListeners = new Set<() => void>();

function setActiveType(type: string | null) {
  activeType = type;
  activeTypeListeners.forEach((listener) => listener());
}

/** Returns the type of the item that is being dragged, or null when nothing is. */
export function useActiveDragType(): string | null {
  return useSyncExternalStore(
    (onChange) => {
      activeTypeListeners.add(onChange);
      return () => activeTypeListeners.delete(onChange);
    },
    () => activeType,
  );
}

/**
 * Copies the row under the pointer, with the current values of its fields. A
 * `scale` below 1 shrinks the copy around the pointer.
 */
function createGhost(row: HTMLElement, pointerX: number, pointerY: number, scale: number) {
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
    transformOrigin: `${pointerX - rect.left}px ${pointerY - rect.top}px`,
    transform: `scale(${scale})`,
    transition: 'none',
  });
  document.body.appendChild(ghost);
  return ghost;
}

/**
 * Makes an element draggable onto a `useDropTarget` with a mouse, finger or
 * pen. Spread the returned handlers on the element. A press on a button or a
 * field inside the element doesn't start a drag.
 */
export function useDragSource(options: {
  /** Drop targets accept items of the same type, such as `application/x-cookbook-ingredient`. */
  type: string;
  itemKey: string;
  /**
   * On a touchscreen, wait for a long press before the drag starts, so that a
   * swipe over the element still scrolls the page.
   */
  longPress?: boolean;
  /** The size of the dragged copy compared to the element. */
  ghostScale?: number;
  disabled?: boolean;
  onDraggingChange?: (dragging: boolean) => void;
}) {
  const latest = useRef(options);
  useLayoutEffect(() => {
    latest.current = options;
  });
  const cleanup = useRef<(() => void) | null>(null);
  // Set when a press turned into a drag, so the click that follows doesn't open a link.
  const dragged = useRef(false);
  useEffect(() => () => cleanup.current?.(), []);

  const onPointerDown = (e: ReactPointerEvent<HTMLElement>) => {
    if (latest.current.disabled) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const source = e.currentTarget;
    const control = (e.target as Element).closest('button, input, textarea, select');
    if (control && control !== source && source.contains(control)) return;
    cleanup.current?.();
    dragged.current = false;
    const pointerId = e.pointerId;
    const startX = e.clientX;
    const startY = e.clientY;
    const waitForPress = e.pointerType === 'touch' && latest.current.longPress;
    let x = startX;
    let y = startY;
    let ghost: HTMLElement | null = null;
    let target: DropTarget | undefined;
    let scrollFrame = 0;
    let pressTimer = 0;
    const scale = latest.current.ghostScale ?? 1;

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
      const row = source.closest<HTMLElement>(`[${dragRowAttribute}]`) ?? source;
      dragged.current = true;
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'grabbing';
      setActiveType(latest.current.type);
      latest.current.onDraggingChange?.(true);
      ghost = createGhost(row, startX, startY, scale);
      moveGhost();
    };

    const moveGhost = () => {
      if (ghost)
        ghost.style.transform = `translate(${x - startX}px, ${y - startY}px) scale(${scale})`;
    };

    const onMove = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      x = ev.clientX;
      y = ev.clientY;
      if (!ghost) {
        if (Math.hypot(x - startX, y - startY) < dragThreshold) return;
        // The finger moved before the long press ended, so the user is scrolling.
        if (waitForPress) return end();
        start();
      }
      moveGhost();
      updateTarget();
      if (!scrollFrame) scrollFrame = requestAnimationFrame(autoScroll);
    };

    const finish = (drop: boolean) => {
      const dropOn = drop ? target : undefined;
      const position = dropOn?.positionAt(y);
      end();
      if (dropOn && position) dropOn.onDrop(latest.current.itemKey, position, latest.current.type);
    };
    const onUp = (ev: PointerEvent) => ev.pointerId === pointerId && finish(true);
    const onCancel = (ev: PointerEvent) => ev.pointerId === pointerId && finish(false);
    // Without this, the browser takes over the touch for scrolling once the drag starts.
    const onTouchMove = (ev: TouchEvent) => {
      if (ghost && ev.cancelable) ev.preventDefault();
    };
    const onKey = (ev: globalThis.KeyboardEvent) => {
      if (ev.key === 'Escape' && ghost) {
        ev.preventDefault();
        finish(false);
      }
    };

    // The listeners are on the window, so the drag goes on when the pointer leaves the element.
    const end = () => {
      cleanup.current = null;
      clearTimeout(pressTimer);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
      window.removeEventListener('keydown', onKey, true);
      source.removeEventListener('touchmove', onTouchMove);
      cancelAnimationFrame(scrollFrame);
      target?.setPosition(null);
      if (ghost) {
        ghost.remove();
        ghost = null;
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
        setActiveType(null);
        latest.current.onDraggingChange?.(false);
      }
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
    window.addEventListener('keydown', onKey, true);
    source.addEventListener('touchmove', onTouchMove, { passive: false });
    if (waitForPress) pressTimer = window.setTimeout(start, longPressMs);
    cleanup.current = end;
  };

  const onClickCapture = (e: ReactMouseEvent<HTMLElement>) => {
    if (!dragged.current) return;
    dragged.current = false;
    e.preventDefault();
    e.stopPropagation();
  };

  return {
    onPointerDown,
    onClickCapture,
    // A long press on a touchscreen would open the context menu of a link or a photo.
    onContextMenu: (e: ReactMouseEvent<HTMLElement>) => {
      if (!latest.current.disabled) e.preventDefault();
    },
    // The browser's own drag of links and photos would end the pointer events.
    onDragStart: (e: ReactMouseEvent<HTMLElement>) => {
      if (!latest.current.disabled) e.preventDefault();
    },
  };
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
  const drag = useDragSource({ type, itemKey, onDraggingChange });

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
      onPointerDown={drag.onPointerDown}
      onKeyDown={onKeyDown}
      onContextMenu={(e) => e.preventDefault()}
    >
      <GripIcon />
    </button>
  );
}

export type DropPosition = 'before' | 'after';

/**
 * Makes an element accept dragged items of one or more types. Attach `ref` to
 * the element. `onDrop` gets the key and the type of the dropped item, and
 * whether it landed on the upper or the lower half.
 */
export function useDropTarget<T extends HTMLElement>(
  type: string | readonly string[],
  onDrop: (key: string, position: DropPosition, type: string) => void,
  /** Drop everything before the element, such as on an "add" button below a list. */
  fixedPosition?: DropPosition,
) {
  const ref = useRef<T>(null);
  const [position, setPosition] = useState<DropPosition | null>(null);
  const latest = useRef({ onDrop, fixedPosition });
  useLayoutEffect(() => {
    latest.current = { onDrop, fixedPosition };
  });
  const typeKey = typeof type === 'string' ? type : type.join(' ');

  useEffect(() => {
    const target: DropTarget = {
      types: typeKey.split(' '),
      ref,
      positionAt: (clientY) => {
        if (latest.current.fixedPosition) return latest.current.fixedPosition;
        const rect = ref.current?.getBoundingClientRect();
        return rect && clientY < rect.top + rect.height / 2 ? 'before' : 'after';
      },
      setPosition,
      onDrop: (key, at, droppedType) => latest.current.onDrop(key, at, droppedType),
    };
    dropTargets.add(target);
    return () => {
      dropTargets.delete(target);
    };
  }, [typeKey]);

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
