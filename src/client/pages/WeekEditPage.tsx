import { useQuery } from '@tanstack/react-query';
import { getRouteApi, Link } from '@tanstack/react-router';
import { type ReactNode, useState } from 'react';
import { Button, Input, TextField } from 'react-aria-components';
import { useTranslation } from 'react-i18next';

import { addDays, weekDates, type WeekPlanEntry } from '../../shared/week-plan.ts';
import { weekPlanQuery } from '../api.ts';
import { primaryButtonClass } from '../components/fieldStyles.ts';
import {
  CheckIcon,
  ChevronLeftIcon,
  CloseIcon,
  LinkIcon,
  TextLinesIcon,
} from '../components/icons.tsx';
import { RecipeThumb } from '../components/RecipePhoto.tsx';
import { RequireUser } from '../components/RequireUser.tsx';
import {
  DragHandle,
  dragRowAttribute,
  DropIndicator,
  type DropPosition,
  focusHandle,
  useDropTarget,
} from '../editor/sortable.tsx';
import { useFormatMinutes } from '../format.ts';
import { AddEntryField } from '../week/AddEntryField.tsx';
import { type EntryUpdate, useWeekPlanChanges } from '../week/changes.ts';
import { useFormatDay } from '../week/dates.ts';
import { EntryMenu } from '../week/EntryMenu.tsx';
import { WeekHistory } from '../week/WeekHistory.tsx';

const route = getRouteApi('/week/$start/edit');

const dragType = 'application/x-cookbook-week-entry';

export function WeekEditPage() {
  return (
    <RequireUser>
      <WeekEditor />
    </RequireUser>
  );
}

function WeekEditor() {
  const { t } = useTranslation();
  const { start } = route.useParams();
  const plan = useQuery(weekPlanQuery(start));
  const changes = useWeekPlanChanges(start);
  const format = useFormatDay();
  const dates = weekDates(start);
  const entries = plan.data ?? [];

  const dayEntries = (date: string, without?: string) =>
    entries.filter((e) => e.date === date && e.id !== without);

  /** Moves an entry to `position` among the other entries of `date`. */
  const move = (id: string, date: string, position: number) => {
    const entry = entries.find((e) => e.id === id);
    if (!entry || (entry.date === date && entry.position === position)) return;
    changes.update({ id, date, position });
  };
  const dropOn = (target: WeekPlanEntry, id: string, at: DropPosition) => {
    if (id === target.id) return;
    const index = dayEntries(target.date, id).findIndex((e) => e.id === target.id);
    move(id, target.date, at === 'before' ? index : index + 1);
  };
  /** Moves an entry up or down, and over to the previous or the next day at the ends. */
  const step = (entry: WeekPlanEntry, direction: -1 | 1) => {
    const count = dayEntries(entry.date).length;
    const dayIndex = dates.indexOf(entry.date);
    const to = entry.position + direction;
    if (to >= 0 && to < count) move(entry.id, entry.date, to);
    else if (direction < 0 && dayIndex > 0) {
      const date = dates[dayIndex - 1];
      move(entry.id, date, dayEntries(date).length);
    } else if (direction > 0 && dayIndex < dates.length - 1) {
      move(entry.id, dates[dayIndex + 1], 0);
    } else return;
    focusHandle(entry.id);
  };

  return (
    <>
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-250 flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3.5 sm:px-6">
          <Link
            to="/week/$start"
            params={{ start }}
            className="inline-flex min-h-11 items-center gap-1.5 text-[15px] font-semibold text-muted no-underline hover:text-accent-strong"
          >
            <ChevronLeftIcon />
            {t('weekEdit.back')}
          </Link>
          <h1 className="font-display text-xl font-bold">{t('weekEdit.title')}</h1>
          <span className="text-muted tabular-nums">{format.range(start, addDays(start, 6))}</span>
          <Link to="/week/$start" params={{ start }} className={`${primaryButtonClass} ml-auto`}>
            <CheckIcon />
            {t('weekEdit.done')}
          </Link>
        </div>
      </header>

      <main className="mx-auto flex max-w-250 flex-col gap-3.5 px-4 pt-7 pb-20 sm:px-6">
        <p className="mb-1.5 text-[15px] text-muted">{t('weekEdit.hint')}</p>
        {changes.failed && (
          <p
            role="alert"
            className="rounded-xl bg-danger-soft px-4 py-3 font-semibold text-accent-strong"
          >
            {t('weekEdit.saveError')}
          </p>
        )}
        {plan.isPending ? (
          <p className="text-muted">{t('common.loading')}</p>
        ) : plan.isError ? (
          <p className="text-accent-strong">{t('common.loadError')}</p>
        ) : (
          dates.map((date) => {
            const day = dayEntries(date);
            const dayName = `${format.weekday(date)} ${format.dayMonth(date)}`;
            return (
              <section
                key={date}
                aria-label={dayName}
                className="grid gap-x-6 gap-y-3 rounded-[20px] border border-line-soft bg-card px-4 py-4 sm:grid-cols-[minmax(120px,170px)_minmax(0,1fr)] sm:items-start sm:px-5 sm:py-4.5"
              >
                <div className="flex items-baseline gap-2 sm:flex-col sm:gap-0 sm:pt-2">
                  <span className="font-display text-lg font-bold sm:text-xl">
                    {format.weekday(date)}
                  </span>
                  <span className="text-[15px] text-muted tabular-nums">
                    {format.dayMonth(date)}
                  </span>
                </div>
                <div className="flex min-w-0 flex-col gap-2.5">
                  {day.length > 0 && (
                    <ul className="flex flex-col gap-2.5">
                      {day.map((entry) => (
                        <EntryRow
                          key={entry.id}
                          entry={entry}
                          dayName={format.weekday(date)}
                          onDrop={(id, at) => dropOn(entry, id, at)}
                          onStep={(direction) => step(entry, direction)}
                          onUpdate={(update) => changes.update({ id: entry.id, ...update })}
                          onRemove={() => changes.remove(entry.id)}
                        />
                      ))}
                    </ul>
                  )}
                  <DropAtEnd onDrop={(id) => move(id, date, dayEntries(date, id).length)}>
                    <AddEntryField
                      label={t('weekEdit.add', { day: format.weekday(date) })}
                      onAddRecipe={(recipe) =>
                        changes.add({ date, text: recipe.title, recipeId: recipe.id })
                      }
                      onAddText={(text) => changes.add({ date, text })}
                    />
                  </DropAtEnd>
                </div>
              </section>
            );
          })
        )}
        <WeekHistory start={start} />
      </main>
    </>
  );
}

/** Takes dropped entries and puts them last on the day. */
function DropAtEnd(props: { onDrop: (id: string) => void; children: ReactNode }) {
  const { ref, position } = useDropTarget<HTMLDivElement>(
    dragType,
    props.onDrop,
    'before',
  );
  return (
    <div ref={ref} className="relative sm:pr-26 sm:pl-11">
      {props.children}
      <DropIndicator position={position} />
    </div>
  );
}

function EntryRow(props: {
  entry: WeekPlanEntry;
  dayName: string;
  onDrop: (id: string, at: DropPosition) => void;
  onStep: (direction: -1 | 1) => void;
  onUpdate: (update: Omit<EntryUpdate, 'id'>) => void;
  onRemove: () => void;
}) {
  const { entry, dayName, onDrop, onStep, onUpdate, onRemove } = props;
  const { t } = useTranslation();
  const formatMinutes = useFormatMinutes();
  const { ref, position } = useDropTarget<HTMLLIElement>(dragType, onDrop);
  const [dragging, setDragging] = useState(false);
  const { recipe } = entry;
  const minutes = recipe && (recipe.totalMinutes ?? recipe.activeMinutes);

  return (
    <li
      ref={ref}
      {...{ [dragRowAttribute]: '' }}
      className={`relative grid grid-cols-[36px_minmax(0,1fr)_44px_44px] items-start gap-1 rounded-[14px] bg-card sm:gap-2 ${
        dragging ? 'opacity-40' : ''
      }`}
    >
      <DragHandle
        type={dragType}
        itemKey={entry.id}
        label={t('weekEdit.move', { name: entry.text })}
        onStep={onStep}
        onDraggingChange={setDragging}
      />
      <div className="flex min-w-0 flex-col gap-2 rounded-[14px] bg-paper px-2 py-2 sm:px-3 sm:py-2.5">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          {recipe ? (
            <RecipeThumb
              recipeId={recipe.id}
              photoUrl={recipe.photoUrl}
              className="size-9 rounded-[9px]"
            />
          ) : (
            <span
              aria-hidden="true"
              className="grid size-9 flex-none place-items-center rounded-[9px] border-[1.5px] border-dashed border-dashed-line text-faint"
            >
              <TextLinesIcon size={16} />
            </span>
          )}
          <DraftField
            value={entry.text}
            required
            label={t('weekEdit.text', { day: dayName })}
            onCommit={(text) => onUpdate({ text })}
            className="min-w-0 flex-1"
            inputClassName="text-[17px] font-semibold"
          />
          {minutes !== null && (
            <span className="flex-none text-sm text-muted max-sm:hidden">
              {formatMinutes(minutes)}
            </span>
          )}
          {recipe && (
            <Link
              to="/recipes/$recipeId"
              params={{ recipeId: recipe.id }}
              className="inline-flex min-h-11 flex-none items-center gap-1.25 text-[13px] text-muted hover:text-accent-strong"
            >
              <LinkIcon size={14} />
              <span className="max-sm:sr-only">{t('weekEdit.recipe')}</span>
            </Link>
          )}
        </div>
        <DraftField
          value={entry.note ?? ''}
          label={t('weekEdit.note', { name: entry.text })}
          placeholder={t('weekEdit.notePlaceholder')}
          onCommit={(note) => onUpdate({ note })}
          inputClassName="min-h-10 text-[15px]"
        />
      </div>
      <EntryMenu entry={entry} onUpdate={onUpdate} />
      <Button
        onPress={onRemove}
        aria-label={t('weekEdit.remove', { name: entry.text })}
        className="grid size-11 cursor-pointer place-items-center rounded-xl text-muted hover:bg-danger-soft hover:text-accent-strong"
      >
        <CloseIcon />
      </Button>
      <DropIndicator position={position} />
    </li>
  );
}

/**
 * A text field that saves on blur and on Enter. While the user types, changes
 * from the server do not replace the text.
 */
function DraftField(props: {
  value: string;
  label: string;
  onCommit: (value: string) => void;
  required?: boolean;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
}) {
  const { value, label, onCommit, required, placeholder, className, inputClassName = '' } = props;
  const [draft, setDraft] = useState(value);
  const [focused, setFocused] = useState(false);
  const [lastValue, setLastValue] = useState(value);
  if (value !== lastValue) {
    setLastValue(value);
    if (!focused) setDraft(value);
  }

  const commit = () => {
    const text = draft.trim();
    if (required && !text) setDraft(value);
    else if (text !== value) onCommit(text);
  };

  return (
    <TextField
      aria-label={label}
      value={draft}
      onChange={setDraft}
      onFocus={() => setFocused(true)}
      onBlur={() => {
        setFocused(false);
        commit();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit();
        if (e.key === 'Escape') setDraft(value);
      }}
      className={className}
    >
      <Input
        placeholder={placeholder}
        className={`min-h-11 w-full rounded-xl border border-field bg-card px-3.5 py-2 text-base text-ink focus:border-accent focus:outline-2 focus:outline-offset-1 focus:outline-accent ${inputClassName}`}
      />
    </TextField>
  );
}
