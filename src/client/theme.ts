import { useSyncExternalStore } from 'react';

/** The color theme chosen by the user. `system` follows the OS setting. */
export type ThemeMode = 'system' | 'light' | 'dark';

export const themeModes: readonly ThemeMode[] = ['system', 'light', 'dark'];

// index.html reads the same key before the app loads.
const storageKey = 'theme';
const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
const listeners = new Set<() => void>();

function readMode(): ThemeMode {
  try {
    const stored = localStorage.getItem(storageKey);
    return themeModes.includes(stored as ThemeMode) ? (stored as ThemeMode) : 'system';
  } catch {
    return 'system';
  }
}

let mode = readMode();

function apply() {
  const dark = mode === 'dark' || (mode === 'system' && darkQuery.matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
}

darkQuery.addEventListener('change', apply);
apply();

export function setThemeMode(next: ThemeMode) {
  mode = next;
  try {
    if (next === 'system') localStorage.removeItem(storageKey);
    else localStorage.setItem(storageKey, next);
  } catch {
    // The choice then lasts only until the page is reloaded.
  }
  apply();
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useThemeMode(): ThemeMode {
  return useSyncExternalStore(subscribe, () => mode);
}
