import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { getRouteApi, Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { Button, ToggleButton } from 'react-aria-components';
import { useTranslation } from 'react-i18next';

import type { RecipeSummary } from '../../shared/recipe.ts';
import { meQuery, recipeListQuery, tagsQuery } from '../api.ts';
import { useBackState } from '../back.tsx';
import { ChevronUpIcon, ClockIcon } from '../components/icons.tsx';
import { RecipePhoto } from '../components/RecipePhoto.tsx';
import { RecipeSearchField } from '../components/RecipeSearchField.tsx';
import { useDragSource } from '../editor/sortable.tsx';
import { useFormatMinutes } from '../format.ts';
import { headerSearchMedia, useMediaQuery } from '../media.ts';
import { usePanelState } from '../week/panel-state.ts';
import { recipeDragType, WeekPanel } from '../week/WeekPanel.tsx';

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
  const headerSearch = useMediaQuery(headerSearchMedia);
  const user = useQuery(meQuery).data?.user;
  // Phones have no room for the week panel beside the list.
  const showPanel = !!user && headerSearch;
  const panel = usePanelState();
  const panelOpen = showPanel && panel.open;
  const findRecipe = (id: string) => list.data?.recipes.find((r) => r.id === id);

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
    <div className="flex items-start">
      <main className="mx-auto flex min-w-0 max-w-290 flex-1 flex-col gap-7 px-4 pt-8 pb-16 sm:px-6 sm:pt-10 md:pt-6">
        <h1 className="sr-only">{t('app.recipes')}</h1>
        {/* The tags wrap below the search field unless they get at least 23rem beside it. */}
        <div className="flex flex-wrap items-start gap-5">
          {!headerSearch && (
            <div className="min-w-0 flex-[0_1_40rem]">
              <RecipeSearchField
                value={q}
                matches={list.data?.recipes ?? []}
                onChange={(value) => setSearch({ q: value || undefined })}
              />
            </div>
          )}
          <div
            role="group"
            aria-label={t('list.filterByTag')}
            className="flex flex-[1_1_23rem] flex-wrap gap-2"
          >
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
              // Narrower cards beside the week panel keep three columns on a laptop screen.
              <ul
                className={`grid gap-x-6 gap-y-7 ${
                  panelOpen
                    ? 'grid-cols-[repeat(auto-fill,minmax(min(220px,100%),1fr))]'
                    : 'grid-cols-[repeat(auto-fill,minmax(min(250px,100%),1fr))]'
                }`}
              >
                {list.data.recipes.map((recipe) => (
                  <li key={recipe.id} className="flex">
                    <RecipeCard recipe={recipe} draggable={panelOpen} />
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
        <BackToTop besidePanel={panelOpen} />
      </main>
      {showPanel && <WeekPanel panel={panel} findRecipe={findRecipe} />}
    </div>
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

/** While the week panel is open, a `draggable` card can be dragged onto a day of the panel. */
function RecipeCard({ recipe, draggable }: { recipe: RecipeSummary; draggable: boolean }) {
  const formatMinutes = useFormatMinutes();
  const backState = useBackState('recipe.allRecipes');
  const drag = useDragSource({
    type: recipeDragType,
    itemKey: recipe.id,
    longPress: true,
    ghostScale: 0.5,
    disabled: !draggable,
  });
  const minutes = recipe.totalMinutes ?? recipe.activeMinutes;
  return (
    <Link
      to="/recipes/$recipeId"
      params={{ recipeId: recipe.id }}
      state={backState}
      {...drag}
      className={`flex w-full flex-col gap-3 rounded-[18px] border border-line-soft bg-card p-2.5 pb-4 text-ink no-underline transition hover:-translate-y-0.5 hover:shadow-[0_10px_28px_var(--color-shadow)] ${
        draggable ? 'cursor-grab select-none [-webkit-touch-callout:none]' : ''
      }`}
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
function BackToTop({ besidePanel }: { besidePanel: boolean }) {
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
      // Keeps the button off the open week panel, whose width is set in `WeekPanel`.
      style={besidePanel ? { right: 'calc(min(23.75rem, 40vw) + 5rem)' } : undefined}
      className="fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] grid size-12 cursor-pointer place-items-center rounded-full border border-line bg-card text-ink shadow-[0_6px_20px_var(--color-shadow)] outline-accent sm:right-6 sm:bottom-6"
    >
      <ChevronUpIcon size={22} />
    </Button>
  );
}
