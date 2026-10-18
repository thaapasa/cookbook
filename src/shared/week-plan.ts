import { z } from 'zod';

import { OptionalText } from './recipe.ts';

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
  });
export type WeekPlanQuery = z.infer<typeof WeekPlanQuery>;

const EntryText = z.string().trim().min(1);

/** A new entry. Without a position, the entry goes last on its date. */
export const AddEntryInput = z.object({
  date: IsoDate,
  text: EntryText,
  note: OptionalText,
  recipeId: z
    .uuid()
    .nullish()
    .transform((id) => id ?? null),
  position: z.int().min(0).optional(),
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
      .optional(),
    recipeId: z.uuid().nullable().optional(),
    date: IsoDate.optional(),
    position: z.int().min(0).optional(),
  })
  .refine((u) => Object.values(u).some((v) => v !== undefined), {
    message: 'Nothing to change',
  });
export type UpdateEntryInput = z.input<typeof UpdateEntryInput>;
export type UpdateEntry = z.output<typeof UpdateEntryInput>;

/** The recipe that an entry links to. */
export type WeekPlanRecipe = {
  id: string;
  title: string;
  activeMinutes: number | null;
  totalMinutes: number | null;
  photoUrl: string | null;
};

export type WeekPlanEntry = {
  id: string;
  date: string;
  /** The order within the date, from 0. */
  position: number;
  text: string;
  note: string | null;
  recipe: WeekPlanRecipe | null;
};

/** An entry as the change history stores it. */
export type WeekPlanSnapshot = {
  date: string;
  position: number;
  text: string;
  note: string | null;
  recipeId: string | null;
};
