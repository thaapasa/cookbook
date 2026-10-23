import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';

import { WeekQuery } from '../../shared/integration.ts';
import { WeekPlanQuery } from '../../shared/week-plan.ts';
import { requireToken, type TokenEnv } from '../auth/bearer.ts';
import { openApiDocument } from './openapi.ts';
import { getDays, getSettings, getWeek } from './service.ts';

/** Validates the query, and answers 400 with the problems as text. */
function query<T extends z.ZodType>(schema: T) {
  return zValidator('query', schema, (result, c) => {
    if (!result.success) return c.json({ error: z.prettifyError(result.error) }, 400);
  });
}

const api = new Hono<TokenEnv>()
  .use(requireToken('integration'))
  .get('/settings', (c) => c.json(getSettings()))
  .get('/week', query(WeekQuery), async (c) => c.json(await getWeek(c.req.valid('query').date)))
  .get('/days', query(WeekPlanQuery), async (c) => {
    const { from, to } = c.req.valid('query');
    return c.json(await getDays(from, to));
  });

/** The integration API for other systems. Only the OpenAPI description is public. */
export const integrationRoutes = new Hono()
  .get('/openapi.json', (c) => c.json(openApiDocument))
  .route('/', api);
