import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { ListBoxItem } from 'react-aria-components';

import type { RecipeSummary } from '../../shared/recipe.ts';
import { recipeListQuery } from '../api.ts';
import { RecipeThumb } from '../components/RecipePhoto.tsx';
import { useFormatMinutes } from '../format.ts';

const maxSuggestions = 5;

export const optionClass =
  'grid min-h-12 cursor-pointer grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-3 rounded-[10px] px-2.5 py-1.5 outline-none data-focused:bg-panel';

export const suggestionsPopoverClass =
  'w-(--trigger-width) rounded-[14px] border border-line bg-card p-1.5 shadow-[0_12px_28px_var(--color-shadow)]';

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
    ...recipeListQuery({ q: query }),
    enabled: query !== '',
    placeholderData: keepPreviousData,
  });
  return input.trim() && query ? (search.data?.recipes ?? []).slice(0, maxSuggestions) : [];
}

/** A suggested recipe in a list box, with its photo, title and time. */
export function RecipeOption({ recipe }: { recipe: RecipeSummary }) {
  const formatMinutes = useFormatMinutes();
  const minutes = recipe.totalMinutes ?? recipe.activeMinutes;
  return (
    <ListBoxItem id={recipe.id} textValue={recipe.title} className={optionClass}>
      <RecipeThumb recipeId={recipe.id} photoUrl={recipe.photoUrl} className="size-9 rounded-[9px]" />
      <span className="truncate font-semibold">{recipe.title}</span>
      <span className="text-sm text-muted">{minutes !== null && formatMinutes(minutes)}</span>
    </ListBoxItem>
  );
}
