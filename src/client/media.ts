import { useSyncExternalStore } from 'react';

/**
 * From this width up, the recipe search is in the app header instead of on
 * the recipe list page. The same as the `md` breakpoint of Tailwind.
 */
export const headerSearchMedia = '(min-width: 48rem)';

/** Tells whether the window matches a media query, and updates when that changes. */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const media = window.matchMedia(query);
      media.addEventListener('change', onChange);
      return () => media.removeEventListener('change', onChange);
    },
    () => window.matchMedia(query).matches,
  );
}
