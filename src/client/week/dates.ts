import { useTranslation } from 'react-i18next';

import { IsoDate, toIsoDate, weekStart } from '../../shared/week-plan.ts';

export function today(): string {
  return toIsoDate(new Date());
}

export function currentWeekStart(): string {
  return weekStart(today());
}

/** The start of the week that contains a date from the URL, or of the current week. */
export function normalizeWeekStart(date: string): string {
  return IsoDate.safeParse(date).success ? weekStart(date) : currentWeekStart();
}

/** Returns functions that format a date as a weekday ("Lauantai") and as "17.10.". */
export function useFormatDay() {
  const { i18n } = useTranslation();
  // The dates are calendar dates, so they are formatted in UTC to keep the day.
  const weekday = new Intl.DateTimeFormat(i18n.language, { weekday: 'long', timeZone: 'UTC' });
  const dayMonth = new Intl.DateTimeFormat(i18n.language, {
    day: 'numeric',
    month: 'numeric',
    timeZone: 'UTC',
  });
  const year = new Intl.DateTimeFormat(i18n.language, { year: 'numeric', timeZone: 'UTC' });
  const utc = (date: string) => new Date(`${date}T00:00:00Z`);
  return {
    weekday: (date: string) => {
      const name = weekday.format(utc(date));
      return name.charAt(0).toUpperCase() + name.slice(1);
    },
    dayMonth: (date: string) => dayMonth.format(utc(date)),
    /** "17.10. – 23.10.2026", with both years when the week spans two. */
    range: (start: string, end: string) => {
      const startYear = start.slice(0, 4) === end.slice(0, 4) ? '' : year.format(utc(start));
      return `${dayMonth.format(utc(start))}${startYear} – ${dayMonth.format(utc(end))}${year.format(utc(end))}`;
    },
  };
}
