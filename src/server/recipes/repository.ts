import type postgres from 'postgres';

import {
  type IngredientNameCount,
  type Note,
  type Recipe,
  type RecipeContent,
  type RecipeIngredients,
  type RecipeList,
  recipePageSize,
  type TagCount,
} from '../../shared/recipe.ts';
import { sql } from '../db.ts';
import { photoUrls } from '../images.ts';

/** The user who saved a recipe, and whether it was saved in the app or through MCP. */
export type Author = { userId: string; source: 'app' | 'mcp' };

type Tx = postgres.TransactionSql<Record<string, never>>;

function searchWords(q: string): string[] {
  return q.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
}

function likePattern(q: string): string {
  return `%${q.replace(/[\\%_]/g, '\\$&')}%`;
}

/** Lists the matching recipes, one page of them or all without `page`. */
export async function listRecipes(opts: {
  q?: string;
  tags: string[];
  page?: number;
}): Promise<RecipeList> {
  const q = opts.q?.trim() ?? '';
  const words = searchWords(q);
  // Stemmed prefix matches, plus substrings for parts of compound words
  const tsquery = words.length ? words.map((w) => `${w}:*`).join(' & ') : null;
  const patterns = (words.length ? words : [q]).map(likePattern);
  const match = q
    ? sql`
      AND (
        ${tsquery ? sql`r.search_vector @@ to_tsquery('finnish', ${tsquery}) OR` : sql``}
        r.search_text ILIKE ALL(${patterns}::text[])
        OR ${q} <% r.title
      )`
    : sql``;
  const tags = [...new Set(opts.tags)];
  const tagFilter = tags.length
    ? sql`
      AND (
        SELECT count(*) FROM recipe_tags rt JOIN tags t ON t.id = rt.tag_id
        WHERE rt.recipe_id = r.id AND t.name = ANY(${tags}::text[])
      ) = ${tags.length}`
    : sql``;
  // Title matches first, so a word in the title beats the same word in the steps
  const order = q
    ? sql`
      r.title ILIKE ALL(${patterns}::text[]) DESC,
      ${tsquery ? sql`ts_rank(r.search_vector, to_tsquery('finnish', ${tsquery})) DESC,` : sql``}
      word_similarity(${q}, r.title) DESC,`
    : sql``;

  const rows = await sql<
    {
      id: string;
      title: string;
      activeMinutes: number | null;
      totalMinutes: number | null;
      photoPath: string | null;
      photoIllustration: boolean;
      tags: string[];
      total: string;
    }[]
  >`
    SELECT
      r.id, r.title, r.active_minutes, r.total_minutes, r.photo_path, r.photo_illustration,
      coalesce(
        (SELECT array_agg(t.name ORDER BY t.name COLLATE "fi-FI-x-icu")
         FROM recipe_tags rt JOIN tags t ON t.id = rt.tag_id WHERE rt.recipe_id = r.id),
        '{}'
      ) AS tags,
      count(*) OVER () AS total
    FROM recipes r
    WHERE true ${match} ${tagFilter}
    ORDER BY ${order} r.title COLLATE "fi-FI-x-icu", r.id
    ${opts.page ? sql`LIMIT ${recipePageSize} OFFSET ${(opts.page - 1) * recipePageSize}` : sql``}
  `;

  return {
    recipes: rows.map((r) => ({
      id: r.id,
      title: r.title,
      activeMinutes: r.activeMinutes,
      totalMinutes: r.totalMinutes,
      photo: photoUrls(r.photoPath, r.photoIllustration),
      tags: r.tags,
    })),
    total: Number(rows[0]?.total ?? 0),
    ...(opts.page && { page: opts.page, pageSize: recipePageSize }),
  };
}

/** Returns the tags that are in use, with the number of recipes for each. */
export async function listTags(): Promise<TagCount[]> {
  const rows = await sql<{ name: string; count: string }[]>`
    SELECT t.name, count(*) AS count
    FROM tags t JOIN recipe_tags rt ON rt.tag_id = t.id
    GROUP BY t.name
    ORDER BY count(*) DESC, t.name COLLATE "fi-FI-x-icu"
  `;
  return rows.map((r) => ({ name: r.name, count: Number(r.count) }));
}

/** The ingredients of the ingredient group `g` as a JSON array. */
const ingredientsJson = sql`coalesce(
  (SELECT json_agg(json_build_object('amount', i.amount, 'name', i.name, 'note', i.note)
                   ORDER BY i.position)
   FROM ingredients i WHERE i.group_id = g.id),
  '[]'
)`;

/** Returns the ingredient names in use, with the number of recipes for each. */
export async function listIngredientNames(q?: string): Promise<IngredientNameCount[]> {
  const filter = q?.trim() ? sql`WHERE i.name ILIKE ${likePattern(q.trim())}` : sql``;
  const rows = await sql<{ name: string; count: string }[]>`
    SELECT i.name, count(DISTINCT g.recipe_id) AS count
    FROM ingredients i JOIN ingredient_groups g ON g.id = i.group_id
    ${filter}
    GROUP BY i.name
    ORDER BY i.name COLLATE "fi-FI-x-icu"
  `;
  return rows.map((r) => ({ name: r.name, count: Number(r.count) }));
}

/** Returns the ingredients of the given recipes in the given order. Skips missing recipes. */
export async function getIngredients(ids: string[]): Promise<RecipeIngredients[]> {
  const rows = await sql<RecipeIngredients[]>`
    SELECT r.id, r.title, r.servings, coalesce(
      (SELECT json_agg(json_build_object('name', g.name, 'ingredients', ${ingredientsJson})
                       ORDER BY g.position)
       FROM ingredient_groups g WHERE g.recipe_id = r.id),
      '[]'
    ) AS ingredient_groups
    FROM recipes r WHERE r.id = ANY(${ids}::uuid[])
  `;
  const byId = new Map(rows.map((r) => [r.id, r]));
  return [...new Set(ids)].flatMap((id) => byId.get(id) ?? []);
}

export async function getRecipe(id: string): Promise<Recipe | null> {
  const [recipe] = await sql<
    {
      id: string;
      title: string;
      description: string | null;
      servings: string | null;
      activeMinutes: number | null;
      totalMinutes: number | null;
      source: string | null;
      photoPath: string | null;
      photoIllustration: boolean;
      version: number;
    }[]
  >`
    SELECT id, title, description, servings, active_minutes, total_minutes, source, photo_path,
      photo_illustration, version
    FROM recipes WHERE id = ${id}
  `;
  if (!recipe) return null;

  const [tags, ingredientGroups, stepGroups, notes] = await Promise.all([
    sql<{ name: string }[]>`
      SELECT t.name FROM recipe_tags rt JOIN tags t ON t.id = rt.tag_id
      WHERE rt.recipe_id = ${id} ORDER BY t.name COLLATE "fi-FI-x-icu"
    `,
    sql<
      {
        name: string | null;
        ingredients: RecipeContent['ingredientGroups'][number]['ingredients'];
      }[]
    >`
      SELECT g.name, ${ingredientsJson} AS ingredients
      FROM ingredient_groups g WHERE g.recipe_id = ${id} ORDER BY g.position
    `,
    sql<{ name: string | null; steps: string[] }[]>`
      SELECT g.name, coalesce(
        (SELECT array_agg(s.text ORDER BY s.position) FROM steps s WHERE s.group_id = g.id),
        '{}'
      ) AS steps
      FROM step_groups g WHERE g.recipe_id = ${id} ORDER BY g.position
    `,
    listNotes(id),
  ]);

  const { photoPath, photoIllustration, ...rest } = recipe;
  return {
    ...rest,
    photo: photoUrls(photoPath, photoIllustration),
    tags: tags.map((t) => t.name),
    ingredientGroups: [...ingredientGroups],
    stepGroups: [...stepGroups],
    notes,
  };
}

async function listNotes(recipeId: string): Promise<Note[]> {
  const rows = await sql<{ id: string; authorName: string; text: string; createdAt: Date }[]>`
    SELECT n.id, u.display_name AS author_name, n.text, n.created_at
    FROM notes n JOIN users u ON u.id = n.user_id
    WHERE n.recipe_id = ${recipeId}
    ORDER BY n.created_at DESC, n.id DESC
  `;
  return rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }));
}

/** Increases the version of a recipe and returns the new version. */
async function bumpVersion(tx: Tx, recipeId: string): Promise<number> {
  const [{ version }] = await tx<{ version: number }[]>`
    UPDATE recipes SET version = version + 1 WHERE id = ${recipeId} RETURNING version
  `;
  return version;
}

/**
 * Adds a note. Returns the note and the new version of the recipe, or `null` if the
 * recipe does not exist.
 */
export async function addNote(
  recipeId: string,
  userId: string,
  text: string,
): Promise<{ note: Note; version: number } | null> {
  const added = await sql.begin(async (tx) => {
    const [row] = await tx<{ id: string }[]>`
      INSERT INTO notes (recipe_id, user_id, text)
      SELECT id, ${userId}, ${text} FROM recipes WHERE id = ${recipeId}
      RETURNING id
    `;
    return row ? { id: row.id, version: await bumpVersion(tx, recipeId) } : null;
  });
  if (!added) return null;
  const note = (await listNotes(recipeId)).find((n) => n.id === added.id);
  return note ? { note, version: added.version } : null;
}

/**
 * Changes the text of a note. Returns the new version of the recipe, or `null` if the
 * note does not exist.
 */
export async function updateNote(
  recipeId: string,
  noteId: string,
  text: string,
): Promise<number | null> {
  return sql.begin(async (tx) => {
    const result = await tx`
      UPDATE notes SET text = ${text}, updated_at = now()
      WHERE id = ${noteId} AND recipe_id = ${recipeId}
    `;
    return result.count ? bumpVersion(tx, recipeId) : null;
  });
}

/**
 * Deletes a note. Returns the new version of the recipe, or `null` if the note does not
 * exist.
 */
export async function deleteNote(recipeId: string, noteId: string): Promise<number | null> {
  return sql.begin(async (tx) => {
    const result = await tx`DELETE FROM notes WHERE id = ${noteId} AND recipe_id = ${recipeId}`;
    return result.count ? bumpVersion(tx, recipeId) : null;
  });
}

/** Creates a recipe and its first revision. Returns the id and the version of the recipe. */
export async function createRecipe(
  content: RecipeContent,
  author: Author,
  revisionNote: string | null = null,
): Promise<{ id: string; version: number }> {
  return sql.begin(async (tx) => {
    const [created] = await tx<{ id: string; version: number }[]>`
      INSERT INTO recipes (title, description, servings, active_minutes, total_minutes, source)
      VALUES (
        ${content.title}, ${content.description}, ${content.servings},
        ${content.activeMinutes}, ${content.totalMinutes}, ${content.source}
      )
      RETURNING id, version
    `;
    await insertContent(tx, created.id, content);
    await refreshSearch(tx, created.id);
    await insertRevision(tx, created.id, content, author, revisionNote);
    return created;
  });
}

/**
 * Replaces the content of a recipe and adds a revision. Returns the new version.
 * With `expectedVersion`, returns `'conflict'` and changes nothing if the recipe has
 * another version.
 */
export async function updateRecipe(
  id: string,
  content: RecipeContent,
  author: Author,
  revisionNote: string | null = null,
  expectedVersion?: number,
): Promise<number | 'not-found' | 'conflict'> {
  return sql.begin(async (tx) => {
    const [current] = await tx<{ version: number }[]>`
      SELECT version FROM recipes WHERE id = ${id} FOR UPDATE
    `;
    if (!current) return 'not-found';
    if (expectedVersion !== undefined && current.version !== expectedVersion) return 'conflict';
    const [{ version }] = await tx<{ version: number }[]>`
      UPDATE recipes SET
        title = ${content.title}, description = ${content.description},
        servings = ${content.servings}, active_minutes = ${content.activeMinutes},
        total_minutes = ${content.totalMinutes}, source = ${content.source}, updated_at = now(),
        version = version + 1
      WHERE id = ${id}
      RETURNING version
    `;
    await tx`DELETE FROM recipe_tags WHERE recipe_id = ${id}`;
    await tx`DELETE FROM ingredient_groups WHERE recipe_id = ${id}`;
    await tx`DELETE FROM step_groups WHERE recipe_id = ${id}`;
    await insertContent(tx, id, content);
    await refreshSearch(tx, id);
    await insertRevision(tx, id, content, author, revisionNote);
    return version;
  });
}

/**
 * Deletes a recipe with its notes and revisions. Returns the path of its photo, or
 * `undefined` if the recipe does not exist.
 */
export async function deleteRecipe(id: string): Promise<string | null | undefined> {
  const [row] = await sql<{ photoPath: string | null }[]>`
    DELETE FROM recipes WHERE id = ${id} RETURNING photo_path
  `;
  return row ? row.photoPath : undefined;
}

/**
 * Sets the photo path and the illustration flag of a recipe, or clears the photo with
 * `null`. Returns the previous path and the new version, or `undefined` if the recipe
 * does not exist.
 */
export async function setPhotoPath(
  id: string,
  photoPath: string | null,
  illustration = false,
): Promise<{ previous: string | null; version: number } | undefined> {
  const [row] = await sql<{ previous: string | null; version: number }[]>`
    UPDATE recipes r SET
      photo_path = ${photoPath}, photo_illustration = ${illustration}, version = r.version + 1
    FROM recipes old WHERE old.id = r.id AND r.id = ${id}
    RETURNING old.photo_path AS previous, r.version
  `;
  return row;
}

/**
 * Sets the illustration flag of the photo of a recipe. Returns the new version, or
 * `null` if the recipe does not exist or has no photo.
 */
export async function setPhotoIllustration(
  id: string,
  illustration: boolean,
): Promise<number | null> {
  const [row] = await sql<{ version: number }[]>`
    UPDATE recipes SET photo_illustration = ${illustration}, version = version + 1
    WHERE id = ${id} AND photo_path IS NOT NULL
    RETURNING version
  `;
  return row?.version ?? null;
}

async function insertRevision(
  tx: Tx,
  recipeId: string,
  content: RecipeContent,
  author: Author,
  note: string | null,
): Promise<void> {
  await tx`
    INSERT INTO revisions (recipe_id, source, user_id, note, snapshot)
    VALUES (${recipeId}, ${author.source}, ${author.userId}, ${note}, ${tx.json(content)})
  `;
}

async function insertContent(tx: Tx, recipeId: string, content: RecipeContent): Promise<void> {
  const tags = [...new Set(content.tags)];
  if (tags.length) {
    await tx`INSERT INTO tags (name) SELECT unnest(${tags}::text[]) ON CONFLICT (name) DO NOTHING`;
    await tx`
      INSERT INTO recipe_tags (recipe_id, tag_id)
      SELECT ${recipeId}, id FROM tags WHERE name = ANY(${tags}::text[])
    `;
  }

  for (const [position, group] of content.ingredientGroups.entries()) {
    const [{ id: groupId }] = await tx<{ id: string }[]>`
      INSERT INTO ingredient_groups (recipe_id, position, name)
      VALUES (${recipeId}, ${position}, ${group.name})
      RETURNING id
    `;
    if (group.ingredients.length) {
      await tx`INSERT INTO ingredients ${tx(
        group.ingredients.map((i, p) => ({ groupId, position: p, ...i })),
      )}`;
    }
  }

  for (const [position, group] of content.stepGroups.entries()) {
    const [{ id: groupId }] = await tx<{ id: string }[]>`
      INSERT INTO step_groups (recipe_id, position, name)
      VALUES (${recipeId}, ${position}, ${group.name})
      RETURNING id
    `;
    if (group.steps.length) {
      await tx`INSERT INTO steps ${tx(group.steps.map((text, p) => ({ groupId, position: p, text })))}`;
    }
  }
}

async function refreshSearch(tx: Tx, recipeId: string): Promise<void> {
  await tx`SELECT refresh_recipe_search(${recipeId})`;
}
