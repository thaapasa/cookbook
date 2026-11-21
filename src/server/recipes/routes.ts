import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { z } from 'zod';

import {
  NoteInput,
  PhotoFlags,
  RecipeListQuery,
  SaveRecipeRequest,
  UpdateRecipeRequest,
} from '../../shared/recipe.ts';
import { type AuthEnv, requireUser } from '../auth/routes.ts';
import { deleteRecipeWithPhoto, removePhoto, replacePhoto } from './photos.ts';
import {
  addNote,
  createRecipe,
  deleteNote,
  getRecipe,
  listRecipes,
  listTags,
  setPhotoIllustration,
  updateNote,
  updateRecipe,
} from './repository.ts';

const IdParam = z.object({ id: z.uuid() });
const NoteParam = z.object({ id: z.uuid(), noteId: z.uuid() });

const maxPhotoBytes = 25 * 1024 * 1024;

const notFound = { error: 'Not found' } as const;

export const recipeRoutes = new Hono<AuthEnv>()
  .get('/', zValidator('query', RecipeListQuery), async (c) => {
    const { q, tag, page } = c.req.valid('query');
    return c.json(await listRecipes({ q, tags: tag, page }));
  })
  .post('/', requireUser, zValidator('json', SaveRecipeRequest), async (c) => {
    const { recipe, revisionNote } = c.req.valid('json');
    const author = { userId: c.var.user!.id, source: 'app' } as const;
    return c.json(await createRecipe(recipe, author, revisionNote), 201);
  })
  .get('/:id', zValidator('param', IdParam), async (c) => {
    const recipe = await getRecipe(c.req.valid('param').id);
    return recipe ? c.json(recipe) : c.json(notFound, 404);
  })
  .put(
    '/:id',
    requireUser,
    zValidator('param', IdParam),
    zValidator('json', UpdateRecipeRequest),
    async (c) => {
      const { recipe, revisionNote, version } = c.req.valid('json');
      const author = { userId: c.var.user!.id, source: 'app' } as const;
      const id = c.req.valid('param').id;
      const result = await updateRecipe(id, recipe, author, revisionNote, version);
      if (result === 'not-found') return c.json(notFound, 404);
      if (result === 'conflict') return c.json({ error: 'The recipe has changed' }, 409);
      return c.json({ version: result });
    },
  )
  .delete('/:id', requireUser, zValidator('param', IdParam), async (c) => {
    const deleted = await deleteRecipeWithPhoto(c.req.valid('param').id);
    return deleted ? c.body(null, 204) : c.json(notFound, 404);
  })
  .put(
    '/:id/photo',
    requireUser,
    zValidator('param', IdParam),
    bodyLimit({ maxSize: maxPhotoBytes }),
    async (c) => {
      const { photo, illustration } = await c.req.parseBody();
      if (!(photo instanceof File)) return c.json({ error: 'Missing photo' }, 400);
      if (illustration !== undefined && illustration !== 'true' && illustration !== 'false') {
        return c.json({ error: 'Invalid illustration flag' }, 400);
      }
      const data = Buffer.from(await photo.arrayBuffer());
      const result = await replacePhoto(c.req.valid('param').id, data, illustration === 'true');
      if (result === 'not-an-image') return c.json({ error: 'Not an image' }, 400);
      if (result === 'not-found') return c.json(notFound, 404);
      return c.json({ version: result });
    },
  )
  .patch(
    '/:id/photo',
    requireUser,
    zValidator('param', IdParam),
    zValidator('json', PhotoFlags),
    async (c) => {
      const { illustration } = c.req.valid('json');
      const version = await setPhotoIllustration(c.req.valid('param').id, illustration);
      return version === null ? c.json(notFound, 404) : c.json({ version });
    },
  )
  .delete('/:id/photo', requireUser, zValidator('param', IdParam), async (c) => {
    const version = await removePhoto(c.req.valid('param').id);
    return version === null ? c.json(notFound, 404) : c.json({ version });
  })
  .post(
    '/:id/notes',
    requireUser,
    zValidator('param', IdParam),
    zValidator('json', NoteInput),
    async (c) => {
      const added = await addNote(
        c.req.valid('param').id,
        c.var.user!.id,
        c.req.valid('json').text,
      );
      return added ? c.json(added, 201) : c.json(notFound, 404);
    },
  )
  .put(
    '/:id/notes/:noteId',
    requireUser,
    zValidator('param', NoteParam),
    zValidator('json', NoteInput),
    async (c) => {
      const { id, noteId } = c.req.valid('param');
      const version = await updateNote(id, noteId, c.req.valid('json').text);
      return version === null ? c.json(notFound, 404) : c.json({ version });
    },
  )
  .delete('/:id/notes/:noteId', requireUser, zValidator('param', NoteParam), async (c) => {
    const { id, noteId } = c.req.valid('param');
    const version = await deleteNote(id, noteId);
    return version === null ? c.json(notFound, 404) : c.json({ version });
  });

export const tagRoutes = new Hono<AuthEnv>().get('/', async (c) => c.json(await listTags()));
