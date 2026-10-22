import {
  Link,
  type LinkOptions,
  type NavigateOptions,
  useLocation,
  useRouter,
} from '@tanstack/react-router';
import type { MouseEvent, ReactNode } from 'react';

/** Names of the pages that a back link can lead to, as translation keys. */
export type BackLabel = 'recipe.allRecipes' | 'recipe.weekPlan' | 'weekEdit.title';

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

/** The page that opened the current page, if it is the previous history entry. */
export function useBackTarget(): BackTarget | undefined {
  return useLocation({ select: (location) => location.state.back });
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
  return <a href={back.href} onClick={onClick} {...rest} />;
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
