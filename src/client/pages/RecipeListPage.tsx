import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { getRouteApi, Link } from '@tanstack/react-router';
import { Button, Input, SearchField, ToggleButton } from 'react-aria-components';
import { useTranslation } from 'react-i18next';

import type { RecipeSummary } from '../../shared/recipe.ts';
import { recipeListQuery, tagsQuery } from '../api.ts';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  CloseIcon,
  SearchIcon,
} from '../components/icons.tsx';
import { RecipePhoto } from '../components/RecipePhoto.tsx';
import { useFormatMinutes } from '../format.ts';

const route = getRouteApi('/_main/');

export function RecipeListPage() {
  const { t } = useTranslation();
  const { q = '', tags = [], page = 1 } = route.useSearch();
  const navigate = route.useNavigate();
  const list = useQuery({
    ...recipeListQuery({ q, tags, page }),
    placeholderData: keepPreviousData,
  });
  const allTags = useQuery(tagsQuery).data ?? [];

  const setSearch = (next: { q?: string; tags?: string[] }) =>
    void navigate({
      search: (prev) => ({ ...prev, ...next, page: undefined }),
      replace: true,
    });
  const toggleTag = (tag: string) => {
    const next = tags.includes(tag) ? tags.filter((x) => x !== tag) : [...tags, tag];
    setSearch({ tags: next.length ? next : undefined });
  };

  return (
    <main className="mx-auto flex max-w-290 flex-col gap-7 px-4 pt-8 pb-16 sm:px-6 sm:pt-10">
      <div className="flex flex-col gap-5">
        <h1 className="font-display text-[clamp(34px,5vw,52px)] leading-[1.05] font-bold tracking-[-0.03em]">
          {t('list.heading')}
        </h1>
        <SearchField
          value={q}
          onChange={(value) => setSearch({ q: value || undefined })}
          aria-label={t('list.search')}
          className="group relative max-w-160"
        >
          <SearchIcon
            size={22}
            className="pointer-events-none absolute top-1/2 left-4.5 -translate-y-1/2 text-muted"
          />
          <Input
            placeholder={t('list.searchPlaceholder')}
            className="h-14 w-full rounded-2xl border border-field bg-card pr-14 pl-13 text-[17px] outline-accent [&::-webkit-search-cancel-button]:hidden"
          />
          <Button className="absolute top-1/2 right-2 grid size-11 -translate-y-1/2 cursor-pointer place-items-center rounded-full text-muted group-data-empty:hidden hover:bg-chip">
            <CloseIcon />
          </Button>
        </SearchField>
        <div role="group" aria-label={t('list.filterByTag')} className="flex flex-wrap gap-2">
          {allTags.map((tag) => (
            <ToggleButton
              key={tag.name}
              isSelected={tags.includes(tag.name)}
              onChange={() => toggleTag(tag.name)}
              className="min-h-10 cursor-pointer rounded-full border border-field bg-card px-4 text-[15px] font-medium outline-accent data-selected:border-ink data-selected:bg-ink data-selected:text-white"
            >
              {tag.name}
            </ToggleButton>
          ))}
          {(tags.length > 0 || q) && (
            <Button
              onPress={() => setSearch({ q: undefined, tags: undefined })}
              className="min-h-10 cursor-pointer px-3 text-sm font-semibold text-accent-strong underline"
            >
              {t('list.clear')}
            </Button>
          )}
        </div>
      </div>

      {list.isPending ? (
        <p className="text-muted">{t('common.loading')}</p>
      ) : list.isError ? (
        <p className="text-accent-strong">{t('common.loadError')}</p>
      ) : (
        <>
          <p className="text-[15px] text-muted">{t('list.count', { count: list.data.total })}</p>
          {list.data.recipes.length ? (
            <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(250px,100%),1fr))] gap-x-6 gap-y-7">
              {list.data.recipes.map((recipe) => (
                <li key={recipe.id} className="flex">
                  <RecipeCard recipe={recipe} />
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex flex-col items-center gap-2 rounded-[18px] border border-dashed border-field px-6 py-16 text-center">
              <p className="font-display text-[22px] font-bold">{t('list.noResults')}</p>
              <p className="text-muted">{t('list.noResultsHint')}</p>
            </div>
          )}
          <Pagination page={page} pageCount={Math.ceil(list.data.total / list.data.pageSize)} />
        </>
      )}
    </main>
  );
}

function RecipeCard({ recipe }: { recipe: RecipeSummary }) {
  const formatMinutes = useFormatMinutes();
  const minutes = recipe.totalMinutes ?? recipe.activeMinutes;
  return (
    <Link
      to="/recipes/$recipeId"
      params={{ recipeId: recipe.id }}
      className="flex w-full flex-col gap-3 rounded-[18px] border border-line-soft bg-card p-2.5 pb-4 text-ink no-underline transition hover:-translate-y-0.5 hover:shadow-[0_10px_28px_rgba(24,32,27,.10)]"
    >
      <RecipePhoto recipeId={recipe.id} photoUrl={recipe.photoUrl} className="rounded-xl" />
      <div className="flex flex-col gap-1.5 px-1.5">
        <h2 className="font-display text-xl leading-tight font-bold tracking-[-0.01em]">
          {recipe.title}
        </h2>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
          {minutes !== null && (
            <span className="inline-flex items-center gap-1.5">
              <ClockIcon size={16} />
              {formatMinutes(minutes)}
            </span>
          )}
          <span>{recipe.tags.join(' · ')}</span>
        </div>
      </div>
    </Link>
  );
}

/** The page numbers to show: the first, the last and the ones next to the current page. */
function visiblePages(page: number, pageCount: number): (number | null)[] {
  const pages: (number | null)[] = [];
  for (let p = 1; p <= pageCount; p++) {
    if (p === 1 || p === pageCount || Math.abs(p - page) <= 1) pages.push(p);
    else if (pages.at(-1) !== null) pages.push(null);
  }
  return pages;
}

const pageButton =
  'grid size-11 place-items-center rounded-full border border-line bg-card text-[15px] font-semibold text-ink no-underline';

function Pagination({ page, pageCount }: { page: number; pageCount: number }) {
  const { t } = useTranslation();
  if (pageCount <= 1) return null;
  const pageSearch = (p: number) => (prev: Record<string, unknown>) => ({
    ...prev,
    page: p > 1 ? p : undefined,
  });

  return (
    <nav aria-label={t('list.pagination')} className="flex flex-wrap justify-center gap-2 pt-2">
      {page > 1 ? (
        <Link
          to="/"
          search={pageSearch(page - 1)}
          aria-label={t('list.previousPage')}
          className={pageButton}
        >
          <ChevronLeftIcon />
        </Link>
      ) : (
        <span aria-hidden="true" className={`${pageButton} bg-transparent text-disabled`}>
          <ChevronLeftIcon />
        </span>
      )}
      {visiblePages(page, pageCount).map((p, i) =>
        p === null ? (
          <span key={`gap-${i}`} className="grid size-11 place-items-center text-muted">
            …
          </span>
        ) : (
          <Link
            key={p}
            to="/"
            search={pageSearch(p)}
            // The default partial search match makes the page 1 link (no page param) active on every page
            activeOptions={{ exact: true }}
            aria-label={t('list.page', { page: p })}
            aria-current={p === page ? 'page' : undefined}
            className={`${pageButton} aria-[current=page]:border-ink aria-[current=page]:bg-ink aria-[current=page]:text-white`}
          >
            {p}
          </Link>
        ),
      )}
      {page < pageCount ? (
        <Link
          to="/"
          search={pageSearch(page + 1)}
          aria-label={t('list.nextPage')}
          className={pageButton}
        >
          <ChevronRightIcon />
        </Link>
      ) : (
        <span aria-hidden="true" className={`${pageButton} bg-transparent text-disabled`}>
          <ChevronRightIcon />
        </span>
      )}
    </nav>
  );
}
