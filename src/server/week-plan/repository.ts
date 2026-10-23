import type postgres from 'postgres';

import type {
  AddEntry,
  UpdateEntry,
  WeekPlanChange,
  WeekPlanEntry,
  WeekPlanSnapshot,
} from '../../shared/week-plan.ts';
import { sql } from '../db.ts';
import { photoUrls } from '../images.ts';
import type { Author } from '../recipes/repository.ts';

type Tx = postgres.TransactionSql<Record<string, never>>;
type Db = typeof sql | Tx;

type EntryRow = {
  id: string;
  date: string;
  position: number;
  text: string;
  note: string | null;
  recipeId: string | null;
  recipeTitle: string | null;
  recipeActiveMinutes: number | null;
  recipeTotalMinutes: number | null;
  recipePhotoPath: string | null;
};

async function readEntries(db: Db, where: postgres.Fragment): Promise<WeekPlanEntry[]> {
  const rows = await db<EntryRow[]>`
    SELECT
      e.id, e.date::text AS date, e.position, e.text, e.note, e.recipe_id,
      r.title AS recipe_title, r.active_minutes AS recipe_active_minutes,
      r.total_minutes AS recipe_total_minutes, r.photo_path AS recipe_photo_path
    FROM week_plan_entries e LEFT JOIN recipes r ON r.id = e.recipe_id
    WHERE ${where}
    ORDER BY e.date, e.position
  `;
  return rows.map((r) => ({
    id: r.id,
    date: r.date,
    position: r.position,
    text: r.text,
    note: r.note,
    recipe:
      r.recipeId && r.recipeTitle !== null
        ? {
            id: r.recipeId,
            title: r.recipeTitle,
            activeMinutes: r.recipeActiveMinutes,
            totalMinutes: r.recipeTotalMinutes,
            photo: photoUrls(r.recipePhotoPath),
          }
        : null,
  }));
}

async function readEntry(tx: Tx, id: string): Promise<WeekPlanEntry | null> {
  const [entry] = await readEntries(tx, tx`e.id = ${id}`);
  return entry ?? null;
}

/** Returns the entries from `from` to `to`, both included, ordered by date and position. */
export function listEntries(from: string, to: string): Promise<WeekPlanEntry[]> {
  return readEntries(sql, sql`e.date BETWEEN ${from} AND ${to}`);
}

/** The most changes that one request returns. */
const maxChanges = 200;

type ChangeRow = Omit<WeekPlanChange, 'at' | 'recipes'> & { at: Date };

/**
 * Returns the changes to the entries from `from` to `to`, both included, newest
 * first. A move between dates shows on both dates.
 */
export async function listChanges(from: string, to: string): Promise<WeekPlanChange[]> {
  const rows = await sql<ChangeRow[]>`
    SELECT c.id, c.created_at AS at, u.display_name AS user, c.source, c.before, c.after
    FROM week_plan_changes c JOIN users u ON u.id = c.user_id
    WHERE (c.before->>'date') BETWEEN ${from} AND ${to}
       OR (c.after->>'date') BETWEEN ${from} AND ${to}
    ORDER BY c.id DESC
    LIMIT ${maxChanges}
  `;
  const linked = (r: ChangeRow) =>
    [r.before?.recipeId, r.after?.recipeId].filter((id): id is string => !!id);
  const recipeIds = [...new Set(rows.flatMap(linked))];
  const recipes = recipeIds.length
    ? await sql<{ id: string; title: string }[]>`
        SELECT id, title FROM recipes WHERE id = ANY(${recipeIds}::uuid[])
      `
    : [];
  const titles = new Map(recipes.map((r) => [r.id, r.title]));

  return rows.map((row) => ({
    ...row,
    at: row.at.toISOString(),
    recipes: Object.fromEntries(
      linked(row).flatMap((id) => (titles.has(id) ? [[id, titles.get(id)!]] : [])),
    ),
  }));
}

/** Adds an entry. */
export async function addEntry(
  input: AddEntry,
  author: Author,
): Promise<WeekPlanEntry | 'recipe-not-found'> {
  return sql.begin(async (tx) => {
    await lockPlan(tx);
    if (input.recipeId && !(await recipeExists(tx, input.recipeId))) return 'recipe-not-found';
    const [{ id }] = await tx<{ id: string }[]>`
      INSERT INTO week_plan_entries (date, position, text, note, recipe_id)
      VALUES (
        ${input.date},
        (SELECT count(*) FROM week_plan_entries WHERE date = ${input.date}),
        ${input.text}, ${input.note}, ${input.recipeId}
      )
      RETURNING id
    `;
    if (input.position !== undefined) await place(tx, id, input.date, input.position);
    const entry = (await readEntry(tx, id))!;
    await recordChange(tx, id, author, null, entry);
    return entry;
  });
}

/** Changes an entry, and moves it when the date or the position changes. */
export async function updateEntry(
  id: string,
  update: UpdateEntry,
  author: Author,
): Promise<WeekPlanEntry | 'not-found' | 'recipe-not-found'> {
  return sql.begin(async (tx) => {
    await lockPlan(tx);
    const before = await readEntry(tx, id);
    if (!before) return 'not-found';
    if (update.recipeId && !(await recipeExists(tx, update.recipeId))) return 'recipe-not-found';

    const recipeId = update.recipeId !== undefined ? update.recipeId : (before.recipe?.id ?? null);
    await tx`
      UPDATE week_plan_entries SET
        text = ${update.text ?? before.text},
        note = ${update.note !== undefined ? update.note : before.note},
        recipe_id = ${recipeId},
        updated_at = now()
      WHERE id = ${id}
    `;
    const date = update.date ?? before.date;
    if (date !== before.date || update.position !== undefined) {
      await place(tx, id, date, update.position ?? Number.MAX_SAFE_INTEGER);
      if (date !== before.date) await compact(tx, before.date);
    }

    const after = (await readEntry(tx, id))!;
    if (JSON.stringify(snapshot(before)) !== JSON.stringify(snapshot(after))) {
      await recordChange(tx, id, author, before, after);
    }
    return after;
  });
}

/** Removes an entry. Returns `false` if the entry does not exist. */
export async function removeEntry(id: string, author: Author): Promise<boolean> {
  return sql.begin(async (tx) => {
    await lockPlan(tx);
    const before = await readEntry(tx, id);
    if (!before) return false;
    await tx`DELETE FROM week_plan_entries WHERE id = ${id}`;
    await compact(tx, before.date);
    await recordChange(tx, id, author, before, null);
    return true;
  });
}

/** Serializes the changes to the plan, so that concurrent changes keep the positions intact. */
async function lockPlan(tx: Tx): Promise<void> {
  await tx`SELECT pg_advisory_xact_lock(hashtext('week_plan'))`;
}

async function recipeExists(tx: Tx, id: string): Promise<boolean> {
  const rows = await tx`SELECT 1 FROM recipes WHERE id = ${id}`;
  return rows.length > 0;
}

/** Moves an entry to `position` on `date`, or last if the position is past the end. */
async function place(tx: Tx, id: string, date: string, position: number): Promise<void> {
  const others = await tx<{ id: string }[]>`
    SELECT id FROM week_plan_entries WHERE date = ${date} AND id <> ${id} ORDER BY position
  `;
  const ids = others.map((r) => r.id);
  ids.splice(position, 0, id);
  await tx`
    UPDATE week_plan_entries e SET date = ${date}, position = o.ord - 1
    FROM unnest(${ids}::uuid[]) WITH ORDINALITY AS o (id, ord)
    WHERE e.id = o.id
  `;
}

/** Renumbers the entries of a date from 0, keeping their order. */
async function compact(tx: Tx, date: string): Promise<void> {
  await tx`
    UPDATE week_plan_entries e SET position = o.ord - 1
    FROM (
      SELECT id, row_number() OVER (ORDER BY position) AS ord
      FROM week_plan_entries WHERE date = ${date}
    ) o
    WHERE e.id = o.id
  `;
}

function snapshot(entry: WeekPlanEntry): WeekPlanSnapshot {
  return {
    date: entry.date,
    position: entry.position,
    text: entry.text,
    note: entry.note,
    recipeId: entry.recipe?.id ?? null,
  };
}

async function recordChange(
  tx: Tx,
  entryId: string,
  author: Author,
  before: WeekPlanEntry | null,
  after: WeekPlanEntry | null,
): Promise<void> {
  await tx`
    INSERT INTO week_plan_changes (entry_id, user_id, source, before, after)
    VALUES (
      ${entryId}, ${author.userId}, ${author.source},
      ${before ? tx.json(snapshot(before)) : null},
      ${after ? tx.json(snapshot(after)) : null}
    )
  `;
}
