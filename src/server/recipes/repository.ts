import type postgres from 'postgres';

import {
  type Note,
  type Recipe,
  type RecipeContent,
  type RecipeList,
  recipePageSize,
  type TagCount,
} from '../../shared/recipe.ts';
import { sql } from '../db.ts';

export type Author = { type: 'user'; userId: string } | { type: 'claude' };

type Tx = postgres.TransactionSql<Record<string, never>>;

function photoUrl(photoPath: string | null): string | null {
  return photoPath ? `/images/${photoPath}` : null;
}

/** Turns a search string into a prefix-matching `tsquery`, or `null` if it has no words. */
function prefixQuery(q: string): string | null {
  const words = q.toLowerCase().match(/[\p{L}\p{N}]+/gu);
  return words ? words.map((w) => `${w}:*`).join(' & ') : null;
}

function likePattern(q: string): string {
  return `%${q.replace(/[\\%_]/g, '\\$&')}%`;
}

export async function listRecipes(opts: {
  q?: string;
  tags: string[];
  page: number;
}): Promise<RecipeList> {
  const q = opts.q?.trim() ?? '';
  const tsquery = prefixQuery(q);
  const match = q
    ? sql`
      AND (
        ${tsquery ? sql`r.search_vector @@ to_tsquery('finnish', ${tsquery}) OR` : sql``}
        r.title ILIKE ${likePattern(q)}
        OR ${q} <% r.title
      )`
    : sql``;
  const tagFilter = opts.tags.length
    ? sql`
      AND (
        SELECT count(*) FROM recipe_tags rt JOIN tags t ON t.id = rt.tag_id
        WHERE rt.recipe_id = r.id AND t.name = ANY(${opts.tags}::text[])
      ) = ${opts.tags.length}`
    : sql``;
  const order = tsquery
    ? sql`ts_rank(r.search_vector, to_tsquery('finnish', ${tsquery})) DESC, word_similarity(${q}, r.title) DESC,`
    : sql``;

  const rows = await sql<
    {
      id: string;
      title: string;
      activeMinutes: number | null;
      totalMinutes: number | null;
      photoPath: string | null;
      tags: string[];
      total: string;
    }[]
  >`
    SELECT
      r.id, r.title, r.active_minutes, r.total_minutes, r.photo_path,
      coalesce(
        (SELECT array_agg(t.name ORDER BY t.name COLLATE "fi-FI-x-icu")
         FROM recipe_tags rt JOIN tags t ON t.id = rt.tag_id WHERE rt.recipe_id = r.id),
        '{}'
      ) AS tags,
      count(*) OVER () AS total
    FROM recipes r
    WHERE true ${match} ${tagFilter}
    ORDER BY ${order} r.title COLLATE "fi-FI-x-icu", r.id
    LIMIT ${recipePageSize} OFFSET ${(opts.page - 1) * recipePageSize}
  `;

  return {
    recipes: rows.map((r) => ({
      id: r.id,
      title: r.title,
      activeMinutes: r.activeMinutes,
      totalMinutes: r.totalMinutes,
      photoUrl: photoUrl(r.photoPath),
      tags: r.tags,
    })),
    total: Number(rows[0]?.total ?? 0),
    page: opts.page,
    pageSize: recipePageSize,
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
    }[]
  >`
    SELECT id, title, description, servings, active_minutes, total_minutes, source, photo_path
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
      SELECT g.name, coalesce(
        (SELECT json_agg(json_build_object('amount', i.amount, 'name', i.name, 'note', i.note)
                         ORDER BY i.position)
         FROM ingredients i WHERE i.group_id = g.id),
        '[]'
      ) AS ingredients
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

  const { photoPath, ...rest } = recipe;
  return {
    ...rest,
    photoUrl: photoUrl(photoPath),
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

/** Adds a note, or returns `null` if the recipe does not exist. */
export async function addNote(
  recipeId: string,
  userId: string,
  text: string,
): Promise<Note | null> {
  const [row] = await sql<{ id: string }[]>`
    INSERT INTO notes (recipe_id, user_id, text)
    SELECT id, ${userId}, ${text} FROM recipes WHERE id = ${recipeId}
    RETURNING id
  `;
  if (!row) return null;
  return (await listNotes(recipeId)).find((n) => n.id === row.id) ?? null;
}

/** Creates a recipe and its first revision. Returns the recipe id. */
export async function createRecipe(
  content: RecipeContent,
  author: Author,
  revisionNote: string | null = null,
): Promise<string> {
  return sql.begin(async (tx) => {
    const [{ id }] = await tx<{ id: string }[]>`
      INSERT INTO recipes (title, description, servings, active_minutes, total_minutes, source)
      VALUES (
        ${content.title}, ${content.description}, ${content.servings},
        ${content.activeMinutes}, ${content.totalMinutes}, ${content.source}
      )
      RETURNING id
    `;
    await insertContent(tx, id, content);
    await refreshSearch(tx, id);
    await tx`
      INSERT INTO revisions (recipe_id, author, user_id, note, snapshot)
      VALUES (
        ${id}, ${author.type}, ${author.type === 'user' ? author.userId : null},
        ${revisionNote}, ${tx.json(content)}
      )
    `;
    return id;
  });
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
  await tx`
    UPDATE recipes r SET search_vector =
      setweight(to_tsvector('finnish', r.title), 'A')
      || setweight(to_tsvector('finnish', coalesce(
        (SELECT string_agg(t.name, ' ') FROM recipe_tags rt JOIN tags t ON t.id = rt.tag_id
         WHERE rt.recipe_id = r.id), '')), 'B')
      || setweight(to_tsvector('finnish', coalesce(
        (SELECT string_agg(i.name, ' ') FROM ingredients i
         JOIN ingredient_groups g ON g.id = i.group_id WHERE g.recipe_id = r.id), '')), 'C')
      || setweight(to_tsvector('finnish', coalesce(r.description, '')), 'D')
    WHERE r.id = ${recipeId}
  `;
}
