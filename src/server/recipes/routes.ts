import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';

import { NoteInput, RecipeListQuery } from '../../shared/recipe.ts';
import { type AuthEnv, requireUser } from '../auth/routes.ts';
import { addNote, getRecipe, listRecipes, listTags } from './repository.ts';

const IdParam = z.object({ id: z.uuid() });

export const recipeRoutes = new Hono<AuthEnv>()
  .get('/', zValidator('query', RecipeListQuery), async (c) => {
    const { q, tag, page } = c.req.valid('query');
    return c.json(await listRecipes({ q, tags: tag, page }));
  })
  .get('/:id', zValidator('param', IdParam), async (c) => {
    const recipe = await getRecipe(c.req.valid('param').id);
    return recipe ? c.json(recipe) : c.json({ error: 'Not found' }, 404);
  })
  .post(
    '/:id/notes',
    requireUser,
    zValidator('param', IdParam),
    zValidator('json', NoteInput),
    async (c) => {
      const note = await addNote(c.req.valid('param').id, c.var.user!.id, c.req.valid('json').text);
      return note ? c.json(note, 201) : c.json({ error: 'Not found' }, 404);
    },
  );

export const tagRoutes = new Hono<AuthEnv>().get('/', async (c) => c.json(await listTags()));
