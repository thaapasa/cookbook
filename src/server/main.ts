import { serve } from '@hono/node-server';

import { app } from './app.ts';
import { migrate } from './migrate.ts';

const port = Number(process.env.PORT ?? 3000);

await migrate();

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Listening on http://localhost:${info.port}`);
});
