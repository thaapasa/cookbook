import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DayRange, Week } from '../../shared/integration.ts';
import { AddEntryInput } from '../../shared/week-plan.ts';
import { sql } from '../db.ts';
import type { Author } from '../recipes/repository.ts';
import { addRecipe, createUser, resetDatabase } from '../test/db.ts';
import { addEntry } from '../week-plan/repository.ts';
import { getDays, getSettings, getWeek } from './service.ts';

const site = 'https://reseptit.example';

let author: Author;

beforeEach(async () => {
  await resetDatabase();
  author = { userId: await createUser('cook'), source: 'app' };
});

afterEach(() => {
  vi.useRealTimers();
});

async function add(date: string, text: string, extra: Partial<AddEntryInput> = {}) {
  const entry = await addEntry(AddEntryInput.parse({ date, text, ...extra }), author);
  if (typeof entry === 'string') throw new Error(entry);
  return entry;
}

describe('getSettings', () => {
  it('returns the week start day of the week view', () => {
    expect(getSettings()).toEqual({ weekStartDay: 'saturday' });
  });
});

describe('getWeek', () => {
  it('returns the seven days of the week that contains the date', async () => {
    const week = Week.parse(await getWeek('2026-10-21'));

    expect(week).toMatchObject({
      start: '2026-10-17',
      end: '2026-10-23',
      weekStartDay: 'saturday',
    });
    expect(week.days.map((d) => [d.date, d.weekday])).toEqual([
      ['2026-10-17', 'saturday'],
      ['2026-10-18', 'sunday'],
      ['2026-10-19', 'monday'],
      ['2026-10-20', 'tuesday'],
      ['2026-10-21', 'wednesday'],
      ['2026-10-22', 'thursday'],
      ['2026-10-23', 'friday'],
    ]);
  });

  it('starts the week on the date when the date is the start day', async () => {
    expect(await getWeek('2026-10-24')).toMatchObject({ start: '2026-10-24', end: '2026-10-30' });
  });

  it('uses today without a date', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 20, 12));
    expect(await getWeek()).toMatchObject({ start: '2026-10-17', end: '2026-10-23' });
  });

  it('returns the entries of each day in plan order, with recipe links', async () => {
    const recipeId = await addRecipe(author, { title: 'Uunilohi' });
    await sql`UPDATE recipes SET photo_path = 'lohi.webp' WHERE id = ${recipeId}`;
    const lohi = await add('2026-10-19', 'Lohta', { note: 'tuplasatsi', recipeId });
    const pizza = await add('2026-10-19', 'Pizzaa');
    const salaatti = await add('2026-10-19', 'Salaatti', { position: 0 });

    const { days } = Week.parse(await getWeek('2026-10-19'));

    expect(days.find((d) => d.date === '2026-10-19')!.entries).toEqual([
      { id: salaatti.id, text: 'Salaatti', note: null, recipe: null },
      {
        id: lohi.id,
        text: 'Lohta',
        note: 'tuplasatsi',
        recipe: {
          id: recipeId,
          title: 'Uunilohi',
          url: `${site}/recipes/${recipeId}?from=external`,
          cookingUrl: `${site}/recipes/${recipeId}/cook?from=external`,
          photo: {
            url: `${site}/images/lohi.webp`,
            sizes: [
              { size: 256, url: `${site}/images/lohi.s256.webp` },
              { size: 768, url: `${site}/images/lohi.s768.webp` },
            ],
          },
        },
      },
      { id: pizza.id, text: 'Pizzaa', note: null, recipe: null },
    ]);
    expect(days.filter((d) => d.entries.length).map((d) => d.date)).toEqual(['2026-10-19']);
  });

  it('returns a null photo for a recipe without one', async () => {
    const recipeId = await addRecipe(author, { title: 'Pulla' });
    await add('2026-10-19', 'Pullaa', { recipeId });

    const { days } = await getWeek('2026-10-19');

    expect(days[2].entries[0].recipe).toMatchObject({ title: 'Pulla', photo: null });
  });
});

describe('getDays', () => {
  it('returns each date of the range, also the ones without entries', async () => {
    await add('2026-10-31', 'Lohta');
    await add('2026-11-02', 'Pizzaa');
    await add('2026-11-03', 'Outside the range');

    const range = DayRange.parse(await getDays('2026-10-30', '2026-11-02'));

    expect(range.from).toBe('2026-10-30');
    expect(range.to).toBe('2026-11-02');
    expect(range.days.map((d) => [d.date, d.entries.map((e) => e.text)])).toEqual([
      ['2026-10-30', []],
      ['2026-10-31', ['Lohta']],
      ['2026-11-01', []],
      ['2026-11-02', ['Pizzaa']],
    ]);
  });

  it('returns one day for a range of one date', async () => {
    const { days } = await getDays('2026-12-31', '2026-12-31');
    expect(days).toEqual([{ date: '2026-12-31', weekday: 'thursday', entries: [] }]);
  });
});
