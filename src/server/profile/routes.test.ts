import { beforeEach, describe, expect, it } from 'vitest';

import type { Profile } from '../../shared/profile.ts';
import { login, request } from '../test/api.ts';
import { createUser, resetDatabase } from '../test/db.ts';

let cookie: string;

beforeEach(async () => {
  await resetDatabase();
  await createUser('cook', 'secret');
  cookie = await login('cook', 'secret');
});

function post(path: string, json: unknown, session = cookie) {
  return request(`/api/app/profile${path}`, { method: 'POST', json, cookie: session });
}

async function getProfile(): Promise<Profile> {
  return (await (await request('/api/app/profile', { cookie })).json()) as Profile;
}

async function postJson<T>(path: string, json: unknown): Promise<T> {
  const res = await post(path, json);
  expect(res.status).toBe(200);
  return (await res.json()) as T;
}

describe('authentication', () => {
  it('rejects requests without a session', async () => {
    expect((await request('/api/app/profile')).status).toBe(401);
    const patch = await request('/api/app/profile', {
      method: 'PATCH',
      json: { displayName: 'X' },
    });
    expect(patch.status).toBe(401);
    expect((await post('/password', { currentPassword: 'secret' }, '')).status).toBe(401);
    expect((await post('/tokens/mcp', { currentPassword: 'secret' }, '')).status).toBe(401);
  });

  it('rejects a reset with a wrong current password and changes nothing', async () => {
    const res = await post('/password', { currentPassword: 'wrong' });
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'Wrong password' });
    await login('cook', 'secret');
  });

  it('rejects a token with a wrong current password', async () => {
    expect((await post('/tokens/mcp', { currentPassword: 'wrong' })).status).toBe(403);
    expect((await getProfile()).tokens.mcp).toBeNull();
  });
});

describe('validation', () => {
  it('rejects an empty display name', async () => {
    for (const displayName of ['', '   ']) {
      const res = await request('/api/app/profile', {
        method: 'PATCH',
        json: { displayName },
        cookie,
      });
      expect(res.status).toBe(400);
    }
  });

  it('rejects a missing current password', async () => {
    expect((await post('/password', {})).status).toBe(400);
    expect((await post('/tokens/mcp', { currentPassword: '' })).status).toBe(400);
  });

  it('rejects an unknown token kind', async () => {
    expect((await post('/tokens/session', { currentPassword: 'secret' })).status).toBe(400);
  });
});

describe('profile', () => {
  it('returns the profile and changes the display name', async () => {
    const res = await request('/api/app/profile', {
      method: 'PATCH',
      json: { displayName: ' Kokki ' },
      cookie,
    });
    expect(await res.json()).toMatchObject({ username: 'cook', displayName: 'Kokki' });

    expect(await getProfile()).toMatchObject({
      username: 'cook',
      displayName: 'Kokki',
      tokens: { mcp: null, integration: null },
    });
  });

  it('resets the password, so that only the new one logs in', async () => {
    const { password } = await postJson<{ password: string }>('/password', {
      currentPassword: 'secret',
    });
    expect(password).toMatch(/^[A-Za-z0-9]{20}$/);

    await login('cook', password);
    await expect(login('cook', 'secret')).rejects.toThrow('401');
    // The session that reset the password stays.
    const me = await request('/api/app/auth/me', { cookie });
    expect(await me.json()).toMatchObject({ user: { username: 'cook' } });
  });

  it('generates a token and shows its last characters', async () => {
    const { token } = await postJson<{ token: string }>('/tokens/mcp', {
      currentPassword: 'secret',
    });
    expect(token).toMatch(/^ckb_mcp_/);

    expect((await getProfile()).tokens.mcp?.lastChars).toBe(token.slice(-4));
  });
});
