import sharp from 'sharp';
import { beforeEach, describe, expect, it } from 'vitest';

import { app } from '../app.ts';
import { login, origin, request } from '../test/api.ts';
import { createUser, resetDatabase } from '../test/db.ts';

const missingId = '00000000-0000-7000-8000-000000000000';

let cookie: string;

beforeEach(async () => {
  await resetDatabase();
  await createUser('cook', 'secret');
  cookie = await login('cook', 'secret');
});

async function createRecipe(recipe: unknown, revisionNote?: string): Promise<string> {
  const res = await request('/api/recipes', {
    method: 'POST',
    cookie,
    json: { recipe, revisionNote },
  });
  expect(res.status).toBe(201);
  const { id } = (await res.json()) as { id: string };
  return id;
}

async function getJson(path: string): Promise<unknown> {
  const res = await request(path);
  expect(res.status).toBe(200);
  return res.json();
}

function uploadPhoto(id: string, data: Blob, from = origin) {
  const body = new FormData();
  body.set('photo', data, 'photo.jpg');
  return app.request(`/api/recipes/${id}/photo`, {
    method: 'PUT',
    headers: { cookie, origin: from },
    body,
  });
}

describe('authorization', () => {
  it('allows reading without a session', async () => {
    const id = await createRecipe({ title: 'Pulla' });
    expect((await request('/api/recipes')).status).toBe(200);
    expect((await request(`/api/recipes/${id}`)).status).toBe(200);
    expect((await request('/api/tags')).status).toBe(200);
  });

  it('requires a session for every change', async () => {
    const id = await createRecipe({ title: 'Pulla' });
    const recipe = { recipe: { title: 'X' } };
    const note = { text: 'X' };
    const changes = [
      request('/api/recipes', { method: 'POST', json: recipe }),
      request(`/api/recipes/${id}`, { method: 'PUT', json: recipe }),
      request(`/api/recipes/${id}/photo`, { method: 'DELETE' }),
      request(`/api/recipes/${id}/notes`, { method: 'POST', json: note }),
      request(`/api/recipes/${id}/notes/${missingId}`, { method: 'PUT', json: note }),
      request(`/api/recipes/${id}/notes/${missingId}`, { method: 'DELETE' }),
    ];
    for (const res of await Promise.all(changes)) {
      expect(res.status).toBe(401);
    }
  });

  it('rejects a change with an unknown session', async () => {
    const res = await request('/api/recipes', {
      method: 'POST',
      cookie: 'session=forged',
      json: { recipe: { title: 'X' } },
    });
    expect(res.status).toBe(401);
  });

  it('rejects a form post from another site', async () => {
    const id = await createRecipe({ title: 'Pulla' });
    const res = await uploadPhoto(id, new Blob(['x']), 'https://evil.example');
    expect(res.status).toBe(403);
  });
});

describe('input validation', () => {
  async function postStatus(recipe: unknown) {
    const res = await request('/api/recipes', { method: 'POST', cookie, json: { recipe } });
    return res.status;
  }

  it('requires a title', async () => {
    expect(await postStatus({})).toBe(400);
    expect(await postStatus({ title: '   ' })).toBe(400);
  });

  it('rejects invalid times', async () => {
    expect(await postStatus({ title: 'X', activeMinutes: -1 })).toBe(400);
    expect(await postStatus({ title: 'X', totalMinutes: 1.5 })).toBe(400);
    expect(await postStatus({ title: 'X', totalMinutes: '30' })).toBe(400);
  });

  it('requires ingredient names and step text', async () => {
    const ingredientGroups = [{ name: null, ingredients: [{ amount: '1 dl', name: '' }] }];
    expect(await postStatus({ title: 'X', ingredientGroups })).toBe(400);
    expect(await postStatus({ title: 'X', stepGroups: [{ name: null, steps: [' '] }] })).toBe(400);
  });

  it('rejects a body that is not JSON', async () => {
    const res = await app.request('/api/recipes', {
      method: 'POST',
      headers: { cookie, 'content-type': 'application/json' },
      body: '{',
    });
    expect(res.status).toBe(400);
  });

  it('rejects an invalid id', async () => {
    expect((await request('/api/recipes/123')).status).toBe(400);
  });

  it('rejects an invalid page', async () => {
    expect((await request('/api/recipes?page=0')).status).toBe(400);
    expect((await request('/api/recipes?page=x')).status).toBe(400);
  });

  it('requires note text', async () => {
    const id = await createRecipe({ title: 'Pulla' });
    const res = await request(`/api/recipes/${id}/notes`, {
      method: 'POST',
      cookie,
      json: { text: ' ' },
    });
    expect(res.status).toBe(400);
  });

  it('rejects a photo that is not an image', async () => {
    const id = await createRecipe({ title: 'Pulla' });
    expect((await uploadPhoto(id, new Blob(['not an image']))).status).toBe(400);
  });
});

describe('recipes', () => {
  it('returns a created recipe', async () => {
    const id = await createRecipe({
      title: '  Pulla ',
      servings: '',
      totalMinutes: 90,
      tags: ['leivonnainen'],
      ingredientGroups: [{ name: null, ingredients: [{ amount: '5 dl', name: 'maito' }] }],
      stepGroups: [{ name: null, steps: ['Leivo.'] }],
    });

    expect(await getJson(`/api/recipes/${id}`)).toEqual({
      id,
      title: 'Pulla',
      description: null,
      servings: null,
      activeMinutes: null,
      totalMinutes: 90,
      source: null,
      photoUrl: null,
      tags: ['leivonnainen'],
      ingredientGroups: [
        { name: null, ingredients: [{ amount: '5 dl', name: 'maito', note: null }] },
      ],
      stepGroups: [{ name: null, steps: ['Leivo.'] }],
      notes: [],
    });
  });

  it('updates a recipe', async () => {
    const id = await createRecipe({ title: 'Pulla' });
    const res = await request(`/api/recipes/${id}`, {
      method: 'PUT',
      cookie,
      json: { recipe: { title: 'Korvapuusti' }, revisionNote: 'Uusi nimi' },
    });
    expect(res.status).toBe(204);
    expect(await getJson(`/api/recipes/${id}`)).toMatchObject({ title: 'Korvapuusti' });
  });

  it('lists and searches recipes and tags', async () => {
    await createRecipe({ title: 'Pulla', tags: ['leivonnainen'] });
    await createRecipe({ title: 'Lohikeitto', tags: ['keitto'] });

    expect(await getJson('/api/recipes?q=lohi')).toMatchObject({
      recipes: [{ title: 'Lohikeitto', tags: ['keitto'] }],
      total: 1,
      page: 1,
    });
    expect(await getJson('/api/recipes?tag=leivonnainen')).toMatchObject({
      recipes: [{ title: 'Pulla' }],
    });
    expect(await getJson('/api/tags')).toEqual([
      { name: 'keitto', count: 1 },
      { name: 'leivonnainen', count: 1 },
    ]);
  });

  it('returns 404 for a missing recipe', async () => {
    expect((await request(`/api/recipes/${missingId}`)).status).toBe(404);
    const res = await request(`/api/recipes/${missingId}`, {
      method: 'PUT',
      cookie,
      json: { recipe: { title: 'X' } },
    });
    expect(res.status).toBe(404);
  });

  it('adds, edits and deletes notes', async () => {
    const id = await createRecipe({ title: 'Pulla' });
    const added = await request(`/api/recipes/${id}/notes`, {
      method: 'POST',
      cookie,
      json: { text: 'Hyvää!' },
    });
    expect(added.status).toBe(201);
    const note = (await added.json()) as { id: string; authorName: string };
    expect(note.authorName).toBe('cook display');

    const notePath = `/api/recipes/${id}/notes/${note.id}`;
    const edited = await request(notePath, {
      method: 'PUT',
      cookie,
      json: { text: 'Tosi hyvää!' },
    });
    expect(edited.status).toBe(204);
    expect(await getJson(`/api/recipes/${id}`)).toMatchObject({
      notes: [{ text: 'Tosi hyvää!' }],
    });

    expect((await request(notePath, { method: 'DELETE', cookie })).status).toBe(204);
    expect((await request(notePath, { method: 'DELETE', cookie })).status).toBe(404);
  });

  it('stores an uploaded photo and serves it', async () => {
    const id = await createRecipe({ title: 'Pulla' });
    const jpeg = await sharp({
      create: { width: 40, height: 30, channels: 3, background: '#c84' },
    })
      .jpeg()
      .toBuffer();

    expect((await uploadPhoto(id, new Blob([new Uint8Array(jpeg)]))).status).toBe(204);
    const { photoUrl } = (await getJson(`/api/recipes/${id}`)) as { photoUrl: string };
    expect(photoUrl).toMatch(/^\/images\/[\w-]+\.webp$/);

    const image = await app.request(photoUrl);
    expect(image.status).toBe(200);
    expect(image.headers.get('content-type')).toBe('image/webp');

    const removed = await request(`/api/recipes/${id}/photo`, { method: 'DELETE', cookie });
    expect(removed.status).toBe(204);
    expect((await app.request(photoUrl)).status).toBe(404);
  });
});
