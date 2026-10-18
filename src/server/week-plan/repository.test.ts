import { beforeEach, describe, expect, it } from 'vitest';

import { AddEntryInput, UpdateEntryInput } from '../../shared/week-plan.ts';
import { sql } from '../db.ts';
import { type Author, deleteRecipe } from '../recipes/repository.ts';
import { addRecipe, createUser, resetDatabase } from '../test/db.ts';
import { addEntry, listEntries, removeEntry, updateEntry } from './repository.ts';

const missingId = '00000000-0000-7000-8000-000000000000';

let author: Author;

beforeEach(async () => {
  await resetDatabase();
  author = { userId: await createUser('cook'), source: 'app' };
});

async function add(date: string, text: string, extra: Partial<AddEntryInput> = {}) {
  const entry = await addEntry(AddEntryInput.parse({ date, text, ...extra }), author);
  if (typeof entry === 'string') throw new Error(entry);
  return entry;
}

function update(id: string, input: UpdateEntryInput, by = author) {
  return updateEntry(id, UpdateEntryInput.parse(input), by);
}

/** The entry texts of each date in the range, in order. */
async function texts(from: string, to: string) {
  const days: Record<string, string[]> = {};
  for (const e of await listEntries(from, to)) (days[e.date] ??= []).push(e.text);
  return days;
}

async function changes() {
  return sql<{ entryId: string; source: string; before: unknown; after: unknown }[]>`
    SELECT entry_id, source, before, after FROM week_plan_changes ORDER BY id
  `;
}

describe('addEntry and listEntries', () => {
  it('stores an entry with a recipe link', async () => {
    const recipeId = await addRecipe(author, { title: 'Uunilohi', totalMinutes: 35 });
    const entry = await add('2026-10-17', 'Lohta', { note: 'perunat samaan', recipeId });

    expect(await listEntries('2026-10-17', '2026-10-23')).toEqual([
      {
        id: entry.id,
        date: '2026-10-17',
        position: 0,
        text: 'Lohta',
        note: 'perunat samaan',
        recipe: {
          id: recipeId,
          title: 'Uunilohi',
          activeMinutes: null,
          totalMinutes: 35,
          photoUrl: null,
        },
      },
    ]);
  });

  it('adds entries last on their date unless a position is given', async () => {
    await add('2026-10-17', 'A');
    await add('2026-10-17', 'B');
    await add('2026-10-17', 'C', { position: 0 });
    await add('2026-10-17', 'D', { position: 99 });
    expect(await texts('2026-10-17', '2026-10-17')).toEqual({ '2026-10-17': ['C', 'A', 'B', 'D'] });
  });

  it('lists only the dates in the range', async () => {
    await add('2026-10-16', 'Before');
    await add('2026-10-17', 'First');
    await add('2026-10-23', 'Last');
    await add('2026-10-24', 'After');
    expect(await texts('2026-10-17', '2026-10-23')).toEqual({
      '2026-10-17': ['First'],
      '2026-10-23': ['Last'],
    });
  });

  it('rejects a missing recipe', async () => {
    const result = await addEntry(
      AddEntryInput.parse({ date: '2026-10-17', text: 'X', recipeId: missingId }),
      author,
    );
    expect(result).toBe('recipe-not-found');
    expect(await listEntries('2026-10-17', '2026-10-17')).toEqual([]);
  });

  it('records the change', async () => {
    const entry = await add('2026-10-17', 'Lohta');
    expect(await changes()).toEqual([
      {
        entryId: entry.id,
        source: 'app',
        before: null,
        after: { date: '2026-10-17', position: 0, text: 'Lohta', note: null, recipeId: null },
      },
    ]);
  });
});

describe('updateEntry', () => {
  it('changes the text and the note and keeps the other fields', async () => {
    const recipeId = await addRecipe(author, { title: 'Uunilohi' });
    const entry = await add('2026-10-17', 'Lohta', { note: 'vanha', recipeId });

    const updated = await update(entry.id, { text: 'Uunilohta' });
    expect(updated).toMatchObject({ text: 'Uunilohta', note: 'vanha', recipe: { id: recipeId } });

    expect(await update(entry.id, { note: '' })).toMatchObject({
      text: 'Uunilohta',
      note: null,
      recipe: { id: recipeId },
    });
  });

  it('adds, changes and removes the recipe link', async () => {
    const lohi = await addRecipe(author, { title: 'Uunilohi' });
    const keitto = await addRecipe(author, { title: 'Lohikeitto' });
    const entry = await add('2026-10-17', 'Lohta');

    expect(await update(entry.id, { recipeId: lohi })).toMatchObject({ recipe: { id: lohi } });
    expect(await update(entry.id, { recipeId: keitto })).toMatchObject({ recipe: { id: keitto } });
    expect(await update(entry.id, { recipeId: null })).toMatchObject({ recipe: null });
    expect(await update(entry.id, { recipeId: missingId })).toBe('recipe-not-found');
  });

  it('reorders entries within a date', async () => {
    const a = await add('2026-10-17', 'A');
    await add('2026-10-17', 'B');
    await add('2026-10-17', 'C');

    await update(a.id, { position: 2 });
    expect(await texts('2026-10-17', '2026-10-17')).toEqual({ '2026-10-17': ['B', 'C', 'A'] });

    await update(a.id, { position: 1 });
    expect(await texts('2026-10-17', '2026-10-17')).toEqual({ '2026-10-17': ['B', 'A', 'C'] });
  });

  it('moves an entry to another date and renumbers both dates', async () => {
    await add('2026-10-17', 'A');
    const b = await add('2026-10-17', 'B');
    await add('2026-10-17', 'C');
    await add('2026-10-18', 'X');
    await add('2026-10-18', 'Y');

    await update(b.id, { date: '2026-10-18', position: 1 });
    expect(await texts('2026-10-17', '2026-10-18')).toEqual({
      '2026-10-17': ['A', 'C'],
      '2026-10-18': ['X', 'B', 'Y'],
    });
    const positions = (await listEntries('2026-10-17', '2026-10-18')).map((e) => e.position);
    expect(positions).toEqual([0, 1, 0, 1, 2]);
  });

  it('moves an entry last on a new date without a position, also to another week', async () => {
    const a = await add('2026-10-17', 'A');
    await add('2026-11-03', 'X');

    await update(a.id, { date: '2026-11-03' });
    expect(await texts('2026-10-17', '2026-11-03')).toEqual({ '2026-11-03': ['X', 'A'] });
  });

  it('returns not-found for a missing entry', async () => {
    expect(await update(missingId, { text: 'X' })).toBe('not-found');
  });

  it('records changes with the source, and skips changes that change nothing', async () => {
    const entry = await add('2026-10-17', 'Lohta');
    await update(entry.id, { text: 'Lohta' });
    await update(entry.id, { note: 'tuplasatsi' }, { userId: author.userId, source: 'mcp' });

    expect((await changes()).slice(1)).toEqual([
      {
        entryId: entry.id,
        source: 'mcp',
        before: { date: '2026-10-17', position: 0, text: 'Lohta', note: null, recipeId: null },
        after: {
          date: '2026-10-17',
          position: 0,
          text: 'Lohta',
          note: 'tuplasatsi',
          recipeId: null,
        },
      },
    ]);
  });
});

describe('removeEntry', () => {
  it('removes the entry, renumbers the date and records the change', async () => {
    const a = await add('2026-10-17', 'A');
    await add('2026-10-17', 'B');

    expect(await removeEntry(a.id, author)).toBe(true);
    expect(await listEntries('2026-10-17', '2026-10-17')).toMatchObject([
      { text: 'B', position: 0 },
    ]);
    expect((await changes()).at(-1)).toMatchObject({
      entryId: a.id,
      before: { text: 'A' },
      after: null,
    });
  });

  it('returns false for a missing entry', async () => {
    expect(await removeEntry(missingId, author)).toBe(false);
  });
});

describe('deleting a recipe', () => {
  it('keeps the entries that link to it, without the link', async () => {
    const recipeId = await addRecipe(author, { title: 'Uunilohi' });
    await add('2026-10-17', 'Lohta', { recipeId });

    await deleteRecipe(recipeId);
    expect(await listEntries('2026-10-17', '2026-10-17')).toMatchObject([
      { text: 'Lohta', recipe: null },
    ]);
  });
});
