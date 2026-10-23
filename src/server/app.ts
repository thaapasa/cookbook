import { serveStatic } from '@hono/node-server/serve-static';
import { Hono, type MiddlewareHandler } from 'hono';
import { csrf } from 'hono/csrf';

import { type AuthEnv, authRoutes, sessionMiddleware } from './auth/routes.ts';
import { sql } from './db.ts';
import { imagesDir } from './images.ts';
import { mcpRoutes } from './mcp/routes.ts';
import { profileRoutes } from './profile/routes.ts';
import { recipeRoutes, tagRoutes } from './recipes/routes.ts';
import { weekPlanRoutes } from './week-plan/routes.ts';

const clientDir = 'dist/client';

export const app = new Hono<AuthEnv>();

app.get('/health', async (c) => {
  await sql`SELECT 1`;
  return c.json({ status: 'ok' });
});

// The API of the app's own client, which authenticates with the session cookie.
app.use('/api/app/*', csrf(), sessionMiddleware);
app.route('/api/app/auth', authRoutes);
app.route('/api/app/profile', profileRoutes);
app.route('/api/app/recipes', recipeRoutes);
app.route('/api/app/tags', tagRoutes);
app.route('/api/app/week-plan', weekPlanRoutes);

app.all('/api/*', (c) => c.notFound());

// MCP clients authenticate with a bearer token instead of the session cookie.
app.route('/mcp', mcpRoutes);

const immutable = 'public, max-age=31536000, immutable';

// Each upload gets a new file name, so the files never change.
app.use(
  '/images/*',
  cacheControl(immutable),
  serveStatic({
    root: imagesDir,
    rewriteRequestPath: (p) => p.replace(/^\/images/, ''),
  }),
);
app.all('/images/*', (c) => c.notFound());

// Built assets have a content hash in the file name.
app.use('/assets/*', cacheControl(immutable), serveStatic({ root: clientDir }));
app.all('/assets/*', (c) => c.notFound());

// Other files, such as index.html and version.json, must be checked on each load
// to get a new version.
app.use('/*', cacheControl('no-cache'), serveStatic({ root: clientDir }));
// Client-side routes get the app shell.
app.get('*', cacheControl('no-cache'), serveStatic({ path: `${clientDir}/index.html` }));

/**
 * Sets `cache-control` on successful responses. The `onFound` option of
 * `serveStatic` runs after the response is built, so headers set there are lost.
 */
function cacheControl(value: string): MiddlewareHandler {
  return async (c, next) => {
    await next();
    if (c.res.ok) c.header('cache-control', value);
  };
}
