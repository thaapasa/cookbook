import { validate } from '@readme/openapi-parser';
import { beforeEach, describe, expect, it } from 'vitest';

import { DayRange, Settings, Week } from '../../shared/integration.ts';
import { app } from '../app.ts';
import { generateToken } from '../auth/user-tokens.ts';
import { login } from '../test/api.ts';
import { createUser, resetDatabase, setMcpToken } from '../test/db.ts';

let userId: string;
let token: string;

beforeEach(async () => {
  await resetDatabase();
  userId = await createUser('cook', 'secret');
  token = await generateToken(userId, 'integration');
});

function get(path: string, headers: Record<string, string> = { authorization: `Bearer ${token}` }) {
  return Promise.resolve(app.request(`/api/v1${path}`, { headers }));
}

async function getJson(path: string): Promise<unknown> {
  const res = await get(path);
  expect(res.status).toBe(200);
  return res.json();
}

describe('authentication', () => {
  const paths = ['/settings', '/week', '/days?from=2026-10-17&to=2026-10-23'];

  it('rejects requests without a token', async () => {
    for (const path of paths) expect((await get(path, {})).status).toBe(401);
  });

  it('rejects an unknown token', async () => {
    expect((await get('/week', { authorization: 'Bearer wrong' })).status).toBe(401);
  });

  it('rejects a token in another scheme', async () => {
    expect((await get('/week', { authorization: `Basic ${token}` })).status).toBe(401);
  });

  it('rejects an MCP token', async () => {
    const mcp = await setMcpToken(userId);
    expect((await get('/week', { authorization: `Bearer ${mcp}` })).status).toBe(401);
  });

  it('rejects a session cookie', async () => {
    const cookie = await login('cook', 'secret');
    expect((await get('/week', { cookie })).status).toBe(401);
  });

  it("accepts any user's integration token", async () => {
    const other = await generateToken(await createUser('other'), 'integration');
    expect((await get('/week', { authorization: `Bearer ${other}` })).status).toBe(200);
  });
});

describe('input validation', () => {
  it.each([
    '/week?date=2026-02-30',
    '/week?date=today',
    '/days?from=2026-10-17',
    '/days?from=2026-10-23&to=2026-10-17',
    '/days?from=2026-01-01&to=2027-01-02',
  ])('rejects %s', async (path) => {
    const res = await get(path);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: expect.any(String) as string });
  });

  it('accepts a range of 366 days', async () => {
    const range = DayRange.parse(await getJson('/days?from=2028-01-01&to=2028-12-31'));
    expect(range.days).toHaveLength(366);
  });
});

describe('responses', () => {
  it('returns the settings', async () => {
    expect(Settings.parse(await getJson('/settings'))).toEqual({ weekStartDay: 'saturday' });
  });

  it('returns a week with an entry that was added in the app', async () => {
    const cookie = await login('cook', 'secret');
    const added = await app.request('/api/app/week-plan/entries', {
      method: 'POST',
      headers: { cookie, origin: 'http://localhost', 'content-type': 'application/json' },
      body: JSON.stringify({ date: '2026-10-20', text: 'Lohta', note: 'tuplasatsi' }),
    });
    expect(added.status).toBe(201);

    const week = Week.parse(await getJson('/week?date=2026-10-20'));

    expect(week.start).toBe('2026-10-17');
    expect(week.days[3]).toMatchObject({
      date: '2026-10-20',
      entries: [{ text: 'Lohta', note: 'tuplasatsi', recipe: null }],
    });
  });
});

describe('GET /api/v1/openapi.json', () => {
  it('is a valid OpenAPI description without a token', async () => {
    const res = await get('/openapi.json', {});
    expect(res.status).toBe(200);
    const doc = (await res.json()) as Parameters<typeof validate>[0];

    const result = await validate(doc);

    expect(result).toMatchObject({ valid: true });
    expect(doc).toMatchObject({ servers: [{ url: 'https://reseptit.example/api/v1' }] });
  });
});
