import { useCallback, useState } from 'react';
import { z } from 'zod';

/**
 * What the user has marked in the cooking view. A new field needs a default,
 * so that a state saved before the field existed still loads.
 */
const CookingState = z.object({
  done: z.array(z.string()).default([]),
  activeStep: z.int().nullable().default(null),
});
export type CookingState = z.infer<typeof CookingState>;

const Saved = z.object({ savedAt: z.number(), state: CookingState });

export const emptyCookingState: CookingState = { done: [], activeStep: null };

/** Long enough for a slow recipe, short enough that the next day starts fresh. */
export const cookingStateLifetimeMs = 12 * 60 * 60 * 1000;

const keyPrefix = 'cooking:';

export function isEmpty(state: CookingState): boolean {
  return state.done.length === 0 && state.activeStep === null;
}

/** Returns the saved state of the recipe, or null if there is none or it has expired. */
export function loadCookingState(
  storage: Storage,
  recipeId: string,
  now = Date.now(),
): CookingState | null {
  const saved = readSaved(storage, keyPrefix + recipeId);
  return saved && !isExpired(saved.savedAt, now) ? saved.state : null;
}

/** Saves the state of the recipe. An empty state removes the entry. */
export function saveCookingState(
  storage: Storage,
  recipeId: string,
  state: CookingState,
  now = Date.now(),
): void {
  const key = keyPrefix + recipeId;
  try {
    if (isEmpty(state)) storage.removeItem(key);
    else storage.setItem(key, JSON.stringify({ savedAt: now, state }));
  } catch {
    // The storage can be full or disabled. The view still works without it.
  }
}

/** Removes the expired and unreadable states of all recipes. */
export function removeExpiredCookingStates(storage: Storage, now = Date.now()): void {
  const keys = Array.from({ length: storage.length }, (_, i) => storage.key(i)).filter(
    (key): key is string => key?.startsWith(keyPrefix) ?? false,
  );
  for (const key of keys) {
    const saved = readSaved(storage, key);
    if (!saved || isExpired(saved.savedAt, now)) storage.removeItem(key);
  }
}

function readSaved(storage: Storage, key: string): z.infer<typeof Saved> | null {
  try {
    const raw = storage.getItem(key);
    if (raw === null) return null;
    const parsed = Saved.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

function isExpired(savedAt: number, now: number): boolean {
  return now - savedAt > cookingStateLifetimeMs;
}

/**
 * The state of the cooking view of a recipe, kept in `localStorage` so that it
 * survives leaving the view. Only a change saves the state, so that opening
 * the view does not extend its lifetime.
 */
export function useCookingState(recipeId: string) {
  const [state, setState] = useState<CookingState>(() => {
    removeExpiredCookingStates(localStorage);
    return loadCookingState(localStorage, recipeId) ?? emptyCookingState;
  });

  const update = useCallback(
    (next: CookingState) => {
      setState(next);
      saveCookingState(localStorage, recipeId, next);
    },
    [recipeId],
  );

  return [state, update] as const;
}
