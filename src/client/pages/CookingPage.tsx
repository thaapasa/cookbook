import { useQuery } from '@tanstack/react-query';
import { getRouteApi, Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { Checkbox, ToggleButton } from 'react-aria-components';
import { useTranslation } from 'react-i18next';

import type { Recipe } from '../../shared/recipe.ts';
import { ApiError, recipeQuery } from '../api.ts';
import { CloseIcon, SunIcon } from '../components/icons.tsx';
import { useFormatMinutes } from '../format.ts';

const route = getRouteApi('/recipes/$recipeId/cook');

const sectionHeading = 'font-display text-[26px] font-bold';
const groupHeading = 'text-[15px] font-semibold tracking-[0.08em] text-cook-muted uppercase';

export function CookingPage() {
  const { t } = useTranslation();
  const { recipeId } = route.useParams();
  const recipe = useQuery(recipeQuery(recipeId));

  return (
    <div className="flex min-h-screen flex-col bg-cook-bg leading-[1.4] text-cook-ink">
      {recipe.isPending ? (
        <p className="p-8 text-xl text-cook-muted">{t('common.loading')}</p>
      ) : recipe.isError ? (
        <p className="p-8 font-display text-2xl font-bold">
          {recipe.error instanceof ApiError && recipe.error.status === 404
            ? t('recipe.notFound')
            : t('common.loadError')}
        </p>
      ) : (
        <CookingContent recipe={recipe.data} />
      )}
    </div>
  );
}

function CookingContent({ recipe }: { recipe: Recipe }) {
  const { t } = useTranslation();
  const formatMinutes = useFormatMinutes();
  const awake = useWakeLock();
  const [done, setDone] = useState<ReadonlySet<string>>(new Set());
  const [activeStep, setActiveStep] = useState<number | null>(null);

  const meta = [
    recipe.servings,
    recipe.totalMinutes !== null ? formatMinutes(recipe.totalMinutes) : null,
  ].filter(Boolean);
  const ingredientCount = recipe.ingredientGroups.reduce((n, g) => n + g.ingredients.length, 0);

  const toggleIngredient = (key: string, checked: boolean) =>
    setDone((prev) => {
      const next = new Set(prev);
      if (checked) next.add(key);
      else next.delete(key);
      return next;
    });

  // Steps are numbered across groups.
  const stepOffsets = recipe.stepGroups.map((_, g) =>
    recipe.stepGroups.slice(0, g).reduce((sum, group) => sum + group.steps.length, 0),
  );

  return (
    <>
      <header className="flex flex-wrap items-center gap-x-5 gap-y-3 border-b border-cook-line px-4 py-4.5 sm:px-8">
        <Link
          to="/recipes/$recipeId"
          params={{ recipeId: recipe.id }}
          aria-label={t('cooking.close')}
          className="grid size-13 shrink-0 place-items-center rounded-full bg-cook-raised text-cook-ink hover:text-white"
        >
          <CloseIcon size={22} strokeWidth={2.2} />
        </Link>
        <h1 className="min-w-0 font-display text-[34px] leading-tight font-bold tracking-[-0.02em] break-words">
          {recipe.title}
        </h1>
        {meta.length > 0 && <span className="text-lg text-cook-muted">{meta.join(' · ')}</span>}
        {awake && (
          <span className="ml-auto inline-flex items-center gap-2 rounded-full bg-cook-raised px-3.5 py-2 text-[15px] text-cook-ink-soft">
            <SunIcon />
            {t('cooking.awake')}
          </span>
        )}
      </header>

      <div className="flex flex-1 flex-col lg:flex-row">
        <section
          aria-labelledby="cook-ingredients"
          className="flex flex-col gap-3.5 border-b border-cook-line px-4 py-7 sm:px-8 lg:w-105 lg:shrink-0 lg:border-r lg:border-b-0"
        >
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="cook-ingredients" className={sectionHeading}>
              {t('recipe.ingredients')}
            </h2>
            <span className="text-base text-cook-muted">
              {t('cooking.done', { done: done.size, total: ingredientCount })}
            </span>
          </div>
          {/* Two columns when the ingredients are above the steps. */}
          <div className="gap-x-8 sm:columns-2 lg:columns-1">
            {recipe.ingredientGroups.map((group, g) => (
              <div key={g} className="flex break-inside-avoid flex-col gap-1.5 pt-1.5">
                {group.name && <h3 className={groupHeading}>{group.name}</h3>}
                <ul className="flex flex-col gap-0.5">
                  {group.ingredients.map((ingredient, i) => {
                    const key = `${g}-${i}`;
                    return (
                      <li key={key}>
                        <Checkbox
                          isSelected={done.has(key)}
                          onChange={(checked) => toggleIngredient(key, checked)}
                          className="group flex min-h-13 cursor-pointer items-center gap-4"
                        >
                          <span className="grid size-7.5 shrink-0 place-items-center rounded-[9px] border-2 border-cook-check group-data-focus-visible:outline-3 group-data-focus-visible:outline-offset-2 group-data-focus-visible:outline-cook-ink group-data-selected:border-cook-accent group-data-selected:bg-cook-accent">
                            <span className="hidden h-3.75 w-2.25 -translate-y-0.5 rotate-45 border-r-3 border-b-3 border-cook-bg group-data-selected:block" />
                          </span>
                          <span className="flex flex-col">
                            <span className="text-[21px] group-data-selected:text-cook-done group-data-selected:line-through group-data-selected:decoration-2">
                              {ingredient.amount && (
                                <strong className="font-semibold">{ingredient.amount} </strong>
                              )}
                              {ingredient.name}
                            </span>
                            {ingredient.note && (
                              <span className="text-base leading-snug text-cook-muted group-data-selected:hidden">
                                {ingredient.note}
                              </span>
                            )}
                          </span>
                        </Checkbox>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section
          aria-labelledby="cook-steps"
          className="flex min-w-0 flex-1 flex-col gap-3.5 px-4 pt-7 pb-10 sm:px-8"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 id="cook-steps" className={sectionHeading}>
              {t('recipe.steps')}
            </h2>
            <span className="text-base text-cook-muted">{t('cooking.highlightHint')}</span>
          </div>
          {recipe.stepGroups.map((group, g) => (
            <div key={g} className="flex flex-col gap-2.5 pt-1.5">
              {group.name && <h3 className={groupHeading}>{group.name}</h3>}
              <ol className="flex flex-col gap-2.5">
                {group.steps.map((step, i) => {
                  const stepNumber = stepOffsets[g] + i + 1;
                  return (
                    <li key={i} value={stepNumber}>
                      <ToggleButton
                        isSelected={activeStep === stepNumber}
                        onChange={(selected) => setActiveStep(selected ? stepNumber : null)}
                        className="group grid w-full cursor-pointer grid-cols-[48px_1fr] items-start gap-4.5 rounded-[18px] border border-cook-line bg-cook-panel px-5.5 py-4.5 text-left text-2xl text-cook-ink-soft outline-none data-focus-visible:outline-3 data-focus-visible:outline-offset-2 data-focus-visible:outline-cook-ink data-selected:border-transparent data-selected:bg-cook-ink data-selected:text-[30px] data-selected:font-medium data-selected:text-cook-bg data-selected:shadow-[0_0_0_4px_var(--color-cook-accent)]"
                      >
                        <span
                          aria-hidden="true"
                          className="grid size-11 place-items-center rounded-full bg-cook-line font-display text-xl font-bold text-cook-ink group-data-selected:bg-accent group-data-selected:text-white"
                        >
                          {stepNumber}
                        </span>
                        <span className="text-pretty">{step}</span>
                      </ToggleButton>
                    </li>
                  );
                })}
              </ol>
            </div>
          ))}
        </section>
      </div>
    </>
  );
}

/**
 * Keeps the screen awake while the component is mounted, where the browser
 * supports it. Returns whether the lock is held.
 */
function useWakeLock(): boolean {
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (!('wakeLock' in navigator)) return;
    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;

    const request = async () => {
      try {
        const lock = await navigator.wakeLock.request('screen');
        if (cancelled) {
          await lock.release();
          return;
        }
        sentinel = lock;
        setActive(true);
        lock.addEventListener('release', () => setActive(false));
      } catch {
        setActive(false);
      }
    };

    // The browser releases the lock when the page is hidden.
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible' && (!sentinel || sentinel.released)) {
        void request();
      }
    };

    void request();
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibilityChange);
      void sentinel?.release();
    };
  }, []);

  return active;
}
