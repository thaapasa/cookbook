import { beforeEach, describe, expect, it } from 'vitest';

import { login, request } from '../test/api.ts';
import { createUser, resetDatabase } from '../test/db.ts';

beforeEach(async () => {
  await resetDatabase();
  await createUser('cook', 'secret');
});

function postLogin(json: unknown) {
  return request('/api/auth/login', { method: 'POST', json });
}

describe('POST /api/auth/login', () => {
  it('sets an HTTP-only session cookie and returns the user', async () => {
    const res = await postLogin({ username: 'cook', password: 'secret' });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ username: 'cook', displayName: 'cook display' });
    expect(res.headers.get('set-cookie')).toMatch(/^session=[\w-]+;.*HttpOnly/);
  });

  it('rejects a wrong password', async () => {
    const res = await postLogin({ username: 'cook', password: 'wrong' });
    expect(res.status).toBe(401);
    expect(res.headers.get('set-cookie')).toBeNull();
  });

  it('rejects an unknown user with the same response', async () => {
    const res = await postLogin({ username: 'nobody', password: 'secret' });
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Invalid username or password' });
  });

  it('rejects a request without a password', async () => {
    expect((await postLogin({ username: 'cook' })).status).toBe(400);
    expect((await postLogin({ username: 'cook', password: '' })).status).toBe(400);
  });
});

describe('GET /api/auth/me', () => {
  it('returns the logged-in user', async () => {
    const cookie = await login('cook', 'secret');
    const res = await request('/api/auth/me', { cookie });
    expect(await res.json()).toMatchObject({ user: { username: 'cook' } });
  });

  it('returns null without a session', async () => {
    expect(await (await request('/api/auth/me')).json()).toEqual({ user: null });
    const forged = await request('/api/auth/me', { cookie: 'session=forged' });
    expect(await forged.json()).toEqual({ user: null });
  });
});

describe('POST /api/auth/logout', () => {
  it('ends the session', async () => {
    const cookie = await login('cook', 'secret');
    const res = await request('/api/auth/logout', { method: 'POST', cookie });
    expect(res.status).toBe(204);

    const me = await request('/api/auth/me', { cookie });
    expect(await me.json()).toEqual({ user: null });
  });
});
