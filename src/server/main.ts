import { serve } from '@hono/node-server';

import { app } from './app.ts';
import { syncPhotoSizes } from './images.ts';
import { migrate } from './migrate.ts';

const port = Number(process.env.PORT ?? 10300);

await migrate();

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Listening on http://localhost:${info.port}`);
});

// In the background, so that the server answers the health check at once.
syncPhotoSizes().catch((error: unknown) => console.error('Could not sync photo sizes:', error));
