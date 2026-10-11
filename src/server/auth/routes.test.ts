import { beforeEach, describe, expect, it } from 'vitest';

import { app } from '../app.ts';
import { createUser, resetDatabase } from '../test/db.ts';

function login(username: string, password: string) {
  return app.request('/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
}

describe('auth routes', () => {
  beforeEach(async () => {
    await resetDatabase();
    await createUser('cook', 'secret');
  });

  it('logs in and returns the user from the session cookie', async () => {
    const res = await login('cook', 'secret');
    expect(res.status).toBe(200);

    const cookie = res.headers.get('set-cookie')?.split(';')[0];
    expect(cookie).toMatch(/^session=/);

    const me = await app.request('/api/auth/me', { headers: { cookie: cookie! } });
    expect(await me.json()).toMatchObject({ user: { username: 'cook' } });
  });

  it('rejects a wrong password', async () => {
    const res = await login('cook', 'wrong');
    expect(res.status).toBe(401);
    expect(res.headers.get('set-cookie')).toBeNull();
  });
});
