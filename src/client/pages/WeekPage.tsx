import { useQuery } from '@tanstack/react-query';
import { getRouteApi, Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { addDays, weekDates, type WeekPlanEntry } from '../../shared/week-plan.ts';
import { weekPlanQuery } from '../api.ts';
import { useBackState } from '../back.tsx';
import { primaryButtonClass } from '../components/fieldStyles.ts';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PencilIcon,
  PotIcon,
  TextLinesIcon,
} from '../components/icons.tsx';
import { RecipeThumb } from '../components/RecipePhoto.tsx';
import { RequireUser } from '../components/RequireUser.tsx';
import { useFormatMinutes } from '../format.ts';
import { currentWeekStart, today, useFormatDay } from '../week/dates.ts';

const route = getRouteApi('/_main/week/$start');

export function WeekPage() {
  return (
    <RequireUser>
      <WeekView />
    </RequireUser>
  );
}

function WeekView() {
  const { t } = useTranslation();
  const { start } = route.useParams();
  const plan = useQuery(weekPlanQuery(start));
  const backState = useBackState();
  const todayDate = today();
  const end = addDays(start, 6);

  return (
    <main className="mx-auto flex max-w-290 flex-col gap-4 px-4 pt-5 pb-12 sm:gap-7 sm:px-6 sm:pt-9 sm:pb-18">
      <div className="grid grid-cols-[1fr_auto] items-center gap-x-5 gap-y-4 sm:items-end sm:gap-y-2.5">
        <h1 className="font-display text-[clamp(34px,5vw,52px)] leading-[1.05] font-bold tracking-[-0.03em]">
          {t('week.heading')}
        </h1>
        <Link
          to="/week/$start/edit"
          params={{ start }}
          state={backState}
          className={`${primaryButtonClass} col-start-2 row-start-1 max-sm:size-11 max-sm:px-0 sm:row-span-2 sm:min-h-12`}
        >
          <PencilIcon />
          <span className="max-sm:sr-only">{t('week.edit')}</span>
        </Link>
        <WeekNav start={start} className="col-span-2 sm:col-span-1" />
      </div>

      {plan.isPending ? (
        <p className="text-muted">{t('common.loading')}</p>
      ) : plan.isError ? (
        <p className="text-accent-strong">{t('common.loadError')}</p>
      ) : plan.data.length ? (
        <ol className="flex flex-col gap-2">
          {weekDates(start).map((date) => (
            <DayRow
              key={date}
              date={date}
              isToday={date === todayDate}
              entries={plan.data.filter((e) => e.date === date)}
            />
          ))}
        </ol>
      ) : (
        <div className="flex flex-col items-center gap-3.5 rounded-[20px] border border-dashed border-field px-4 py-12 text-center sm:px-6 sm:py-18">
          <p className="font-display text-xl font-bold sm:text-2xl">
            {end < todayDate ? t('week.emptyPast') : t('week.emptyFuture')}
          </p>
          <Link
            to="/week/$start/edit"
            params={{ start }}
            state={backState}
            className={primaryButtonClass}
          >
            {t('week.plan')}
          </Link>
        </div>
      )}
    </main>
  );
}

const navButton =
  'grid size-11 flex-none place-items-center rounded-full text-ink no-underline hover:text-accent-strong sm:border sm:border-field sm:bg-card';

/** Moves to the previous, the next and the current week. */
function WeekNav({ start, className = '' }: { start: string; className?: string }) {
  const { t } = useTranslation();
  const format = useFormatDay();
  const current = currentWeekStart();
  const toCurrent = (extra: string) =>
    start !== current && (
      <Link
        to="/week/$start"
        params={{ start: current }}
        className={`font-semibold text-accent-strong underline underline-offset-3 ${extra}`}
      >
        {t('week.current')}
      </Link>
    );

  return (
    <div
      className={`flex items-center justify-between gap-2 max-sm:rounded-full max-sm:border max-sm:border-line-soft max-sm:bg-card max-sm:p-1 sm:justify-start ${className}`}
    >
      <Link
        to="/week/$start"
        params={{ start: addDays(start, -7) }}
        aria-label={t('week.previous')}
        className={navButton}
      >
        <ChevronLeftIcon />
      </Link>
      <span className="flex flex-col items-center leading-tight">
        <span className="text-base font-semibold tabular-nums sm:min-w-47.5 sm:text-center sm:text-lg">
          {format.range(start, addDays(start, 6))}
        </span>
        {toCurrent('px-1.5 py-0.5 text-[13px] sm:hidden')}
      </span>
      <Link
        to="/week/$start"
        params={{ start: addDays(start, 7) }}
        aria-label={t('week.next')}
        className={navButton}
      >
        <ChevronRightIcon />
      </Link>
      {toCurrent('inline-flex min-h-11 items-center px-4 text-[15px] max-sm:hidden')}
    </div>
  );
}

function DayRow(props: { date: string; isToday: boolean; entries: WeekPlanEntry[] }) {
  const { date, isToday, entries } = props;
  const { t } = useTranslation();
  const format = useFormatDay();

  return (
    <li
      aria-current={isToday ? 'date' : undefined}
      className={`grid gap-x-6 gap-y-2.5 rounded-[18px] border bg-card px-4 py-3.5 sm:grid-cols-[minmax(130px,200px)_minmax(0,1fr)] sm:items-start sm:rounded-[20px] sm:px-5.5 sm:py-4.5 ${
        isToday ? 'border-today-line' : 'border-line-soft'
      }`}
    >
      <div className="flex items-baseline gap-2 sm:flex-col sm:items-start sm:gap-1">
        <h2 className="font-display text-lg font-bold tracking-[-0.01em] sm:text-xl">
          {format.weekday(date)}
        </h2>
        <span className="text-sm text-muted tabular-nums sm:text-[15px]">
          {format.dayMonth(date)}
        </span>
        {isToday && (
          <span className="rounded-full bg-danger-soft px-2.25 py-px text-xs font-semibold text-today-ink max-sm:ml-auto sm:mt-0.5 sm:text-[13px]">
            {t('week.today')}
          </span>
        )}
      </div>
      <div className="flex min-w-0 flex-col gap-2.5 sm:gap-3">
        {entries.length ? (
          entries.map((entry) => <EntryItem key={entry.id} entry={entry} />)
        ) : (
          <span className="text-[15px] text-faint italic sm:py-3.5 sm:text-base">
            {t('week.noEntries')}
          </span>
        )}
      </div>
    </li>
  );
}

const entryGrid =
  'grid grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-3 sm:grid-cols-[56px_minmax(0,1fr)_auto] sm:gap-3.5';
const thumbClass = 'size-11 rounded-[10px] sm:size-14 sm:rounded-xl';

function EntryItem({ entry }: { entry: WeekPlanEntry }) {
  const { t } = useTranslation();
  const backState = useBackState('recipe.weekPlan');
  const formatMinutes = useFormatMinutes();
  const { recipe } = entry;
  const note = entry.note && (
    <span className="text-sm leading-[1.4] text-muted sm:text-[15px]">{entry.note}</span>
  );

  if (!recipe) {
    return (
      <div className={entryGrid}>
        <span
          aria-hidden="true"
          className={`${thumbClass} grid place-items-center border-[1.5px] border-dashed border-dashed-line text-faint`}
        >
          <TextLinesIcon />
        </span>
        <div className="flex min-w-0 flex-col">
          <span className="text-[17px] font-medium sm:text-lg">{entry.text}</span>
          {note}
        </div>
      </div>
    );
  }

  const minutes = recipe.totalMinutes ?? recipe.activeMinutes;
  const link = {
    to: '/recipes/$recipeId',
    params: { recipeId: recipe.id },
    state: backState,
  } as const;
  return (
    <div className={entryGrid}>
      <Link {...link} tabIndex={-1} aria-hidden="true">
        <RecipeThumb recipeId={recipe.id} photoUrl={recipe.photoUrl} className={thumbClass} />
      </Link>
      <div className="flex min-w-0 flex-col">
        <Link
          {...link}
          className="group flex flex-wrap items-baseline gap-x-2.5 text-ink no-underline"
        >
          <span className="text-[17px] font-semibold underline-offset-3 group-hover:text-accent-strong group-hover:underline sm:text-lg">
            {entry.text}
          </span>
          {minutes !== null && (
            <span className="text-sm text-muted max-sm:hidden">{formatMinutes(minutes)}</span>
          )}
        </Link>
        {note}
      </div>
      <Link
        to="/recipes/$recipeId/cook"
        params={{ recipeId: recipe.id }}
        state={backState}
        aria-label={t('week.cookRecipe', { name: entry.text })}
        className="inline-flex min-h-11 items-center gap-2 rounded-full border border-field bg-card text-[15px] font-semibold text-ink no-underline max-sm:size-11 max-sm:justify-center sm:px-3.5"
      >
        <PotIcon />
        <span className="max-sm:hidden">{t('week.cook')}</span>
      </Link>
    </div>
  );
}
