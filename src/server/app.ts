import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';

import { sql } from './db.ts';

const clientDir = 'dist/client';

export const app = new Hono();

app.get('/api/health', async (c) => {
  await sql`SELECT 1`;
  return c.json({ status: 'ok' });
});

app.all('/api/*', (c) => c.notFound());

app.use('/*', serveStatic({ root: clientDir }));
// Client-side routes get the app shell.
app.get('*', serveStatic({ path: `${clientDir}/index.html` }));
