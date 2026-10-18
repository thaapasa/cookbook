import { Client, InMemoryTransport } from '@modelcontextprotocol/client';
import sharp from 'sharp';
import { beforeEach, describe, expect, it } from 'vitest';

import type { User } from '../../shared/auth.ts';
import { app } from '../app.ts';
import { sql } from '../db.ts';
import { type Author, getRecipe } from '../recipes/repository.ts';
import { addRecipe, createUser, resetDatabase } from '../test/db.ts';
import { createMcpServer } from './server.ts';

const missingId = '00000000-0000-7000-8000-000000000000';

let user: User;
let author: Author;
let client: Client;

beforeEach(async () => {
  await resetDatabase();
  user = { id: await createUser('cook'), username: 'cook', displayName: 'cook display' };
  author = { userId: user.id, source: 'app' };
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await createMcpServer(user).connect(serverTransport);
  client = new Client({ name: 'test', version: '1.0.0' });
  await client.connect(clientTransport);
});

async function callTool(name: string, args: Record<string, unknown>) {
  return client.callTool({ name, arguments: args });
}

describe('search_recipes', () => {
  it('finds recipes by search words and tags', async () => {
    const author = { userId: user.id, source: 'app' } as const;
    await addRecipe(author, { title: 'Mustikkapiirakka', tags: ['leivonnaiset'] });
    await addRecipe(author, { title: 'Mustikkasoppa' });
    await addRecipe(author, { title: 'Hernekeitto' });

    const res = await callTool('search_recipes', { query: 'mustikka' });
    const titles = (res.structuredContent as { recipes: { title: string }[] }).recipes.map(
      (r) => r.title,
    );
    expect(titles.sort()).toEqual(['Mustikkapiirakka', 'Mustikkasoppa']);

    const tagged = await callTool('search_recipes', { tags: ['leivonnaiset'] });
    expect(tagged.structuredContent).toMatchObject({
      total: 1,
      recipes: [{ title: 'Mustikkapiirakka' }],
    });
  });
});

describe('get_recipe', () => {
  it('returns the full recipe', async () => {
    const id = await addRecipe(
      { userId: user.id, source: 'app' },
      {
        title: 'Pulla',
        ingredientGroups: [{ ingredients: [{ amount: '5 dl', name: 'maito' }] }],
      },
    );
    const res = await callTool('get_recipe', { id });
    expect(res.isError).toBeFalsy();
    expect(res.structuredContent).toMatchObject({
      id,
      title: 'Pulla',
      ingredientGroups: [{ name: null, ingredients: [{ amount: '5 dl', name: 'maito' }] }],
    });
  });

  it('returns an error for a missing recipe', async () => {
    const res = await callTool('get_recipe', { id: missingId });
    expect(res.isError).toBe(true);
  });
});

describe('create_recipe', () => {
  it('creates a recipe as the user, through MCP', async () => {
    const res = await callTool('create_recipe', {
      recipe: { title: 'Karjalanpiirakka', tags: ['suolaiset'] },
      revisionNote: 'Tuotu verkkosivulta',
    });
    const { id } = res.structuredContent as { id: string };

    expect(await getRecipe(id)).toMatchObject({ title: 'Karjalanpiirakka', tags: ['suolaiset'] });
    const revisions = await sql`
      SELECT user_id, source, note FROM revisions WHERE recipe_id = ${id}
    `;
    expect(revisions).toEqual([{ userId: user.id, source: 'mcp', note: 'Tuotu verkkosivulta' }]);
  });

  it('rejects invalid input', async () => {
    const res = await callTool('create_recipe', { recipe: { title: ' ' } });
    expect(res.isError).toBe(true);
    const [{ count }] = await sql<{ count: string }[]>`SELECT count(*) FROM recipes`;
    expect(count).toBe('0');
  });
});

describe('update_recipe', () => {
  it('replaces the content as the user, through MCP', async () => {
    const id = await addRecipe(author, { title: 'Pulla', tags: ['leivonnainen'] });
    const res = await callTool('update_recipe', {
      id,
      recipe: { title: 'Kauramaitopulla', tags: ['leivonnainen', 'vegaaninen'] },
      revisionNote: 'Kauramaito lehmänmaidon tilalle',
    });
    expect(res.isError).toBeFalsy();

    expect(await getRecipe(id)).toMatchObject({
      title: 'Kauramaitopulla',
      tags: ['leivonnainen', 'vegaaninen'],
    });
    const revisions = await sql`
      SELECT user_id, source, note FROM revisions WHERE recipe_id = ${id} ORDER BY id
    `;
    expect(revisions).toEqual([
      { userId: user.id, source: 'app', note: null },
      { userId: user.id, source: 'mcp', note: 'Kauramaito lehmänmaidon tilalle' },
    ]);
  });

  it('returns an error for a missing recipe', async () => {
    const res = await callTool('update_recipe', { id: missingId, recipe: { title: 'X' } });
    expect(res.isError).toBe(true);
  });
});

describe('delete_recipe', () => {
  it('deletes a recipe', async () => {
    const id = await addRecipe(author, { title: 'Pulla' });
    expect((await callTool('delete_recipe', { id })).isError).toBeFalsy();
    expect(await getRecipe(id)).toBeNull();
    expect((await callTool('delete_recipe', { id })).isError).toBe(true);
  });
});

describe('set_recipe_photo', () => {
  it('stores a base64 photo', async () => {
    const id = await addRecipe(author, { title: 'Pulla' });
    const jpeg = await sharp({
      create: { width: 40, height: 30, channels: 3, background: '#c84' },
    })
      .jpeg()
      .toBuffer();

    const res = await callTool('set_recipe_photo', { id, data: jpeg.toString('base64') });
    expect(res.isError).toBeFalsy();
    const photoUrl = (await getRecipe(id))?.photoUrl;
    expect(photoUrl).toMatch(/^\/images\/[\w-]+\.webp$/);
    expect((await app.request(photoUrl!)).status).toBe(200);
  });

  it('accepts a data URL', async () => {
    const id = await addRecipe(author, { title: 'Pulla' });
    const png = await sharp({
      create: { width: 20, height: 20, channels: 3, background: '#48c' },
    })
      .png()
      .toBuffer();

    const data = `data:image/png;base64,${png.toString('base64')}`;
    expect((await callTool('set_recipe_photo', { id, data })).isError).toBeFalsy();
    expect((await getRecipe(id))?.photoUrl).toMatch(/\.webp$/);
  });

  it('rejects data that is not an image', async () => {
    const id = await addRecipe(author, { title: 'Pulla' });
    const data = Buffer.from('not an image').toString('base64');
    expect((await callTool('set_recipe_photo', { id, data })).isError).toBe(true);
    expect((await callTool('set_recipe_photo', { id, data: '%%%' })).isError).toBe(true);
    expect((await getRecipe(id))?.photoUrl).toBeNull();
  });
});

describe('add_note', () => {
  it('adds a note as the user', async () => {
    const id = await addRecipe(author, { title: 'Pulla' });
    const res = await callTool('add_note', { id, text: 'Onnistui hyvin' });
    expect(res.structuredContent).toMatchObject({
      authorName: 'cook display',
      text: 'Onnistui hyvin',
    });
    expect((await callTool('add_note', { id: missingId, text: 'X' })).isError).toBe(true);
  });
});

describe('list_tags', () => {
  it('lists the tags with counts', async () => {
    await addRecipe(author, { title: 'Pulla', tags: ['leivonnainen'] });
    const res = await callTool('list_tags', {});
    expect(res.structuredContent).toEqual({ tags: [{ name: 'leivonnainen', count: 1 }] });
  });
});

describe('list_ingredient_names', () => {
  it('lists the ingredient names, filtered by a query', async () => {
    await addRecipe(author, {
      title: 'Pulla',
      ingredientGroups: [{ ingredients: [{ name: 'maito' }, { name: 'vehnäjauho' }] }],
    });
    const res = await callTool('list_ingredient_names', { query: 'jauho' });
    expect(res.structuredContent).toEqual({ ingredients: [{ name: 'vehnäjauho', count: 1 }] });
  });
});

describe('get_ingredients', () => {
  it('returns the ingredients of several recipes and the missing ids', async () => {
    const pulla = await addRecipe(author, {
      title: 'Pulla',
      ingredientGroups: [{ ingredients: [{ amount: '5 dl', name: 'maito' }] }],
    });
    const lettu = await addRecipe(author, { title: 'Lettu' });

    const res = await callTool('get_ingredients', { ids: [pulla, lettu, missingId] });
    expect(res.structuredContent).toMatchObject({
      recipes: [
        { id: pulla, title: 'Pulla', ingredientGroups: [{ ingredients: [{ name: 'maito' }] }] },
        { id: lettu, title: 'Lettu', ingredientGroups: [] },
      ],
      missing: [missingId],
    });
  });
});

describe('week plan tools', () => {
  it('adds, reads, changes, moves and removes entries as made through MCP', async () => {
    const recipeId = await addRecipe(author, { title: 'Uunilohi' });

    const added = await callTool('add_week_plan_entry', {
      date: '2026-10-17',
      text: 'Uunilohi',
      recipeId,
    });
    const { id } = added.structuredContent as { id: string };
    await callTool('add_week_plan_entry', { date: '2026-10-18', text: 'Salaatti' });

    const updated = await callTool('update_week_plan_entry', {
      id,
      note: 'tuplasatsi',
      date: '2026-10-18',
      position: 0,
    });
    expect(updated.structuredContent).toMatchObject({ date: '2026-10-18', position: 0 });

    const plan = await callTool('get_week_plan', { from: '2026-10-17', to: '2026-10-23' });
    expect(plan.structuredContent).toMatchObject({
      entries: [
        { id, text: 'Uunilohi', note: 'tuplasatsi', recipe: { id: recipeId, title: 'Uunilohi' } },
        { text: 'Salaatti', recipe: null },
      ],
    });

    expect((await callTool('remove_week_plan_entry', { id })).isError).toBeFalsy();
    expect(
      (await callTool('get_week_plan', { from: '2026-10-18', to: '2026-10-18' }))
        .structuredContent,
    ).toMatchObject({ entries: [{ text: 'Salaatti' }] });

    const changes = await sql<{ source: string; userId: string }[]>`
      SELECT source, user_id FROM week_plan_changes
    `;
    expect(changes).toHaveLength(4);
    expect(changes.every((c) => c.source === 'mcp' && c.userId === user.id)).toBe(true);
  });

  it('returns errors for missing entries and recipes and invalid ranges', async () => {
    const missingRecipe = await callTool('add_week_plan_entry', {
      date: '2026-10-17',
      text: 'X',
      recipeId: missingId,
    });
    expect(missingRecipe.isError).toBe(true);
    expect(
      (await callTool('update_week_plan_entry', { id: missingId, text: 'X' })).isError,
    ).toBe(true);
    expect((await callTool('remove_week_plan_entry', { id: missingId })).isError).toBe(true);
    expect(
      (await callTool('get_week_plan', { from: '2026-10-17', to: '2026-10-16' })).isError,
    ).toBe(true);
  });
});
