import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';

import { ConfirmPasswordRequest, TokenKind, UpdateProfileRequest } from '../../shared/profile.ts';
import { type AuthEnv, getSessionToken, requireUser } from '../auth/routes.ts';
import { generateToken } from '../auth/user-tokens.ts';
import { checkPassword, getProfile, resetPassword, setDisplayName } from './repository.ts';

const KindParam = z.object({ kind: TokenKind });

// 403 and not 401, so that the client can tell a wrong password from a lost session.
const wrongPassword = { error: 'Wrong password' } as const;

export const profileRoutes = new Hono<AuthEnv>()
  .use(requireUser)
  .get('/', async (c) => {
    const profile = await getProfile(c.var.user!.id);
    return profile ? c.json(profile) : c.json({ error: 'Not found' }, 404);
  })
  .patch('/', zValidator('json', UpdateProfileRequest), async (c) => {
    const user = await setDisplayName(c.var.user!.id, c.req.valid('json').displayName);
    return user ? c.json(user) : c.json({ error: 'Not found' }, 404);
  })
  .post('/password', zValidator('json', ConfirmPasswordRequest), async (c) => {
    const userId = c.var.user!.id;
    if (!(await checkPassword(userId, c.req.valid('json').currentPassword))) {
      return c.json(wrongPassword, 403);
    }
    return c.json({ password: await resetPassword(userId, getSessionToken(c)!) });
  })
  .post(
    '/tokens/:kind',
    zValidator('param', KindParam),
    zValidator('json', ConfirmPasswordRequest),
    async (c) => {
      const userId = c.var.user!.id;
      if (!(await checkPassword(userId, c.req.valid('json').currentPassword))) {
        return c.json(wrongPassword, 403);
      }
      return c.json({ token: await generateToken(userId, c.req.valid('param').kind) });
    },
  );
