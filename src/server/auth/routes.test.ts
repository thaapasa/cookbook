import { beforeEach, describe, expect, it } from 'vitest';

import { login, request } from '../test/api.ts';
import { createUser, resetDatabase } from '../test/db.ts';
import { resetLoginAttempts } from './login-limit.ts';

beforeEach(async () => {
  resetLoginAttempts();
  await resetDatabase();
  await createUser('cook', 'secret');
});

function postLogin(json: unknown, ip?: string) {
  const headers = ip ? { 'x-forwarded-for': ip } : undefined;
  return request('/api/app/auth/login', { method: 'POST', json, headers });
}

describe('POST /api/app/auth/login', () => {
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

describe('login attempt limits', () => {
  it('blocks a username after 10 failed logins, also with the right password', async () => {
    for (let i = 0; i < 10; i++) {
      expect((await postLogin({ username: 'cook', password: 'wrong' })).status).toBe(401);
    }
    const res = await postLogin({ username: 'cook', password: 'secret' });
    expect(res.status).toBe(429);
    expect(res.headers.get('retry-after')).toBe('900');
    expect(res.headers.get('set-cookie')).toBeNull();
  });

  it('does not count successful logins', async () => {
    for (let i = 0; i < 12; i++) {
      expect((await postLogin({ username: 'cook', password: 'secret' })).status).toBe(200);
    }
  });

  it('blocks an address after 30 failed logins with any usernames', async () => {
    for (let i = 0; i < 30; i++) {
      const res = await postLogin({ username: `guess${i}`, password: 'wrong' }, '203.0.113.1');
      expect(res.status).toBe(401);
    }
    const blocked = await postLogin({ username: 'cook', password: 'secret' }, '203.0.113.1');
    expect(blocked.status).toBe(429);
    const other = await postLogin({ username: 'cook', password: 'secret' }, '203.0.113.2');
    expect(other.status).toBe(200);
  });

  it('uses the last forwarded address, which the proxy adds', async () => {
    for (let i = 0; i < 30; i++) {
      // The client sets the first address. A new one on each request does not help.
      const ip = `198.51.100.${i}, 203.0.113.1`;
      await postLogin({ username: `guess${i}`, password: 'wrong' }, ip);
    }
    const res = await postLogin({ username: 'cook', password: 'secret' }, '192.0.2.1, 203.0.113.1');
    expect(res.status).toBe(429);
  });
});

describe('request body limit', () => {
  it('rejects a body larger than 1 MB', async () => {
    const res = await postLogin({ username: 'cook', password: 'x'.repeat(1024 * 1024) });
    expect(res.status).toBe(413);
  });
});

describe('GET /api/app/auth/me', () => {
  it('returns the logged-in user', async () => {
    const cookie = await login('cook', 'secret');
    const res = await request('/api/app/auth/me', { cookie });
    expect(await res.json()).toMatchObject({ user: { username: 'cook' } });
  });

  it('returns null without a session', async () => {
    expect(await (await request('/api/app/auth/me')).json()).toEqual({ user: null });
    const forged = await request('/api/app/auth/me', { cookie: 'session=forged' });
    expect(await forged.json()).toEqual({ user: null });
  });
});

describe('POST /api/app/auth/logout', () => {
  it('ends the session', async () => {
    const cookie = await login('cook', 'secret');
    const res = await request('/api/app/auth/logout', { method: 'POST', cookie });
    expect(res.status).toBe(204);

    const me = await request('/api/app/auth/me', { cookie });
    expect(await me.json()).toEqual({ user: null });
  });
});
