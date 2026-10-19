import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import {
  addDays,
  type UpdateEntryInput,
  type WeekPlanEntry,
  type WeekPlanRecipe,
} from '../../shared/week-plan.ts';
import {
  addWeekPlanEntry,
  removeWeekPlanEntry,
  updateWeekPlanEntry,
  weekPlanQuery,
} from '../api.ts';

const mutationKey = ['week-plan'];

/**
 * A change to an entry. `recipe` is the recipe of a new `recipeId`, so the
 * view can show the link before the server answers. It is not sent.
 */
export type EntryUpdate = UpdateEntryInput & { id: string; recipe?: WeekPlanRecipe | null };

/** Sorts the entries by date, keeps their order within a date, and renumbers the positions. */
function renumber(entries: WeekPlanEntry[]): WeekPlanEntry[] {
  const counts = new Map<string, number>();
  return entries
    .toSorted((a, b) => a.date.localeCompare(b.date))
    .map((e) => {
      const position = counts.get(e.date) ?? 0;
      counts.set(e.date, position + 1);
      return { ...e, position };
    });
}

/**
 * Applies an update the way the server does, so the view can show it before the
 * server answers. An entry that moves out of the week starting on `start` drops out.
 */
function applyUpdate(entries: WeekPlanEntry[], update: EntryUpdate, start: string): WeekPlanEntry[] {
  const entry = entries.find((e) => e.id === update.id);
  if (!entry) return entries;
  const changed: WeekPlanEntry = {
    ...entry,
    text: update.text?.trim() || entry.text,
    note: update.note !== undefined ? update.note?.trim() || null : entry.note,
    date: update.date ?? entry.date,
    recipe: update.recipe !== undefined ? update.recipe : entry.recipe,
  };
  const others = entries.filter((e) => e.id !== entry.id);
  if (changed.date < start || changed.date > addDays(start, 6)) return renumber(others);
  if (changed.date === entry.date && update.position === undefined) {
    return entries.map((e) => (e.id === entry.id ? changed : e));
  }
  const day = others.filter((e) => e.date === changed.date);
  day.splice(update.position ?? day.length, 0, changed);
  return renumber([...others.filter((e) => e.date !== changed.date), ...day]);
}

/**
 * Saves the changes to a week. Updates and removals show at once and are undone
 * if the server rejects them. `failed` tells whether the last change failed.
 */
export function useWeekPlanChanges(start: string) {
  const queryClient = useQueryClient();
  const { queryKey } = weekPlanQuery(start);
  const [failed, setFailed] = useState(false);

  const showNow = async (apply: (entries: WeekPlanEntry[]) => WeekPlanEntry[]) => {
    setFailed(false);
    // A refetch that is already running would overwrite the change with old data.
    await queryClient.cancelQueries({ queryKey });
    const previous = queryClient.getQueryData(queryKey);
    if (previous) queryClient.setQueryData(queryKey, apply(previous));
    return { previous };
  };
  const handlers = {
    onError: (_error: unknown, _vars: unknown, result?: { previous?: WeekPlanEntry[] }) => {
      if (result?.previous) queryClient.setQueryData(queryKey, result.previous);
      setFailed(true);
    },
    onSettled: () => {
      // Refetch after the last running change, so the view does not jump back and forth.
      if (queryClient.isMutating({ mutationKey }) === 1) {
        void queryClient.invalidateQueries({ queryKey });
      }
    },
  };

  const add = useMutation({
    mutationKey,
    mutationFn: addWeekPlanEntry,
    onMutate: () => setFailed(false),
    onSuccess: (entry) =>
      queryClient.setQueryData(
        queryKey,
        (entries) => entries && renumber([...entries.filter((e) => e.id !== entry.id), entry]),
      ),
    onError: () => setFailed(true),
    onSettled: handlers.onSettled,
  });

  const update = useMutation({
    mutationKey,
    mutationFn: ({ id, text, note, recipeId, date, position }: EntryUpdate) =>
      updateWeekPlanEntry(id, { text, note, recipeId, date, position }),
    onMutate: (vars) => showNow((entries) => applyUpdate(entries, vars, start)),
    ...handlers,
  });

  const remove = useMutation({
    mutationKey,
    mutationFn: removeWeekPlanEntry,
    onMutate: (id) => showNow((entries) => renumber(entries.filter((e) => e.id !== id))),
    ...handlers,
  });

  return { add: add.mutate, update: update.mutate, remove: remove.mutate, failed };
}
