import { createMcpHandler } from '@modelcontextprotocol/server';
import { Hono } from 'hono';

import type { User } from '../../shared/auth.ts';
import { requireToken, type TokenEnv } from '../auth/bearer.ts';
import { createMcpServer } from './server.ts';

const handler = createMcpHandler(
  ({ authInfo }) => createMcpServer(authInfo!.extra!.user as User),
  // Room for a 25 MB photo as base64 in `set_recipe_photo`.
  { maxRequestBodySize: 35 * 1024 * 1024 },
);

export const mcpRoutes = new Hono<TokenEnv>().use(requireToken('mcp')).all('/', (c) =>
  handler.fetch(c.req.raw, {
    authInfo: { token: '', clientId: c.var.user.id, scopes: [], extra: { user: c.var.user } },
  }),
);
