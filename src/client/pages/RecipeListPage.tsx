import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { getRouteApi, Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { Button, Input, SearchField, ToggleButton } from 'react-aria-components';
import { useTranslation } from 'react-i18next';

import type { RecipeSummary } from '../../shared/recipe.ts';
import { recipeListQuery, tagsQuery } from '../api.ts';
import { useBackState } from '../back.tsx';
import { ChevronUpIcon, ClockIcon, CloseIcon, SearchIcon } from '../components/icons.tsx';
import { RecipePhoto } from '../components/RecipePhoto.tsx';
import { useFormatMinutes } from '../format.ts';

const route = getRouteApi('/_main/');

export function RecipeListPage() {
  const { t } = useTranslation();
  const { q = '', tags = [] } = route.useSearch();
  const navigate = route.useNavigate();
  const list = useQuery({
    ...recipeListQuery({ q, tags }),
    placeholderData: keepPreviousData,
  });
  const allTags = useQuery(tagsQuery).data ?? [];

  const setSearch = (next: { q?: string; tags?: string[] }) =>
    void navigate({
      search: (prev) => ({ ...prev, ...next }),
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
              className="min-h-10 cursor-pointer rounded-full border border-field bg-card px-4 text-[15px] font-medium outline-accent data-selected:border-ink data-selected:bg-ink data-selected:text-on-ink"
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
        </>
      )}
      <BackToTop />
    </main>
  );
}

// The width of the photo in the recipe grid above: the page is up to 1160 px wide
// with 16 or 24 px padding, the columns are at least 250 px with a 24 px gap, and
// the card has 10 px padding. Each value is the widest photo in its range.
const photoSizes = [
  '(min-width: 1120px) 270px',
  '(min-width: 846px) calc((100vw - 96px) / 3 - 20px)',
  '(min-width: 556px) calc((100vw - 56px) / 2 - 20px)',
  'calc(100vw - 52px)',
].join(', ');

function RecipeCard({ recipe }: { recipe: RecipeSummary }) {
  const formatMinutes = useFormatMinutes();
  const backState = useBackState('recipe.allRecipes');
  const minutes = recipe.totalMinutes ?? recipe.activeMinutes;
  return (
    <Link
      to="/recipes/$recipeId"
      params={{ recipeId: recipe.id }}
      state={backState}
      className="flex w-full flex-col gap-3 rounded-[18px] border border-line-soft bg-card p-2.5 pb-4 text-ink no-underline transition hover:-translate-y-0.5 hover:shadow-[0_10px_28px_var(--color-shadow)]"
    >
      <RecipePhoto
        recipeId={recipe.id}
        photo={recipe.photo}
        sizes={photoSizes}
        loading="lazy"
        className="rounded-xl"
      />
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

/** The button shows after scrolling down this many viewport heights. */
const backToTopThreshold = 0.5;

/** A floating button that scrolls back to the search field, shown once the page is scrolled down. */
function BackToTop() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const update = () => setVisible(window.scrollY > window.innerHeight * backToTopThreshold);
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);
  if (!visible) return null;

  const scrollToTop = () => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  };
  return (
    <Button
      onPress={scrollToTop}
      aria-label={t('list.backToTop')}
      className="fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] grid size-12 cursor-pointer place-items-center rounded-full border border-line bg-card text-ink shadow-[0_6px_20px_var(--color-shadow)] outline-accent sm:right-6 sm:bottom-6"
    >
      <ChevronUpIcon size={22} />
    </Button>
  );
}
