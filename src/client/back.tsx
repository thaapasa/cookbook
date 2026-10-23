import {
  Link,
  type LinkOptions,
  type NavigateOptions,
  useLocation,
  useRouter,
} from '@tanstack/react-router';
import type { MouseEvent, ReactNode } from 'react';
import { z } from 'zod';

/** Names of the pages that a back link can lead to, as translation keys. */
export type BackLabel = 'common.back' | 'recipe.allRecipes' | 'recipe.weekPlan' | 'weekEdit.title';

/**
 * Search params of the pages that other systems link to. The integration API
 * adds `from=external` to its links. The back links of such a page go back to
 * the other system.
 */
export const ExternalSearch = z.object({
  from: z.literal('external').optional().catch(undefined),
});

/**
 * The page that opened the current page. When this is set in the history
 * state, the previous history entry is that page.
 */
export interface BackTarget {
  href: string;
  label?: BackLabel;
}

/**
 * History state for a link that opens a child page. The back links of the
 * child page then go back in history, which shows this page as it was, with
 * its scroll position.
 */
export function useBackState(label?: BackLabel): { back: BackTarget } {
  const href = useLocation({ select: (location) => location.href });
  return { back: { href, label } };
}

/**
 * The page that opened the current page, if it is the previous history entry.
 * For a page opened from another system, that system's page, if the browser
 * has a page to go back to.
 */
export function useBackTarget(): BackTarget | undefined {
  const back = useLocation({ select: (location) => location.state.back });
  const external = useLocation({
    select: (location) => 'from' in location.search && location.search.from === 'external',
  });
  if (back) return back;
  // A new tab has only the current page in its history.
  if (external && window.history.length > 1) {
    return { href: document.referrer, label: 'common.back' };
  }
  return undefined;
}

/**
 * A back, close or cancel link. Goes back in history to the page that opened
 * the current page, or to the fallback when the page was opened some other way.
 */
export function BackLink(props: {
  fallback: LinkOptions;
  className?: string;
  'aria-label'?: string;
  children: ReactNode;
}) {
  const { fallback, ...rest } = props;
  const router = useRouter();
  const back = useBackTarget();
  if (!back) return <Link {...fallback} {...rest} />;

  const onClick = (e: MouseEvent) => {
    // Other clicks open the link in a new tab or window.
    if (e.button !== 0 || e.metaKey || e.altKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault();
    router.history.back();
  };
  // The referrer of a page opened from another system can be empty.
  const href = back.href || router.buildLocation(fallback).href;
  return <a href={href} onClick={onClick} {...rest} />;
}

/**
 * Navigation after an action, such as saving. Goes back to the page that
 * opened the current page, or replaces the current page with the fallback.
 */
export function useGoBack() {
  const router = useRouter();
  const back = useBackTarget();
  return async (fallback: NavigateOptions) => {
    if (back) router.history.back();
    else await router.navigate({ ...fallback, replace: true });
  };
}
