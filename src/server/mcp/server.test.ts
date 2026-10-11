import { Client, InMemoryTransport } from '@modelcontextprotocol/client';
import { beforeEach, describe, expect, it } from 'vitest';

import type { User } from '../../shared/auth.ts';
import { sql } from '../db.ts';
import { getRecipe } from '../recipes/repository.ts';
import { addRecipe, createUser, resetDatabase } from '../test/db.ts';
import { createMcpServer } from './server.ts';

const missingId = '00000000-0000-7000-8000-000000000000';

let user: User;
let client: Client;

beforeEach(async () => {
  await resetDatabase();
  user = { id: await createUser('cook'), username: 'cook', displayName: 'cook display' };
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
