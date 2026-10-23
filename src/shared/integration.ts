import { z } from 'zod';

import { IsoDate } from './week-plan.ts';

/** The named schemas of the integration API, for its OpenAPI description. */
export const integrationSchemas = z.registry<{ id: string }>();

/** Weekday names, in the order of `Date.getDay()`. */
export const weekdays = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
] as const;

export const Weekday = z.enum(weekdays).register(integrationSchemas, { id: 'Weekday' });
export type Weekday = z.infer<typeof Weekday>;

/** Returns the weekday of a `YYYY-MM-DD` date. */
export function weekdayOf(date: string): Weekday {
  return weekdays[new Date(`${date}T00:00:00Z`).getUTCDay()];
}

export const Settings = z
  .object({
    weekStartDay: Weekday.describe('The day that weeks start on. The week view uses the same.'),
  })
  .register(integrationSchemas, { id: 'Settings' });
export type Settings = z.infer<typeof Settings>;

export const IntegrationPhoto = z
  .object({
    url: z.url().describe('URL of the full photo.'),
    sizes: z
      .array(
        z.object({
          size: z.int().describe('Length of the short side in pixels.'),
          url: z.url(),
        }),
      )
      .describe('Smaller sizes of the photo, smallest first.'),
  })
  .register(integrationSchemas, { id: 'Photo' });
export type IntegrationPhoto = z.infer<typeof IntegrationPhoto>;

export const IntegrationRecipe = z
  .object({
    id: z.uuid(),
    title: z.string(),
    url: z.url().describe('URL of the recipe page.'),
    cookingUrl: z.url().describe('URL of the cooking view of the recipe.'),
    photo: IntegrationPhoto.nullable().describe('Null if the recipe has no photo.'),
  })
  .register(integrationSchemas, { id: 'Recipe' });
export type IntegrationRecipe = z.infer<typeof IntegrationRecipe>;

export const IntegrationEntry = z
  .object({
    id: z.uuid(),
    text: z.string().describe('What the plan shows, such as a dish name.'),
    note: z.string().nullable().describe('Extra details, such as "tuplasatsi".'),
    recipe: IntegrationRecipe.nullable().describe(
      'The linked recipe, or null for a free-text entry.',
    ),
  })
  .register(integrationSchemas, { id: 'Entry' });
export type IntegrationEntry = z.infer<typeof IntegrationEntry>;

export const Day = z
  .object({
    date: IsoDate,
    weekday: Weekday,
    entries: z.array(IntegrationEntry).describe('In plan order.'),
  })
  .register(integrationSchemas, { id: 'Day' });
export type Day = z.infer<typeof Day>;

export const Week = z
  .object({
    start: IsoDate.describe('The first day of the week.'),
    end: IsoDate.describe('The last day of the week.'),
    weekStartDay: Weekday,
    days: z.array(Day).length(7).describe('The seven days of the week in order.'),
  })
  .register(integrationSchemas, { id: 'Week' });
export type Week = z.infer<typeof Week>;

export const DayRange = z
  .object({
    from: IsoDate,
    to: IsoDate,
    days: z.array(Day).describe('Each date of the range in order.'),
  })
  .register(integrationSchemas, { id: 'DayRange' });
export type DayRange = z.infer<typeof DayRange>;

export const ApiError = z
  .object({ error: z.string().describe('What went wrong.') })
  .register(integrationSchemas, { id: 'Error' });
export type ApiError = z.infer<typeof ApiError>;

export const WeekQuery = z.object({
  date: IsoDate.optional().describe('A date in the week. Default: today.'),
});
export type WeekQuery = z.infer<typeof WeekQuery>;
