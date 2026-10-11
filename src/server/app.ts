import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { csrf } from 'hono/csrf';

import { type AuthEnv, authRoutes, sessionMiddleware } from './auth/routes.ts';
import { sql } from './db.ts';
import { recipeRoutes, tagRoutes } from './recipes/routes.ts';

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

app.all('/api/*', (c) => c.notFound());

app.use('/*', serveStatic({ root: clientDir }));
// Client-side routes get the app shell.
app.get('*', serveStatic({ path: `${clientDir}/index.html` }));
