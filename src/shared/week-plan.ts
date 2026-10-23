import { z } from 'zod';

import { OptionalText, Recipe } from './recipe.ts';

/** A date as `YYYY-MM-DD`. */
export const IsoDate = z.iso.date();

/** The day a week starts on, numbered as in `Date.getDay()`. Saturday. */
export const weekStartDay = 6;

/** The longest date range that one request can read. */
export const maxPlanDays = 366;

/** Returns the date `days` days after `date`. Both are `YYYY-MM-DD`. */
export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Returns the first day of the week that contains `date`. */
export function weekStart(date: string, startDay = weekStartDay): string {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  return addDays(date, -((day - startDay + 7) % 7));
}

/** Returns the seven dates of the week that starts on `start`. */
export function weekDates(start: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

/** Returns the local calendar date of `date` as `YYYY-MM-DD`. */
export function toIsoDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Query parameters for reading the plan from `from` to `to`, both included. */
export const WeekPlanQuery = z
  .object({ from: IsoDate, to: IsoDate })
  .refine(({ from, to }) => from <= to && to <= addDays(from, maxPlanDays - 1), {
    message: `The range must be 1–${maxPlanDays} days`,
    // Zod runs the check also when a date failed, and `addDays` needs valid dates.
    when: (payload) => !payload.issues.length,
  });
export type WeekPlanQuery = z.infer<typeof WeekPlanQuery>;

const EntryText = z.string().trim().min(1);

/** A new entry. Without a position, the entry goes last on its date. */
export const AddEntryInput = z.object({
  date: IsoDate,
  text: EntryText.describe(
    'What the plan shows, such as a dish name. With a recipe, use its title unless the user asks for other text.',
  ),
  note: OptionalText.describe('Extra details, such as "tuplasatsi".'),
  recipeId: z
    .uuid()
    .nullish()
    .transform((id) => id ?? null)
    .describe('Recipe to link, from search_recipes.'),
  position: z.int().min(0).optional().describe('Place within the date, from 0. Default: last.'),
});
export type AddEntryInput = z.input<typeof AddEntryInput>;
export type AddEntry = z.output<typeof AddEntryInput>;

/**
 * Changes to an entry. Fields that are left out keep their values. A `null`
 * recipe id removes the link. A new date without a position moves the entry
 * last on that date.
 */
export const UpdateEntryInput = z
  .object({
    text: EntryText.optional(),
    note: z
      .string()
      .trim()
      .nullable()
      .transform((s) => s || null)
      .optional()
      .describe('Null clears the note.'),
    recipeId: z.uuid().nullable().optional().describe('Null removes the recipe link.'),
    date: IsoDate.optional().describe('Moves the entry to this date.'),
    position: z
      .int()
      .min(0)
      .optional()
      .describe(
        'Place within the date, from 0. A new date without a position puts the entry last on that date.',
      ),
  })
  .refine((u) => Object.values(u).some((v) => v !== undefined), {
    message: 'Nothing to change',
  });
export type UpdateEntryInput = z.input<typeof UpdateEntryInput>;
export type UpdateEntry = z.output<typeof UpdateEntryInput>;

/** The recipe that an entry links to. */
export const WeekPlanRecipe = Recipe.pick({
  id: true,
  title: true,
  activeMinutes: true,
  totalMinutes: true,
  photo: true,
});
export type WeekPlanRecipe = z.infer<typeof WeekPlanRecipe>;

export const WeekPlanEntry = z.object({
  id: z.uuid(),
  date: IsoDate,
  position: z.int().describe('Order within the date, from 0.'),
  text: z.string().describe('What the plan shows. It can differ from the recipe title.'),
  note: z.string().nullable(),
  recipe: WeekPlanRecipe.nullable().describe('The linked recipe, or null for a free-text entry.'),
});
export type WeekPlanEntry = z.infer<typeof WeekPlanEntry>;

/** An entry as the change history stores it. */
export type WeekPlanSnapshot = {
  date: string;
  position: number;
  text: string;
  note: string | null;
  recipeId: string | null;
};

/** A change to an entry. `before` is null when the entry was added, `after` when it was removed. */
export type WeekPlanChange = {
  id: string;
  /** The time of the change as an ISO timestamp. */
  at: string;
  /** The display name of the user who made the change. */
  user: string;
  source: 'app' | 'mcp';
  before: WeekPlanSnapshot | null;
  after: WeekPlanSnapshot | null;
  /** The current titles of the linked recipes, by id. A deleted recipe has no title. */
  recipes: Record<string, string>;
};
