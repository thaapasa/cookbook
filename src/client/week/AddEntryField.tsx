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
import { PlusIcon, TextLinesIcon } from '../components/icons.tsx';
import {
  optionClass,
  RecipeOption,
  suggestionsPopoverClass,
  useRecipeSuggestions,
} from './RecipeSearch.tsx';

const textKey = 'add-as-text';

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
  const [input, setInput] = useState('');
  const matches = useRecipeSuggestions(input);

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
      <Popover placement="bottom start" className={suggestionsPopoverClass}>
        <ListBox
          aria-label={t('weekEdit.suggestions')}
          className="flex flex-col gap-0.5 outline-none"
        >
          {matches.map((recipe) => (
            <RecipeOption key={recipe.id} recipe={recipe} />
          ))}
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
  // React Aria closes the menu when the page scrolls, which happens easily on
  // touch screens. The menu moves with the page, so this opens it again in the
  // same event, and React renders it as if it never closed.
  useEffect(() => {
    const onScroll = () => {
      const current = latest.current;
      if (current?.isFocused && current.isOpen) current.open(null, 'input');
    };
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

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
