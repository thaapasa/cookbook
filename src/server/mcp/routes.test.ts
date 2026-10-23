import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { beforeEach, describe, expect, it } from 'vitest';

import { app } from '../app.ts';
import { generateToken } from '../auth/user-tokens.ts';
import { sql } from '../db.ts';
import { origin } from '../test/api.ts';
import { createUser, resetDatabase, setMcpToken } from '../test/db.ts';

const url = `${origin}/mcp`;

let userId: string;
let token: string;

beforeEach(async () => {
  await resetDatabase();
  userId = await createUser('cook');
  token = await setMcpToken(userId);
});

function post(authorization?: string) {
  const headers = new Headers({
    'content-type': 'application/json',
    accept: 'application/json, text/event-stream',
  });
  if (authorization) headers.set('authorization', authorization);
  return app.request(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
  });
}

/** Connects an MCP client that sends its requests to the app. */
async function connect(): Promise<Client> {
  const transport = new StreamableHTTPClientTransport(new URL(url), {
    requestInit: { headers: { authorization: `Bearer ${token}` } },
    fetch: (input, init) => Promise.resolve(app.request(input, init)),
  });
  const client = new Client({ name: 'test', version: '1.0.0' });
  await client.connect(transport);
  return client;
}

describe('authentication', () => {
  it('rejects requests without a token', async () => {
    expect((await post()).status).toBe(401);
  });

  it('rejects an unknown token', async () => {
    expect((await post('Bearer wrong')).status).toBe(401);
  });

  it('rejects a token in another scheme', async () => {
    expect((await post(`Basic ${token}`)).status).toBe(401);
  });

  it('rejects an integration token', async () => {
    const integration = await generateToken(userId, 'integration');
    expect((await post(`Bearer ${integration}`)).status).toBe(401);
  });

  it('rejects a replaced token', async () => {
    const old = token;
    token = await setMcpToken(userId);
    expect((await post(`Bearer ${old}`)).status).toBe(401);
  });
});

describe('tools', () => {
  it('lists the tools', async () => {
    const client = await connect();
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual([
      'add_note',
      'add_week_plan_entry',
      'create_recipe',
      'delete_recipe',
      'get_ingredients',
      'get_recipe',
      'get_week_plan',
      'list_ingredient_names',
      'list_tags',
      'remove_week_plan_entry',
      'search_recipes',
      'set_recipe_photo',
      'set_recipe_photo_from_url',
      'update_recipe',
      'update_week_plan_entry',
    ]);
  });

  it('creates and reads a recipe as the token user', async () => {
    const client = await connect();
    const created = await client.callTool({
      name: 'create_recipe',
      arguments: { recipe: { title: 'Pulla' } },
    });
    const { id } = created.structuredContent as { id: string };

    const read = await client.callTool({ name: 'get_recipe', arguments: { id } });
    expect(read.structuredContent).toMatchObject({ id, title: 'Pulla' });

    const [revision] = await sql`SELECT user_id, source FROM revisions WHERE recipe_id = ${id}`;
    expect(revision).toEqual({ userId, source: 'mcp' });
  });

  it('accepts a photo larger than the default request limit', async () => {
    const client = await connect();
    const { id } = (
      await client.callTool({ name: 'create_recipe', arguments: { recipe: { title: 'Pulla' } } })
    ).structuredContent as { id: string };

    // Not an image, so the tool fails, but only after the request is read.
    const data = Buffer.alloc(6 * 1024 * 1024).toString('base64');
    const res = await client.callTool({ name: 'set_recipe_photo', arguments: { id, data } });
    expect(res.content).toEqual([{ type: 'text', text: 'The data is not an image' }]);
  });
});
