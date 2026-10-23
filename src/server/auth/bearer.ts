import { createMiddleware } from 'hono/factory';

import type { User } from '../../shared/auth.ts';
import type { TokenKind } from '../../shared/profile.ts';
import { getTokenUser } from './user-tokens.ts';

export type TokenEnv = { Variables: { user: User } };

/**
 * Sets `c.var.user` from a bearer token of the kind, or rejects the request.
 * Session cookies and tokens of other kinds do not count.
 */
export function requireToken(kind: TokenKind) {
  return createMiddleware<TokenEnv>(async (c, next) => {
    const [scheme, token] = c.req.header('authorization')?.split(' ') ?? [];
    const user =
      scheme?.toLowerCase() === 'bearer' && token ? await getTokenUser(kind, token) : null;
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    c.set('user', user);
    await next();
  });
}
