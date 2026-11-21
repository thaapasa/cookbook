import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useMatch, useNavigate, useRouterState } from '@tanstack/react-router';
import { useState } from 'react';
import { Button, Menu, MenuItem, MenuTrigger, Popover } from 'react-aria-components';
import { useTranslation } from 'react-i18next';

import type { User } from '../../shared/auth.ts';
import { logout, meQuery, recipeListQuery } from '../api.ts';
import { useBackState } from '../back.tsx';
import { headerSearchMedia, useMediaQuery } from '../media.ts';
import { setThemeMode, type ThemeMode, themeModes, useThemeMode } from '../theme.ts';
import { ContrastIcon, LogoIcon, MoonIcon, PlusIcon, SunIcon } from './icons.tsx';
import { RecipeSearchField } from './RecipeSearchField.tsx';

export function AppHeader() {
  const { t } = useTranslation();
  const me = useQuery(meQuery);
  const user = me.data?.user;
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const backState = useBackState();
  const wideScreen = useMediaQuery(headerSearchMedia);
  const headerSearch = wideScreen && pathname !== '/login';

  return (
    <header className="border-b border-line">
      {/* Below the md width, the header wraps and has no search. From md up, the search
          takes the free space, and the texts of the logo and the new recipe button
          hide on narrower screens to give it room. */}
      <div className="mx-auto flex max-w-290 flex-wrap items-center gap-x-6 gap-y-4 px-4 py-3 sm:px-6 sm:py-4 md:flex-nowrap">
        <Link to="/" className="flex shrink-0 items-center gap-2.5 text-ink no-underline">
          <LogoIcon />
          <span className="font-display text-[22px] font-bold tracking-tight md:max-lg:sr-only">
            {t('app.name')}
          </span>
        </Link>
        {user && <SectionTabs pathname={pathname} />}
        {headerSearch && (
          <div className="min-w-0 flex-1">
            <HeaderSearch />
          </div>
        )}
        <nav aria-label={t('app.mainMenu')} className="ml-auto flex shrink-0 items-center gap-3">
          {user ? (
            <>
              <Link
                to="/recipes/new"
                state={backState}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-ink px-4.5 text-[15px] font-semibold text-on-ink no-underline hover:text-on-ink md:max-xl:size-11 md:max-xl:px-0"
              >
                <PlusIcon />
                <span className="md:max-xl:sr-only">{t('app.newRecipe')}</span>
              </Link>
              <ThemeButton />
              <UserMenu user={user} isProfile={pathname === '/profile'} />
            </>
          ) : (
            <>
              <ThemeButton />
              {me.isSuccess && pathname !== '/login' && (
                <Link
                  to="/login"
                  search={{ redirect: backState.back.href }}
                  state={backState}
                  className="inline-flex min-h-11 items-center px-3 text-[15px] font-semibold text-muted no-underline hover:text-accent-strong"
                >
                  {t('app.login')}
                </Link>
              )}
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

/**
 * The recipe search in the header. On the recipe list, it shows and changes the
 * search of the list. On other pages, typing opens the recipe list with the text.
 */
function HeaderSearch() {
  const navigate = useNavigate();
  // The rendered match: while the recipe list loads, the previous page is still the match.
  const listMatch = useMatch({ from: '/_main/', shouldThrow: false });
  // The text typed on another page, until the recipe list shows.
  const [draft, setDraft] = useState('');
  if (listMatch && draft) setDraft('');

  const q = listMatch ? (listMatch.search.q ?? '') : draft;
  const tags = listMatch?.search.tags;
  const list = useQuery({
    ...recipeListQuery({ q, tags }),
    // On other pages, the list is not needed until the user types.
    enabled: Boolean(listMatch) || q !== '',
    placeholderData: keepPreviousData,
  });

  const onChange = (value: string) => {
    if (!listMatch) setDraft(value);
    void navigate({
      to: '/',
      search: { q: value || undefined, tags },
      replace: Boolean(listMatch),
    });
  };

  return (
    <RecipeSearchField value={q} matches={list.data?.recipes ?? []} onChange={onChange} compact />
  );
}

const tabClass =
  'inline-flex min-h-11 items-center rounded-full px-4 text-[15px] font-semibold no-underline hover:text-ink';

const selectedTab = { on: 'bg-chip text-ink', off: 'text-ink-soft' };

/** Tabs for the recipes and the week plan. Only logged-in users can see the plan. */
function SectionTabs({ pathname }: { pathname: string }) {
  const { t } = useTranslation();
  const inWeek = pathname.startsWith('/week');
  return (
    <nav aria-label={t('app.sections')} className="flex gap-1">
      {/* The router marks the link of the current page with aria-current. */}
      <Link
        to="/"
        activeOptions={{ exact: true }}
        className={`${tabClass} ${inWeek ? selectedTab.off : selectedTab.on}`}
      >
        {t('app.recipes')}
      </Link>
      <Link to="/week" className={`${tabClass} ${inWeek ? selectedTab.on : selectedTab.off}`}>
        {t('app.week')}
      </Link>
    </nav>
  );
}

const themeIcons: Record<ThemeMode, typeof SunIcon> = {
  system: ContrastIcon,
  light: SunIcon,
  dark: MoonIcon,
};

/** Shows the current theme and switches to the next one on press. */
function ThemeButton() {
  const { t } = useTranslation();
  const mode = useThemeMode();
  const Icon = themeIcons[mode];
  const label = t('theme.label', { mode: t(`theme.${mode}`) });
  const next = themeModes[(themeModes.indexOf(mode) + 1) % themeModes.length];

  return (
    <Button
      aria-label={label}
      onPress={() => setThemeMode(next)}
      className="grid size-11 cursor-pointer place-items-center rounded-full border border-line bg-card text-ink outline-accent"
    >
      <Icon size={20} />
    </Button>
  );
}

const menuItemClass =
  'flex min-h-11 cursor-pointer items-center rounded-xl px-3 text-[15px] font-semibold outline-none data-focused:bg-chip';

function UserMenu({ user, isProfile }: { user: User; isProfile: boolean }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const signOut = useMutation({
    mutationFn: logout,
    onSuccess: () => queryClient.setQueryData(meQuery.queryKey, { user: null }),
  });

  return (
    <MenuTrigger>
      <Button
        aria-label={t('app.user', { name: user.displayName })}
        className={`grid size-11 cursor-pointer place-items-center rounded-full bg-card text-[15px] font-semibold outline-accent ${isProfile ? 'border-2 border-ink' : 'border border-line'}`}
      >
        {user.displayName.charAt(0)}
      </Button>
      <Popover
        placement="bottom end"
        className="min-w-48 max-h-none! rounded-2xl border border-line-soft bg-card p-1.5 shadow-[0_10px_28px_var(--color-shadow)]"
      >
        <div className="px-3 pt-2 pb-1 text-sm text-muted">{user.displayName}</div>
        <Menu className="outline-none">
          <MenuItem onAction={() => void navigate({ to: '/profile' })} className={menuItemClass}>
            {t('app.profile')}
          </MenuItem>
          <MenuItem onAction={() => signOut.mutate()} className={menuItemClass}>
            {t('app.logout')}
          </MenuItem>
        </Menu>
      </Popover>
    </MenuTrigger>
  );
}
