import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { z } from 'zod';

import { NoteInput, RecipeListQuery, SaveRecipeRequest } from '../../shared/recipe.ts';
import { type AuthEnv, requireUser } from '../auth/routes.ts';
import { deletePhoto, savePhoto } from '../images.ts';
import {
  addNote,
  createRecipe,
  deleteNote,
  getRecipe,
  listRecipes,
  listTags,
  setPhotoPath,
  updateNote,
  updateRecipe,
} from './repository.ts';

const IdParam = z.object({ id: z.uuid() });
const NoteParam = z.object({ id: z.uuid(), noteId: z.uuid() });

const maxPhotoBytes = 25 * 1024 * 1024;

export const recipeRoutes = new Hono<AuthEnv>()
  .get('/', zValidator('query', RecipeListQuery), async (c) => {
    const { q, tag, page } = c.req.valid('query');
    return c.json(await listRecipes({ q, tags: tag, page }));
  })
  .post('/', requireUser, zValidator('json', SaveRecipeRequest), async (c) => {
    const { recipe, revisionNote } = c.req.valid('json');
    const id = await createRecipe(recipe, { userId: c.var.user!.id, source: 'app' }, revisionNote);
    return c.json({ id }, 201);
  })
  .get('/:id', zValidator('param', IdParam), async (c) => {
    const recipe = await getRecipe(c.req.valid('param').id);
    return recipe ? c.json(recipe) : c.json({ error: 'Not found' }, 404);
  })
  .put(
    '/:id',
    requireUser,
    zValidator('param', IdParam),
    zValidator('json', SaveRecipeRequest),
    async (c) => {
      const { recipe, revisionNote } = c.req.valid('json');
      const author = { userId: c.var.user!.id, source: 'app' } as const;
      const updated = await updateRecipe(c.req.valid('param').id, recipe, author, revisionNote);
      return updated ? c.body(null, 204) : c.json({ error: 'Not found' }, 404);
    },
  )
  .put(
    '/:id/photo',
    requireUser,
    zValidator('param', IdParam),
    bodyLimit({ maxSize: maxPhotoBytes }),
    async (c) => {
      const { photo } = await c.req.parseBody();
      if (!(photo instanceof File)) return c.json({ error: 'Missing photo' }, 400);
      let name: string;
      try {
        name = await savePhoto(Buffer.from(await photo.arrayBuffer()));
      } catch {
        return c.json({ error: 'Not an image' }, 400);
      }
      const previous = await setPhotoPath(c.req.valid('param').id, name);
      if (previous === undefined) {
        await deletePhoto(name);
        return c.json({ error: 'Not found' }, 404);
      }
      if (previous) await deletePhoto(previous);
      return c.body(null, 204);
    },
  )
  .delete('/:id/photo', requireUser, zValidator('param', IdParam), async (c) => {
    const previous = await setPhotoPath(c.req.valid('param').id, null);
    if (previous === undefined) return c.json({ error: 'Not found' }, 404);
    if (previous) await deletePhoto(previous);
    return c.body(null, 204);
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
  )
  .put(
    '/:id/notes/:noteId',
    requireUser,
    zValidator('param', NoteParam),
    zValidator('json', NoteInput),
    async (c) => {
      const { id, noteId } = c.req.valid('param');
      const updated = await updateNote(id, noteId, c.req.valid('json').text);
      return updated ? c.body(null, 204) : c.json({ error: 'Not found' }, 404);
    },
  )
  .delete('/:id/notes/:noteId', requireUser, zValidator('param', NoteParam), async (c) => {
    const { id, noteId } = c.req.valid('param');
    return (await deleteNote(id, noteId)) ? c.body(null, 204) : c.json({ error: 'Not found' }, 404);
  });

export const tagRoutes = new Hono<AuthEnv>().get('/', async (c) => c.json(await listTags()));
