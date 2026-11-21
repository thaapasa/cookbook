import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useContext, useEffect, useRef, useState } from 'react';
import { ComboBoxStateContext, ListBoxItem } from 'react-aria-components';

import type { RecipeSummary } from '../../shared/recipe.ts';
import { recipeListQuery } from '../api.ts';
import { RecipeThumb } from '../components/RecipePhoto.tsx';
import { useFormatMinutes } from '../format.ts';

export const maxSuggestions = 5;

export const optionClass =
  'grid min-h-12 cursor-pointer grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-3 rounded-[10px] px-2.5 py-1.5 outline-none data-focused:bg-panel';

export const suggestionsPopoverClass =
  'w-(--trigger-width) max-h-none! rounded-[14px] border border-line bg-card p-1.5 shadow-[0_12px_28px_var(--color-shadow)]';

function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
  return debounced;
}

/** Returns the recipes that match the typed text, after a short pause in typing. */
export function useRecipeSuggestions(input: string): RecipeSummary[] {
  const query = useDebounced(input.trim(), 200);
  const search = useQuery({
    ...recipeListQuery({ q: query, page: 1 }),
    enabled: query !== '',
    placeholderData: keepPreviousData,
  });
  return input.trim() && query ? (search.data?.recipes ?? []).slice(0, maxSuggestions) : [];
}

/**
 * Keeps the suggestions of a combo box open while the user types. Call it in
 * a child of the `ComboBox`, and pass the number of suggestions.
 */
export function useMenuFollowsInput(itemCount: number) {
  const state = useContext(ComboBoxStateContext);
  const input = state?.inputValue ?? '';
  const latest = useRef(state);
  useEffect(() => {
    latest.current = state;
  });
  // The combo box opens the menu only if it had items before the input changed.
  // The items depend on the input and arrive later, so this opens the menu one
  // frame after the input or the items change, when the combo box has the items.
  useEffect(() => {
    if (!input.trim()) return;
    const frame = requestAnimationFrame(() => {
      const current = latest.current;
      if (current?.isFocused && !current.isOpen) current.open(null, 'input');
    });
    return () => cancelAnimationFrame(frame);
  }, [input, itemCount]);
  // React Aria closes the menu when the page scrolls, which happens easily on
  // touch screens and when the on-screen keyboard opens. The menu moves with
  // the page, so this opens it again in the same event, and React renders it as
  // if it never closed.
  useEffect(() => {
    const onScroll = () => {
      const current = latest.current;
      if (current?.isFocused && current.isOpen) current.open(null, 'input');
    };
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return state;
}

/** A suggested recipe in a list box, with its photo, title and time. */
export function RecipeOption({ recipe }: { recipe: RecipeSummary }) {
  const formatMinutes = useFormatMinutes();
  const minutes = recipe.totalMinutes ?? recipe.activeMinutes;
  return (
    <ListBoxItem id={recipe.id} textValue={recipe.title} className={optionClass}>
      <RecipeThumb recipeId={recipe.id} photo={recipe.photo} className="size-9 rounded-[9px]" />
      <span className="truncate font-semibold">{recipe.title}</span>
      <span className="text-sm text-muted">{minutes !== null && formatMinutes(minutes)}</span>
    </ListBoxItem>
  );
}
