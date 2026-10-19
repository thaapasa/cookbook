import { beforeEach, describe, expect, it } from 'vitest';

import type { WeekPlanEntry } from '../../shared/week-plan.ts';
import { login, request } from '../test/api.ts';
import { addRecipe, createUser, resetDatabase } from '../test/db.ts';

const missingId = '00000000-0000-7000-8000-000000000000';
const week = '/api/week-plan?from=2026-10-17&to=2026-10-23';
const changes = '/api/week-plan/changes?from=2026-10-17&to=2026-10-23';

let userId: string;
let cookie: string;

beforeEach(async () => {
  await resetDatabase();
  userId = await createUser('cook', 'secret');
  cookie = await login('cook', 'secret');
});

async function add(json: unknown): Promise<WeekPlanEntry> {
  const res = await request('/api/week-plan/entries', { method: 'POST', cookie, json });
  expect(res.status).toBe(201);
  return (await res.json()) as WeekPlanEntry;
}

describe('authorization', () => {
  it('requires a session for reading and for every change', async () => {
    const entry = await add({ date: '2026-10-17', text: 'Lohta' });
    const requests = [
      request(week),
      request(changes),
      request('/api/week-plan/entries', {
        method: 'POST',
        json: { date: '2026-10-17', text: 'X' },
      }),
      request(`/api/week-plan/entries/${entry.id}`, { method: 'PATCH', json: { text: 'X' } }),
      request(`/api/week-plan/entries/${entry.id}`, { method: 'DELETE' }),
    ];
    for (const res of await Promise.all(requests)) expect(res.status).toBe(401);
  });
});

describe('validation', () => {
  it('rejects invalid ranges', async () => {
    for (const query of [
      '',
      'from=2026-10-17',
      'from=2026-10-17&to=2026-10-16',
      'from=2026-10-17&to=2028-01-01',
      'from=17.10.2026&to=23.10.2026',
    ]) {
      expect((await request(`/api/week-plan?${query}`, { cookie })).status).toBe(400);
      expect((await request(`/api/week-plan/changes?${query}`, { cookie })).status).toBe(400);
    }
  });

  it('rejects invalid entries and updates', async () => {
    for (const json of [
      { date: '2026-10-17' },
      { date: '2026-10-17', text: ' ' },
      { date: '2026-13-01', text: 'X' },
      { date: '2026-10-17', text: 'X', recipeId: 'abc' },
      { date: '2026-10-17', text: 'X', position: -1 },
    ]) {
      const res = await request('/api/week-plan/entries', { method: 'POST', cookie, json });
      expect(res.status).toBe(400);
    }

    const entry = await add({ date: '2026-10-17', text: 'Lohta' });
    for (const json of [{}, { text: '' }, { date: 'tomorrow' }, { position: 1.5 }]) {
      const res = await request(`/api/week-plan/entries/${entry.id}`, {
        method: 'PATCH',
        cookie,
        json,
      });
      expect(res.status).toBe(400);
    }
  });

  it('rejects a missing recipe', async () => {
    const res = await request('/api/week-plan/entries', {
      method: 'POST',
      cookie,
      json: { date: '2026-10-17', text: 'X', recipeId: missingId },
    });
    expect(res.status).toBe(400);
  });

  it('returns 404 for a missing entry', async () => {
    const path = `/api/week-plan/entries/${missingId}`;
    expect((await request(path, { method: 'PATCH', cookie, json: { text: 'X' } })).status).toBe(
      404,
    );
    expect((await request(path, { method: 'DELETE', cookie })).status).toBe(404);
  });
});

describe('entries', () => {
  it('adds, changes, moves and removes entries', async () => {
    const recipeId = await addRecipe({ userId, source: 'app' }, { title: 'Uunilohi' });
    const lohi = await add({ date: '2026-10-17', text: 'Uunilohi', recipeId });
    const salaatti = await add({ date: '2026-10-18', text: 'Salaatti' });

    const patch = await request(`/api/week-plan/entries/${lohi.id}`, {
      method: 'PATCH',
      cookie,
      json: { note: 'tuplasatsi', date: '2026-10-18', position: 0 },
    });
    expect(patch.status).toBe(200);
    expect(await patch.json()).toMatchObject({ date: '2026-10-18', position: 0 });

    const res = await request(week, { cookie });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject([
      {
        id: lohi.id,
        date: '2026-10-18',
        text: 'Uunilohi',
        note: 'tuplasatsi',
        recipe: { id: recipeId, title: 'Uunilohi' },
      },
      { id: salaatti.id, date: '2026-10-18', position: 1, recipe: null },
    ]);

    const del = await request(`/api/week-plan/entries/${salaatti.id}`, {
      method: 'DELETE',
      cookie,
    });
    expect(del.status).toBe(204);
    expect(await (await request(week, { cookie })).json()).toMatchObject([{ id: lohi.id }]);
  });
});

describe('changes', () => {
  it('returns the changes of the range with the user', async () => {
    await add({ date: '2026-10-17', text: 'Lohta' });
    const res = await request(changes, { cookie });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject([
      {
        user: 'cook display',
        source: 'app',
        before: null,
        after: { date: '2026-10-17', text: 'Lohta' },
        recipes: {},
      },
    ]);
  });
});
