import { beforeEach, describe, expect, it } from 'vitest';

import { RecipeInput, recipePageSize } from '../../shared/recipe.ts';
import { sql } from '../db.ts';
import { addRecipe, createUser, resetDatabase } from '../test/db.ts';
import {
  addNote,
  type Author,
  deleteNote,
  getRecipe,
  listRecipes,
  listTags,
  setPhotoPath,
  updateNote,
  updateRecipe,
} from './repository.ts';

const missingId = '00000000-0000-7000-8000-000000000000';

let author: Author;

beforeEach(async () => {
  await resetDatabase();
  author = { userId: await createUser('cook'), source: 'app' };
});

async function revisions(recipeId: string) {
  return sql<{ source: string; note: string | null; snapshot: { title: string } }[]>`
    SELECT source, note, snapshot FROM revisions WHERE recipe_id = ${recipeId} ORDER BY id
  `;
}

describe('createRecipe and getRecipe', () => {
  it('stores the full content of a recipe', async () => {
    const id = await addRecipe(author, {
      title: 'Mustikkapiirakka',
      description: 'Kesän paras piirakka.',
      servings: '1 pelti',
      activeMinutes: 30,
      totalMinutes: 75,
      source: 'https://example.com/piirakka',
      tags: ['leivonnainen', 'jälkiruoka'],
      ingredientGroups: [
        {
          name: 'Pohja',
          ingredients: [
            { amount: '200 g', name: 'voi', note: 'huoneenlämpöinen' },
            { amount: '2 dl', name: 'sokeri' },
          ],
        },
        { name: 'Täyte', ingredients: [{ amount: '500 g', name: 'mustikka' }] },
      ],
      stepGroups: [{ name: null, steps: ['Sekoita pohja.', 'Lisää täyte.', 'Paista.'] }],
    });

    expect(await getRecipe(id)).toEqual({
      id,
      title: 'Mustikkapiirakka',
      description: 'Kesän paras piirakka.',
      servings: '1 pelti',
      activeMinutes: 30,
      totalMinutes: 75,
      source: 'https://example.com/piirakka',
      photoUrl: null,
      tags: ['jälkiruoka', 'leivonnainen'],
      ingredientGroups: [
        {
          name: 'Pohja',
          ingredients: [
            { amount: '200 g', name: 'voi', note: 'huoneenlämpöinen' },
            { amount: '2 dl', name: 'sokeri', note: null },
          ],
        },
        {
          name: 'Täyte',
          ingredients: [{ amount: '500 g', name: 'mustikka', note: null }],
        },
      ],
      stepGroups: [{ name: null, steps: ['Sekoita pohja.', 'Lisää täyte.', 'Paista.'] }],
      notes: [],
    });
  });

  it('stores a recipe with only a title', async () => {
    const id = await addRecipe(author, { title: 'Vesi' });
    expect(await getRecipe(id)).toMatchObject({
      title: 'Vesi',
      description: null,
      tags: [],
      ingredientGroups: [],
      stepGroups: [],
    });
  });

  it('stores a tag once even when it repeats', async () => {
    const id = await addRecipe(author, { title: 'Pulla', tags: ['leivonnainen', 'leivonnainen'] });
    expect((await getRecipe(id))?.tags).toEqual(['leivonnainen']);
  });

  it('adds the first revision', async () => {
    const id = await addRecipe(author, { title: 'Pulla' });
    expect(await revisions(id)).toMatchObject([
      { source: 'app', note: null, snapshot: { title: 'Pulla' } },
    ]);
  });

  it('returns null for a missing recipe', async () => {
    expect(await getRecipe(missingId)).toBeNull();
  });
});

describe('updateRecipe', () => {
  it('replaces the content and adds a revision', async () => {
    const id = await addRecipe(author, {
      title: 'Pulla',
      tags: ['leivonnainen'],
      ingredientGroups: [{ name: null, ingredients: [{ name: 'vehnäjauho' }] }],
      stepGroups: [{ name: null, steps: ['Leivo.'] }],
    });

    const updated = await updateRecipe(
      id,
      RecipeInput.parse({
        title: 'Korvapuusti',
        tags: ['pulla'],
        ingredientGroups: [{ name: null, ingredients: [{ name: 'kaneli' }] }],
      }),
      { userId: author.userId, source: 'mcp' },
      'Kanelia lisää',
    );

    expect(updated).toBe(true);
    expect(await getRecipe(id)).toMatchObject({
      title: 'Korvapuusti',
      tags: ['pulla'],
      ingredientGroups: [{ name: null, ingredients: [{ name: 'kaneli' }] }],
      stepGroups: [],
    });
    expect(await revisions(id)).toMatchObject([
      { source: 'app', note: null, snapshot: { title: 'Pulla' } },
      { source: 'mcp', note: 'Kanelia lisää', snapshot: { title: 'Korvapuusti' } },
    ]);
  });

  it('returns false for a missing recipe', async () => {
    expect(await updateRecipe(missingId, RecipeInput.parse({ title: 'X' }), author)).toBe(false);
  });
});

describe('listRecipes', () => {
  beforeEach(async () => {
    await addRecipe(author, {
      title: 'Mustikkapiirakka',
      tags: ['jälkiruoka', 'leivonnainen'],
      ingredientGroups: [{ name: null, ingredients: [{ name: 'mustikka' }, { name: 'voi' }] }],
    });
    await addRecipe(author, {
      title: 'Lohikeitto',
      tags: ['keitto'],
      ingredientGroups: [{ name: null, ingredients: [{ name: 'lohi' }, { name: 'peruna' }] }],
    });
    await addRecipe(author, {
      title: 'Kaneliässät',
      tags: ['leivonnainen'],
      description: 'Rapeita pikkuleipiä voista.',
    });
  });

  async function titles(opts: { q?: string; tags?: string[] }) {
    const list = await listRecipes({ q: opts.q, tags: opts.tags ?? [], page: 1 });
    return list.recipes.map((r) => r.title);
  }

  it('lists all recipes by title', async () => {
    expect(await titles({})).toEqual(['Kaneliässät', 'Lohikeitto', 'Mustikkapiirakka']);
  });

  it('finds recipes by a word prefix in the title', async () => {
    expect(await titles({ q: 'lohi' })).toEqual(['Lohikeitto']);
  });

  it('finds recipes by ingredient', async () => {
    expect(await titles({ q: 'peruna' })).toEqual(['Lohikeitto']);
  });

  it('finds recipes by tag name', async () => {
    expect(await titles({ q: 'keitto' })).toEqual(['Lohikeitto']);
  });

  it('finds recipes by a part of the title', async () => {
    expect(await titles({ q: 'piirak' })).toEqual(['Mustikkapiirakka']);
  });

  it('finds recipes with a typo in the title', async () => {
    expect(await titles({ q: 'lohikeito' })).toEqual(['Lohikeitto']);
  });

  it('returns nothing when no recipe matches', async () => {
    expect(await titles({ q: 'pizza' })).toEqual([]);
  });

  it('filters by tags, requiring all of them', async () => {
    expect(await titles({ tags: ['leivonnainen'] })).toEqual(['Kaneliässät', 'Mustikkapiirakka']);
    expect(await titles({ tags: ['leivonnainen', 'jälkiruoka'] })).toEqual(['Mustikkapiirakka']);
  });

  it('returns the tags of each recipe', async () => {
    const list = await listRecipes({ q: 'mustikka', tags: [], page: 1 });
    expect(list.recipes[0].tags).toEqual(['jälkiruoka', 'leivonnainen']);
  });

  it('paginates the results', async () => {
    for (let i = 0; i < recipePageSize; i++) {
      await addRecipe(author, { title: `Testi ${String(i).padStart(2, '0')}` });
    }
    const first = await listRecipes({ tags: [], page: 1 });
    const second = await listRecipes({ tags: [], page: 2 });

    expect(first.total).toBe(recipePageSize + 3);
    expect(first.recipes).toHaveLength(recipePageSize);
    expect(second.recipes.map((r) => r.title)).toEqual(['Testi 09', 'Testi 10', 'Testi 11']);
  });
});

describe('listTags', () => {
  it('counts the recipes for each tag, most used first', async () => {
    await addRecipe(author, { title: 'A', tags: ['keitto', 'arki'] });
    await addRecipe(author, { title: 'B', tags: ['arki'] });
    expect(await listTags()).toEqual([
      { name: 'arki', count: 2 },
      { name: 'keitto', count: 1 },
    ]);
  });

  it('leaves out tags that are no longer used', async () => {
    const id = await addRecipe(author, { title: 'A', tags: ['keitto'] });
    await updateRecipe(id, RecipeInput.parse({ title: 'A', tags: [] }), author);
    expect(await listTags()).toEqual([]);
  });
});

describe('notes', () => {
  let recipeId: string;

  beforeEach(async () => {
    recipeId = await addRecipe(author, { title: 'Pulla' });
  });

  it('adds notes with the author name, newest first', async () => {
    const first = await addNote(recipeId, author.userId, 'Liian makeaa.');
    const second = await addNote(recipeId, author.userId, 'Parempi vähemmällä sokerilla.');

    expect(first).toMatchObject({ authorName: 'cook display', text: 'Liian makeaa.' });
    expect((await getRecipe(recipeId))?.notes.map((n) => n.id)).toEqual([second?.id, first?.id]);
  });

  it('does not add a note to a missing recipe', async () => {
    expect(await addNote(missingId, author.userId, 'Hmm')).toBeNull();
  });

  it('updates and deletes a note', async () => {
    const note = await addNote(recipeId, author.userId, 'Vanha');

    expect(await updateNote(recipeId, note!.id, 'Uusi')).toBe(true);
    expect((await getRecipe(recipeId))?.notes).toMatchObject([{ text: 'Uusi' }]);

    expect(await deleteNote(recipeId, note!.id)).toBe(true);
    expect((await getRecipe(recipeId))?.notes).toEqual([]);
  });

  it('does not change a note through another recipe', async () => {
    const note = await addNote(recipeId, author.userId, 'Vanha');
    const otherId = await addRecipe(author, { title: 'Toinen' });

    expect(await updateNote(otherId, note!.id, 'Uusi')).toBe(false);
    expect(await deleteNote(otherId, note!.id)).toBe(false);
    expect((await getRecipe(recipeId))?.notes).toMatchObject([{ text: 'Vanha' }]);
  });
});

describe('setPhotoPath', () => {
  it('returns the previous path and sets the photo URL', async () => {
    const id = await addRecipe(author, { title: 'Pulla' });

    expect(await setPhotoPath(id, 'a.webp')).toBeNull();
    expect(await setPhotoPath(id, 'b.webp')).toBe('a.webp');
    expect((await getRecipe(id))?.photoUrl).toBe('/images/b.webp');
  });

  it('returns undefined for a missing recipe', async () => {
    expect(await setPhotoPath(missingId, 'a.webp')).toBeUndefined();
  });
});
