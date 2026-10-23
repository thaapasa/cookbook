import {
  type Day,
  type DayRange,
  type IntegrationEntry,
  type IntegrationPhoto,
  type Settings,
  type Week,
  weekdayOf,
  weekdays,
} from '../../shared/integration.ts';
import type { Photo } from '../../shared/recipe.ts';
import {
  addDays,
  toIsoDate,
  type WeekPlanEntry,
  weekStart,
  weekStartDay,
} from '../../shared/week-plan.ts';
import { absoluteUrl } from '../public-url.ts';
import { listEntries } from '../week-plan/repository.ts';

/** Marks a page as opened from another system, so that its back links go back there. */
const external = '?from=external';

export function getSettings(): Settings {
  return { weekStartDay: weekdays[weekStartDay] };
}

/** Returns the week that contains `date`, or today in the server's time zone. */
export async function getWeek(date = toIsoDate(new Date())): Promise<Week> {
  const start = weekStart(date);
  const end = addDays(start, 6);
  return { start, end, weekStartDay: weekdays[weekStartDay], days: await getDayList(start, end) };
}

/** Returns each date from `from` to `to`, both included, with its entries. */
export async function getDays(from: string, to: string): Promise<DayRange> {
  return { from, to, days: await getDayList(from, to) };
}

async function getDayList(from: string, to: string): Promise<Day[]> {
  const byDate = Map.groupBy(await listEntries(from, to), (e) => e.date);
  return dateRange(from, to).map((date) => ({
    date,
    weekday: weekdayOf(date),
    entries: (byDate.get(date) ?? []).map(toEntry),
  }));
}

function dateRange(from: string, to: string): string[] {
  const dates: string[] = [];
  for (let date = from; date <= to; date = addDays(date, 1)) dates.push(date);
  return dates;
}

function toEntry(entry: WeekPlanEntry): IntegrationEntry {
  const { recipe } = entry;
  return {
    id: entry.id,
    text: entry.text,
    note: entry.note,
    recipe: recipe && {
      id: recipe.id,
      title: recipe.title,
      url: absoluteUrl(`/recipes/${recipe.id}${external}`),
      cookingUrl: absoluteUrl(`/recipes/${recipe.id}/cook${external}`),
      photo: recipe.photo && toPhoto(recipe.photo),
    },
  };
}

function toPhoto(photo: Photo): IntegrationPhoto {
  return {
    url: absoluteUrl(photo.url),
    sizes: photo.sizes.map(({ size, url }) => ({ size, url: absoluteUrl(url) })),
  };
}
