import { parseDate } from '@internationalized/date';
import { useRef, useState } from 'react';
import {
  Autocomplete,
  Button,
  Calendar,
  CalendarCell,
  CalendarGrid,
  Dialog,
  Heading,
  I18nProvider,
  Input,
  ListBox,
  Menu,
  MenuItem,
  MenuTrigger,
  Popover,
  SearchField,
} from 'react-aria-components';
import { useTranslation } from 'react-i18next';

import type { RecipeSummary } from '../../shared/recipe.ts';
import { type WeekPlanEntry, weekStartDay } from '../../shared/week-plan.ts';
import { ChevronLeftIcon, ChevronRightIcon, MoreIcon, SearchIcon } from '../components/icons.tsx';
import type { EntryUpdate } from './changes.ts';
import { RecipeOption, useRecipeSuggestions } from './RecipeSearch.tsx';

const weekdays = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

const popoverClass =
  'rounded-2xl border border-line-soft bg-card p-1.5 shadow-[0_10px_28px_var(--color-shadow)]';

const itemClass =
  'flex min-h-11 cursor-pointer items-center rounded-xl px-3 text-[15px] font-semibold outline-none data-focused:bg-chip';

/**
 * A menu of the less common actions on an entry: linking it to a recipe,
 * removing the link and moving it to any date.
 */
export function EntryMenu(props: {
  entry: WeekPlanEntry;
  onUpdate: (update: Omit<EntryUpdate, 'id'>) => void;
}) {
  const { entry, onUpdate } = props;
  const { t } = useTranslation();
  const trigger = useRef<HTMLButtonElement>(null);
  const [panel, setPanel] = useState<'recipe' | 'date' | null>(null);

  const link = (recipe: RecipeSummary) => {
    setPanel(null);
    if (recipe.id === entry.recipe?.id) return;
    const { id, title, activeMinutes, totalMinutes, photoUrl } = recipe;
    onUpdate({
      recipeId: id,
      recipe: { id, title, activeMinutes, totalMinutes, photoUrl },
      // Text that the user wrote stays. Text that came from the old recipe follows the new one.
      ...(entry.text === entry.recipe?.title ? { text: title } : {}),
    });
  };
  const move = (date: string) => {
    setPanel(null);
    if (date !== entry.date) onUpdate({ date });
  };

  return (
    <>
      <MenuTrigger>
        <Button
          ref={trigger}
          aria-label={t('weekEdit.actions', { name: entry.text })}
          className="grid size-11 cursor-pointer place-items-center rounded-xl text-muted hover:bg-chip hover:text-ink"
        >
          <MoreIcon />
        </Button>
        <Popover placement="bottom end" className={`min-w-52 ${popoverClass}`}>
          <Menu
            className="outline-none"
            onAction={(key) => {
              if (key === 'unlink') onUpdate({ recipeId: null, recipe: null });
              else setPanel(key as 'recipe' | 'date');
            }}
          >
            <MenuItem id="recipe" className={itemClass}>
              {entry.recipe ? t('weekEdit.changeRecipe') : t('weekEdit.linkRecipe')}
            </MenuItem>
            {entry.recipe && (
              <MenuItem id="unlink" className={itemClass}>
                {t('weekEdit.unlinkRecipe')}
              </MenuItem>
            )}
            <MenuItem id="date" className={itemClass}>
              {t('weekEdit.moveToDate')}
            </MenuItem>
          </Menu>
        </Popover>
      </MenuTrigger>
      <Popover
        triggerRef={trigger}
        isOpen={panel !== null}
        onOpenChange={(open) => !open && setPanel(null)}
        placement="bottom end"
        className={`w-[min(360px,calc(100vw-24px))] ${popoverClass} p-3`}
      >
        <Dialog
          aria-label={
            panel === 'date'
              ? t('weekEdit.moveToDateOf', { name: entry.text })
              : t('weekEdit.recipeFor', { name: entry.text })
          }
          className="outline-none"
        >
          {panel === 'date' ? (
            <DatePanel date={entry.date} onPick={move} />
          ) : (
            <RecipePanel onPick={link} />
          )}
        </Dialog>
      </Popover>
    </>
  );
}

/** A search field with the matching recipes listed under it. */
function RecipePanel({ onPick }: { onPick: (recipe: RecipeSummary) => void }) {
  const { t } = useTranslation();
  const [input, setInput] = useState('');
  const matches = useRecipeSuggestions(input);

  return (
    <Autocomplete inputValue={input} onInputChange={setInput}>
      <SearchField aria-label={t('weekEdit.searchRecipe')} autoFocus className="relative">
        <SearchIcon className="pointer-events-none absolute top-3.25 left-3.5 text-faint" />
        <Input
          placeholder={t('weekEdit.searchRecipe')}
          className="min-h-11 w-full rounded-xl border border-field bg-card py-2.25 pr-3.5 pl-10 text-base text-ink focus:border-accent focus:outline-2 focus:outline-offset-1 focus:outline-accent"
        />
      </SearchField>
      <ListBox
        aria-label={t('weekEdit.suggestions')}
        onAction={(key) => {
          const recipe = matches.find((r) => r.id === key);
          if (recipe) onPick(recipe);
        }}
        renderEmptyState={() => (
          <p className="px-2.5 py-3 text-[15px] text-muted">
            {input.trim() ? t('weekEdit.noRecipes') : t('weekEdit.searchHint')}
          </p>
        )}
        className="mt-1.5 flex flex-col gap-0.5 outline-none"
      >
        {matches.map((recipe) => (
          <RecipeOption key={recipe.id} recipe={recipe} />
        ))}
      </ListBox>
    </Autocomplete>
  );
}

/** A calendar that starts on the current date of the entry and weeks on the week start day. */
function DatePanel({ date, onPick }: { date: string; onPick: (date: string) => void }) {
  const { i18n } = useTranslation();
  const navButtonClass =
    'grid size-11 cursor-pointer place-items-center rounded-xl text-muted hover:bg-chip hover:text-ink';

  return (
    <I18nProvider locale={i18n.language}>
      <Calendar
        autoFocus
        defaultValue={parseDate(date)}
        firstDayOfWeek={weekdays[weekStartDay]}
        onChange={(value) => onPick(value.toString())}
      >
        <header className="mb-1 flex items-center gap-1">
          <Button slot="previous" className={navButtonClass}>
            <ChevronLeftIcon />
          </Button>
          <Heading className="flex-1 text-center font-display text-lg font-bold" />
          <Button slot="next" className={navButtonClass}>
            <ChevronRightIcon />
          </Button>
        </header>
        <CalendarGrid className="w-full border-collapse">
          {(day) => (
            <CalendarCell
              date={day}
              className={({ isSelected, isToday, isOutsideMonth }) =>
                `mx-auto grid size-11 cursor-pointer place-items-center rounded-full text-[15px] tabular-nums outline-none data-focus-visible:outline-2 data-focus-visible:outline-accent ${
                  isSelected
                    ? 'bg-ink font-semibold text-on-ink'
                    : isToday
                      ? 'border border-today-line font-semibold text-today-ink hover:bg-chip'
                      : 'hover:bg-chip'
                } ${isOutsideMonth ? 'hidden' : ''}`
              }
            />
          )}
        </CalendarGrid>
      </Calendar>
    </I18nProvider>
  );
}
