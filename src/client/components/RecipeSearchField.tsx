import { useNavigate } from '@tanstack/react-router';
import type { KeyboardEvent } from 'react';
import { Button, ComboBox, Input, ListBox, Popover } from 'react-aria-components';
import { useTranslation } from 'react-i18next';

import type { RecipeSummary } from '../../shared/recipe.ts';
import { useBackState } from '../back.tsx';
import {
  maxSuggestions,
  RecipeOption,
  suggestionsPopoverClass,
  useMenuFollowsInput,
} from '../week/RecipeSearch.tsx';
import { CloseIcon, SearchIcon } from './icons.tsx';

/**
 * The search field of the recipe list. While the user types, it suggests the
 * best matching recipes, and selecting one opens the recipe. On a tablet, the
 * on-screen keyboard can hide the recipe grid, but the suggestions show above
 * it. The compact field fits in the app header.
 */
export function RecipeSearchField(props: {
  value: string;
  matches: RecipeSummary[];
  onChange: (value: string) => void;
  compact?: boolean;
}) {
  const { value, matches, onChange, compact = false } = props;
  const { t } = useTranslation();
  const navigate = useNavigate();
  const backState = useBackState('recipe.allRecipes');
  const suggestions = value.trim() ? matches.slice(0, maxSuggestions) : [];

  return (
    <ComboBox
      aria-label={t('list.search')}
      inputValue={value}
      onInputChange={onChange}
      selectedKey={null}
      onSelectionChange={(key) => {
        if (key === null) return;
        void navigate({
          to: '/recipes/$recipeId',
          params: { recipeId: String(key) },
          state: backState,
        });
      }}
      allowsCustomValue
      allowsEmptyCollection={false}
      menuTrigger="input"
      className="relative"
    >
      <SearchInput matchCount={suggestions.length} onClear={() => onChange('')} compact={compact} />
      {/* Above the field, the start of the list can go out of view. */}
      <Popover placement="bottom start" shouldFlip={false} className={suggestionsPopoverClass}>
        <ListBox aria-label={t('list.suggestions')} className="flex flex-col gap-0.5 outline-none">
          {suggestions.map((recipe) => (
            <RecipeOption key={recipe.id} recipe={recipe} />
          ))}
        </ListBox>
      </Popover>
    </ComboBox>
  );
}

const inputClass = {
  normal: 'h-14 rounded-2xl pr-14 pl-13 text-[17px]',
  compact: 'h-11 rounded-full pr-11 pl-12 text-base',
};

const clearClass = { normal: 'right-2 size-11', compact: 'right-1 size-9' };

/** The input of the search field. Enter closes the on-screen keyboard to show the recipe grid. */
function SearchInput(props: { matchCount: number; onClear: () => void; compact: boolean }) {
  const { matchCount, onClear, compact } = props;
  const { t } = useTranslation();
  const state = useMenuFollowsInput(matchCount);
  const variant = compact ? 'compact' : 'normal';
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && state?.selectionManager.focusedKey == null) {
      state?.close();
      e.currentTarget.blur();
    }
  };

  return (
    <div className="relative">
      <SearchIcon
        size={compact ? 20 : 22}
        className="pointer-events-none absolute top-1/2 left-4.5 -translate-y-1/2 text-muted"
      />
      <Input
        type="search"
        enterKeyHint="search"
        onKeyDown={onKeyDown}
        placeholder={t('list.searchPlaceholder')}
        className={`w-full border border-field bg-card outline-accent [&::-webkit-search-cancel-button]:hidden ${inputClass[variant]}`}
      />
      {state?.inputValue && (
        // A button in a combo box opens the menu unless its slot is null.
        <Button
          slot={null}
          aria-label={t('list.clearSearch')}
          onPress={onClear}
          className={`absolute top-1/2 grid -translate-y-1/2 cursor-pointer place-items-center rounded-full text-muted hover:bg-chip ${clearClass[variant]}`}
        >
          <CloseIcon />
        </Button>
      )}
    </div>
  );
}
