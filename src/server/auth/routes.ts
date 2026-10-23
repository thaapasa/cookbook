import { zValidator } from '@hono/zod-validator';
import type { Context } from 'hono';
import { Hono } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { createMiddleware } from 'hono/factory';

import { LoginRequest, type User } from '../../shared/auth.ts';
import { sql } from '../db.ts';
import { hashPassword, verifyPassword } from './password.ts';
import { createSession, deleteSession, getSessionUser } from './sessions.ts';

export type AuthEnv = { Variables: { user: User | null } };

const cookieName = 'session';

// Verified against when the username does not exist, so that response time
// does not reveal which usernames exist.
const dummyHash = hashPassword(crypto.randomUUID());

/** Returns the session token from the cookie. */
export function getSessionToken(c: Context): string | undefined {
  return getCookie(c, cookieName);
}

/** Sets `c.var.user` from the session cookie. */
export const sessionMiddleware = createMiddleware<AuthEnv>(async (c, next) => {
  const token = getSessionToken(c);
  c.set('user', token ? await getSessionUser(token) : null);
  await next();
});

/** Rejects requests without a logged-in user. */
export const requireUser = createMiddleware<AuthEnv>(async (c, next) => {
  if (!c.var.user) return c.json({ error: 'Unauthorized' }, 401);
  await next();
});

function setSessionCookie(c: Context, token: string) {
  setCookie(c, cookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Lax',
    path: '/',
    maxAge: 90 * 24 * 60 * 60,
  });
}

export const authRoutes = new Hono<AuthEnv>()
  .post('/login', zValidator('json', LoginRequest), async (c) => {
    const { username, password } = c.req.valid('json');
    const [row] = await sql<(User & { passwordHash: string })[]>`
      SELECT id, username, display_name, password_hash FROM users WHERE username = ${username}
    `;
    const valid = await verifyPassword(password, row?.passwordHash ?? (await dummyHash));
    if (!row || !valid) {
      return c.json({ error: 'Invalid username or password' }, 401);
    }
    setSessionCookie(c, await createSession(row.id));
    return c.json({ id: row.id, username: row.username, displayName: row.displayName });
  })
  .post('/logout', async (c) => {
    const token = getSessionToken(c);
    if (token) await deleteSession(token);
    deleteCookie(c, cookieName, { path: '/' });
    return c.body(null, 204);
  })
  .get('/me', (c) => c.json({ user: c.var.user }));
