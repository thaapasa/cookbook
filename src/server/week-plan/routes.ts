import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';

import { AddEntryInput, UpdateEntryInput, WeekPlanQuery } from '../../shared/week-plan.ts';
import { type AuthEnv, requireUser } from '../auth/routes.ts';
import { addEntry, listChanges, listEntries, removeEntry, updateEntry } from './repository.ts';

const IdParam = z.object({ id: z.uuid() });

const unknownRecipe = { error: 'Unknown recipe' };

export const weekPlanRoutes = new Hono<AuthEnv>()
  .use(requireUser)
  .get('/', zValidator('query', WeekPlanQuery), async (c) => {
    const { from, to } = c.req.valid('query');
    return c.json(await listEntries(from, to));
  })
  .get('/changes', zValidator('query', WeekPlanQuery), async (c) => {
    const { from, to } = c.req.valid('query');
    return c.json(await listChanges(from, to));
  })
  .post('/entries', zValidator('json', AddEntryInput), async (c) => {
    const entry = await addEntry(c.req.valid('json'), { userId: c.var.user!.id, source: 'app' });
    return entry === 'recipe-not-found' ? c.json(unknownRecipe, 400) : c.json(entry, 201);
  })
  .patch(
    '/entries/:id',
    zValidator('param', IdParam),
    zValidator('json', UpdateEntryInput),
    async (c) => {
      const author = { userId: c.var.user!.id, source: 'app' } as const;
      const entry = await updateEntry(c.req.valid('param').id, c.req.valid('json'), author);
      if (entry === 'not-found') return c.json({ error: 'Not found' }, 404);
      if (entry === 'recipe-not-found') return c.json(unknownRecipe, 400);
      return c.json(entry);
    },
  )
  .delete('/entries/:id', zValidator('param', IdParam), async (c) => {
    const author = { userId: c.var.user!.id, source: 'app' } as const;
    const removed = await removeEntry(c.req.valid('param').id, author);
    return removed ? c.body(null, 204) : c.json({ error: 'Not found' }, 404);
  });
