import { createMcpHandler } from '@modelcontextprotocol/server';
import { Hono } from 'hono';
import { createMiddleware } from 'hono/factory';

import type { User } from '../../shared/auth.ts';
import { getTokenUser } from '../auth/user-tokens.ts';
import { createMcpServer } from './server.ts';

type McpEnv = { Variables: { user: User } };

/** Sets `c.var.user` from the bearer token, or rejects the request. */
const requireToken = createMiddleware<McpEnv>(async (c, next) => {
  const [scheme, token] = c.req.header('authorization')?.split(' ') ?? [];
  const user =
    scheme?.toLowerCase() === 'bearer' && token ? await getTokenUser('mcp', token) : null;
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  c.set('user', user);
  await next();
});

const handler = createMcpHandler(
  ({ authInfo }) => createMcpServer(authInfo!.extra!.user as User),
  // Room for a 25 MB photo as base64 in `set_recipe_photo`.
  { maxRequestBodySize: 35 * 1024 * 1024 },
);

export const mcpRoutes = new Hono<McpEnv>().use(requireToken).all('/', (c) =>
  handler.fetch(c.req.raw, {
    authInfo: { token: '', clientId: c.var.user.id, scopes: [], extra: { user: c.var.user } },
  }),
);
