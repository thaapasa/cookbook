import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { type PointerEvent as ReactPointerEvent, useRef, useState } from 'react';
import { Button } from 'react-aria-components';
import { useTranslation } from 'react-i18next';

import type { RecipeSummary } from '../../shared/recipe.ts';
import { addDays, weekDates, type WeekPlanEntry } from '../../shared/week-plan.ts';
import { weekPlanQuery } from '../api.ts';
import { useBackState } from '../back.tsx';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CloseIcon,
  GripIcon,
  TextLinesIcon,
} from '../components/icons.tsx';
import { RecipeThumb } from '../components/RecipePhoto.tsx';
import { useActiveDragType, useDragSource, useDropTarget } from '../editor/sortable.tsx';
import { useMediaQuery } from '../media.ts';
import { useWeekPlanChanges } from './changes.ts';
import { currentWeekStart, useFormatDay } from './dates.ts';
import type { usePanelState } from './panel-state.ts';

/** The drag type of the recipe cards of the recipe list. */
export const recipeDragType = 'application/x-cookbook-recipe';
const entryDragType = 'application/x-cookbook-week-panel-entry';
const dropTypes = [recipeDragType, entryDragType];

/** How far a press on the handle moves sideways before it opens or closes the panel, in pixels. */
const swipeDistance = 24;

const panelId = 'week-panel';

/**
 * A panel beside the recipe list that shows one week of the plan. Recipe cards
 * dropped on a day add an entry, and entries can be dragged to other days.
 */
export function WeekPanel(props: {
  panel: ReturnType<typeof usePanelState>;
  findRecipe: (id: string) => RecipeSummary | undefined;
}) {
  const { panel, findRecipe } = props;
  return (
    <div
      className={`sticky top-0 flex max-h-dvh flex-none items-start gap-3 py-6 ${panel.open ? 'pr-6' : ''}`}
    >
      <PanelHandle
        open={panel.open}
        onToggle={() => panel.update({ open: !panel.open, start: panel.start })}
      />
      {panel.open && (
        <WeekPlanPanel
          start={panel.start}
          onStartChange={(start) => panel.update({ open: true, start })}
          onEdit={panel.touch}
          findRecipe={findRecipe}
        />
      )}
    </div>
  );
}

/** Opens and closes the panel on a click, and on a drag sideways. */
function PanelHandle({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const { t } = useTranslation();
  const startX = useRef<number | null>(null);
  // Set when a drag toggled the panel, so the click that follows doesn't toggle it back.
  const swiped = useRef(false);

  const onPointerDown = (e: ReactPointerEvent<HTMLButtonElement>) => {
    startX.current = e.clientX;
    swiped.current = false;
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (startX.current === null) return;
    const dx = e.clientX - startX.current;
    if (open ? dx > swipeDistance : dx < -swipeDistance) {
      startX.current = null;
      swiped.current = true;
      onToggle();
    }
  };

  return (
    <button
      type="button"
      aria-expanded={open}
      aria-controls={open ? panelId : undefined}
      aria-label={open ? t('weekPanel.close') : t('weekPanel.open')}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={() => (startX.current = null)}
      onPointerCancel={() => (startX.current = null)}
      onClick={() => {
        if (swiped.current) swiped.current = false;
        else onToggle();
      }}
      className={`flex flex-none cursor-ew-resize touch-none flex-col items-center justify-center select-none focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent ${
        open
          ? 'mt-34 h-18 w-6 rounded-full bg-chip text-muted'
          : 'mt-28 min-h-37.5 w-11 gap-2.5 rounded-l-2xl border border-r-0 border-line bg-card py-3 text-ink shadow-[-4px_0_16px_var(--color-shadow)]'
      }`}
    >
      <GripIcon size={18} />
      {!open && (
        <span className="rotate-180 text-sm font-semibold tracking-[0.04em] [writing-mode:vertical-rl]">
          {t('weekPanel.title')}
        </span>
      )}
    </button>
  );
}

function WeekPlanPanel(props: {
  start: string;
  onStartChange: (start: string) => void;
  onEdit: () => void;
  findRecipe: (id: string) => RecipeSummary | undefined;
}) {
  const { start, onStartChange, onEdit, findRecipe } = props;
  const { t } = useTranslation();
  const format = useFormatDay();
  const plan = useQuery(weekPlanQuery(start));
  const changes = useWeekPlanChanges(start);
  const backState = useBackState('recipe.allRecipes');
  const coarsePointer = useMediaQuery('(pointer: coarse)');
  const title = useWeekTitle(start);
  const entries = plan.data ?? [];

  const dropOn = (date: string, key: string, type: string) => {
    onEdit();
    if (type === recipeDragType) {
      const recipe = findRecipe(key);
      if (recipe) changes.add({ date, text: recipe.title, recipeId: recipe.id });
    } else {
      const entry = entries.find((e) => e.id === key);
      if (entry && entry.date !== date) changes.update({ id: key, date });
    }
  };
  const remove = (id: string) => {
    onEdit();
    changes.remove(id);
  };

  return (
    <aside
      id={panelId}
      aria-labelledby="week-panel-title"
      className="flex max-h-[calc(100dvh-3rem)] w-[min(23.75rem,40vw)] flex-col gap-3 overflow-y-auto rounded-[22px] border border-line-soft bg-card p-4.5 shadow-[0_12px_32px_var(--color-shadow)]"
    >
      <div className="flex items-center gap-1.5">
        <Button
          onPress={() => onStartChange(addDays(start, -7))}
          aria-label={t('week.previous')}
          className={navButton}
        >
          <ChevronLeftIcon size={16} />
        </Button>
        <div className="flex flex-1 flex-col items-center leading-tight">
          <strong id="week-panel-title" className="font-display text-[19px] font-bold">
            {title}
          </strong>
          <span className="text-[13px] text-muted tabular-nums">
            {format.range(start, addDays(start, 6))}
          </span>
        </div>
        <Button
          onPress={() => onStartChange(addDays(start, 7))}
          aria-label={t('week.next')}
          className={navButton}
        >
          <ChevronRightIcon size={16} />
        </Button>
      </div>

      {changes.failed && (
        <p
          role="alert"
          className="rounded-xl bg-danger-soft px-3 py-2 text-sm font-semibold text-accent-strong"
        >
          {t('weekEdit.saveError')}
        </p>
      )}
      {plan.isPending ? (
        <p className="text-muted">{t('common.loading')}</p>
      ) : plan.isError ? (
        <p className="text-accent-strong">{t('common.loadError')}</p>
      ) : (
        <ol className="flex flex-col gap-1.5">
          {weekDates(start).map((date) => (
            <DayRow
              key={date}
              date={date}
              entries={entries.filter((e) => e.date === date)}
              onDrop={(key, type) => dropOn(date, key, type)}
              onRemove={remove}
            />
          ))}
        </ol>
      )}

      <Link
        to="/week/$start/edit"
        params={{ start }}
        state={backState}
        className="inline-flex min-h-11 items-center justify-center rounded-full border border-field text-[15px] font-semibold text-ink no-underline hover:text-accent-strong"
      >
        {t('weekPanel.edit')}
      </Link>
      <p className="text-[13px] text-muted">
        {t('weekPanel.hint')}
        {coarsePointer && ` ${t('weekPanel.touchHint')}`}
      </p>
    </aside>
  );
}

const navButton =
  'grid size-10 flex-none cursor-pointer place-items-center rounded-full border border-line bg-card text-ink hover:text-accent-strong';

/** "Ensi viikko", "Tämä viikko", "3 vk päästä" or "2 vk sitten". */
function useWeekTitle(start: string): string {
  const { t } = useTranslation();
  const weeks = Math.round(
    (Date.parse(start) - Date.parse(currentWeekStart())) / (7 * 24 * 60 * 60 * 1000),
  );
  if (weeks === 0) return t('weekPanel.thisWeek');
  if (weeks === 1) return t('weekPanel.nextWeek');
  return weeks > 1
    ? t('weekPanel.weeksAhead', { count: weeks })
    : t('weekPanel.weeksAgo', { count: -weeks });
}

function DayRow(props: {
  date: string;
  entries: WeekPlanEntry[];
  onDrop: (key: string, type: string) => void;
  onRemove: (id: string) => void;
}) {
  const { date, entries, onDrop, onRemove } = props;
  const { t } = useTranslation();
  const format = useFormatDay();
  const { ref, position } = useDropTarget<HTMLLIElement>(
    dropTypes,
    (key, _at, type) => onDrop(key, type),
    'after',
  );
  const activeType = useActiveDragType();
  const over = position !== null;
  const dragging = activeType !== null && dropTypes.includes(activeType);
  const day = format.shortWeekday(date);

  return (
    <li
      ref={ref}
      aria-label={`${format.weekday(date)} ${format.dayMonth(date)}`}
      className={`flex min-h-13 gap-2.5 rounded-[14px] py-1.5 pr-1.5 pl-2.5 transition ${
        over
          ? 'bg-danger-soft shadow-[inset_0_0_0_2px_var(--color-accent)]'
          : dragging
            ? 'bg-field-soft shadow-[inset_0_0_0_1.5px_var(--color-field)]'
            : 'shadow-[inset_0_0_0_1px_var(--color-line-soft)]'
      }`}
    >
      <span className="flex w-9 flex-none flex-col pt-1.5 leading-tight">
        <strong className="text-[15px]">{day}</strong>
        <span className="text-[11px] text-muted tabular-nums">{format.dayMonth(date)}</span>
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        {entries.map((entry) => (
          <EntryChip
            key={entry.id}
            entry={entry}
            removeLabel={t('weekPanel.remove', { name: entry.text, day })}
            onRemove={() => onRemove(entry.id)}
          />
        ))}
        {(entries.length === 0 || over) && (
          <span
            className={`flex min-h-10 items-center rounded-[10px] px-2.5 text-sm ${
              over
                ? 'font-semibold text-today-ink'
                : 'border-[1.5px] border-dashed border-line text-faint'
            }`}
          >
            {over ? t('weekPanel.dropHere') : t('weekPanel.empty')}
          </span>
        )}
      </span>
    </li>
  );
}

function EntryChip(props: { entry: WeekPlanEntry; removeLabel: string; onRemove: () => void }) {
  const { entry, removeLabel, onRemove } = props;
  const [dragging, setDragging] = useState(false);
  const drag = useDragSource({
    type: entryDragType,
    itemKey: entry.id,
    onDraggingChange: setDragging,
  });
  const { recipe } = entry;

  return (
    <span
      {...drag}
      className={`flex cursor-grab touch-none items-center gap-2 rounded-[10px] bg-paper p-1 select-none [-webkit-touch-callout:none] ${
        dragging ? 'opacity-40' : ''
      }`}
    >
      {recipe ? (
        <RecipeThumb recipeId={recipe.id} photo={recipe.photo} className="size-8.5 rounded-lg" />
      ) : (
        <span
          aria-hidden="true"
          className="grid size-8.5 flex-none place-items-center rounded-lg border-[1.5px] border-dashed border-dashed-line text-faint"
        >
          <TextLinesIcon size={14} />
        </span>
      )}
      <span className="min-w-0 flex-1 text-sm leading-tight font-semibold">{entry.text}</span>
      <Button
        onPress={onRemove}
        aria-label={removeLabel}
        className="grid size-8 flex-none cursor-pointer place-items-center rounded-full text-muted hover:bg-danger-soft hover:text-accent-strong"
      >
        <CloseIcon size={12} />
      </Button>
    </span>
  );
}
