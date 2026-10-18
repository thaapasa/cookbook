import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { csrf } from 'hono/csrf';

import { type AuthEnv, authRoutes, sessionMiddleware } from './auth/routes.ts';
import { sql } from './db.ts';
import { imagesDir } from './images.ts';
import { mcpRoutes } from './mcp/routes.ts';
import { recipeRoutes, tagRoutes } from './recipes/routes.ts';
import { weekPlanRoutes } from './week-plan/routes.ts';

const clientDir = 'dist/client';

export const app = new Hono<AuthEnv>();

app.use('/api/*', csrf(), sessionMiddleware);

app.get('/api/health', async (c) => {
  await sql`SELECT 1`;
  return c.json({ status: 'ok' });
});

app.route('/api/auth', authRoutes);
app.route('/api/recipes', recipeRoutes);
app.route('/api/tags', tagRoutes);
app.route('/api/week-plan', weekPlanRoutes);

app.all('/api/*', (c) => c.notFound());

// MCP clients authenticate with a bearer token instead of the session cookie.
app.route('/mcp', mcpRoutes);

// Each upload gets a new file name, so the files never change.
app.use(
  '/images/*',
  serveStatic({
    root: imagesDir,
    rewriteRequestPath: (p) => p.replace(/^\/images/, ''),
    onFound: (_path, c) => c.header('cache-control', 'public, max-age=31536000, immutable'),
  }),
);
app.all('/images/*', (c) => c.notFound());

app.use('/*', serveStatic({ root: clientDir }));
// Client-side routes get the app shell.
app.get('*', serveStatic({ path: `${clientDir}/index.html` }));
