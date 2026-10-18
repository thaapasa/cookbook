import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { type KeyboardEvent, useContext, useEffect, useRef, useState } from 'react';
import {
  ComboBox,
  ComboBoxStateContext,
  Input,
  ListBox,
  ListBoxItem,
  Popover,
  Separator,
} from 'react-aria-components';
import { useTranslation } from 'react-i18next';

import type { RecipeSummary } from '../../shared/recipe.ts';
import { recipeListQuery } from '../api.ts';
import { PlusIcon, TextLinesIcon } from '../components/icons.tsx';
import { RecipeThumb } from '../components/RecipePhoto.tsx';
import { useFormatMinutes } from '../format.ts';

const maxSuggestions = 5;
const textKey = 'add-as-text';

function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
  return debounced;
}

/**
 * A field that adds an entry. It suggests matching recipes, and Enter adds the
 * typed text without a recipe link.
 */
export function AddEntryField(props: {
  label: string;
  onAddRecipe: (recipe: RecipeSummary) => void;
  onAddText: (text: string) => void;
}) {
  const { label, onAddRecipe, onAddText } = props;
  const { t } = useTranslation();
  const formatMinutes = useFormatMinutes();
  const [input, setInput] = useState('');
  const query = useDebounced(input.trim(), 200);
  const search = useQuery({
    ...recipeListQuery({ q: query }),
    enabled: query !== '',
    placeholderData: keepPreviousData,
  });
  const matches =
    input.trim() && query ? (search.data?.recipes ?? []).slice(0, maxSuggestions) : [];

  const addText = () => {
    const text = input.trim();
    if (text) onAddText(text);
    setInput('');
  };

  return (
    <ComboBox
      aria-label={label}
      inputValue={input}
      onInputChange={setInput}
      selectedKey={null}
      onSelectionChange={(key) => {
        if (key === null) return;
        const recipe = matches.find((r) => r.id === key);
        if (recipe) {
          onAddRecipe(recipe);
          setInput('');
        } else if (key === textKey) addText();
      }}
      allowsCustomValue
      allowsEmptyCollection={false}
      menuTrigger="input"
      className="relative"
    >
      <EntryInput onEnter={addText} />
      <Popover
        placement="bottom start"
        className="w-(--trigger-width) rounded-[14px] border border-line bg-card p-1.5 shadow-[0_12px_28px_var(--color-shadow)]"
      >
        <ListBox
          aria-label={t('weekEdit.suggestions')}
          className="flex flex-col gap-0.5 outline-none"
        >
          {matches.map((recipe) => {
            const minutes = recipe.totalMinutes ?? recipe.activeMinutes;
            return (
              <ListBoxItem
                key={recipe.id}
                id={recipe.id}
                textValue={recipe.title}
                className={optionClass}
              >
                <RecipeThumb
                  recipeId={recipe.id}
                  photoUrl={recipe.photoUrl}
                  className="size-9 rounded-[9px]"
                />
                <span className="truncate font-semibold">{recipe.title}</span>
                <span className="text-sm text-muted">
                  {minutes !== null && formatMinutes(minutes)}
                </span>
              </ListBoxItem>
            );
          })}
          {matches.length > 0 && <Separator className="mx-1.5 my-1 h-px border-0 bg-line-soft" />}
          {input.trim() && (
            <ListBoxItem id={textKey} textValue={input} className={optionClass}>
              <span
                aria-hidden="true"
                className="grid size-9 place-items-center rounded-[9px] border-[1.5px] border-dashed border-dashed-line text-faint"
              >
                <TextLinesIcon size={16} />
              </span>
              <span className="truncate">
                {t('weekEdit.addText')} <strong className="font-semibold">“{input.trim()}”</strong>
              </span>
              <span className="text-[13px] text-muted">Enter</span>
            </ListBoxItem>
          )}
        </ListBox>
      </Popover>
    </ComboBox>
  );
}

const optionClass =
  'grid min-h-12 cursor-pointer grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-3 rounded-[10px] px-2.5 py-1.5 outline-none data-focused:bg-panel';

/** The input of the field. Enter adds the typed text unless the user moved to a suggestion. */
function EntryInput({ onEnter }: { onEnter: () => void }) {
  const { t } = useTranslation();
  const state = useContext(ComboBoxStateContext);
  const input = state?.inputValue ?? '';
  const latest = useRef(state);
  useEffect(() => {
    latest.current = state;
  });
  // The combo box opens the menu only if it had items before the input changed.
  // The items here depend on the input, so this opens the menu one frame later,
  // when the combo box has the new items.
  useEffect(() => {
    if (!input.trim()) return;
    const frame = requestAnimationFrame(() => {
      const current = latest.current;
      if (current?.isFocused && !current.isOpen) current.open(null, 'input');
    });
    return () => cancelAnimationFrame(frame);
  }, [input]);

  const onKeyDownCapture = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && state?.selectionManager.focusedKey == null) {
      e.preventDefault();
      e.stopPropagation();
      state?.close();
      onEnter();
    }
  };

  return (
    <div onKeyDownCapture={onKeyDownCapture} className="relative">
      <PlusIcon className="pointer-events-none absolute top-3.25 left-3.5 text-faint" />
      <Input
        placeholder={t('weekEdit.addPlaceholder')}
        className="min-h-11 w-full rounded-xl border border-dashed border-field bg-field-soft py-2.25 pr-3.5 pl-10 text-base text-ink focus:border-accent focus:border-solid focus:outline-2 focus:outline-offset-1 focus:outline-accent"
      />
    </div>
  );
}
