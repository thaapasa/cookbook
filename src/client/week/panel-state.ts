import { useCallback, useState } from 'react';
import { z } from 'zod';

import { addDays, IsoDate, weekStart } from '../../shared/week-plan.ts';
import { currentWeekStart } from './dates.ts';

/** Whether the week panel of the recipe list is open, and the start of the week it shows. */
const PanelState = z.object({ open: z.boolean(), start: IsoDate });
export type PanelState = z.infer<typeof PanelState>;

const Saved = z.object({ savedAt: z.number(), state: PanelState });

/** Long enough for one planning session. After a break, the panel starts on next week again. */
export const panelStateLifetimeMs = 24 * 60 * 60 * 1000;

const storageKey = 'week-panel';

export function defaultPanelState(): PanelState {
  return { open: false, start: addDays(currentWeekStart(), 7) };
}

/** Returns the saved state, or null if there is none or it has expired. */
export function loadPanelState(storage: Storage, now = Date.now()): PanelState | null {
  try {
    const raw = storage.getItem(storageKey);
    if (raw === null) return null;
    const saved = Saved.safeParse(JSON.parse(raw));
    if (!saved.success || now - saved.data.savedAt > panelStateLifetimeMs) return null;
    const { open, start } = saved.data.state;
    return { open, start: weekStart(start) };
  } catch {
    return null;
  }
}

export function savePanelState(storage: Storage, state: PanelState, now = Date.now()): void {
  try {
    storage.setItem(storageKey, JSON.stringify({ savedAt: now, state }));
  } catch {
    // The storage can be full or disabled. The panel still works without it.
  }
}

/**
 * The state of the week panel, kept in `localStorage` so that it stays when the
 * user opens a recipe and comes back. `touch` marks the panel as used, so that
 * edits keep the state alive too.
 */
export function usePanelState() {
  const [state, setState] = useState<PanelState>(
    () => loadPanelState(localStorage) ?? defaultPanelState(),
  );

  const update = useCallback((next: PanelState) => {
    setState(next);
    savePanelState(localStorage, next);
  }, []);
  const touch = useCallback(() => savePanelState(localStorage, state), [state]);

  return { ...state, update, touch };
}
