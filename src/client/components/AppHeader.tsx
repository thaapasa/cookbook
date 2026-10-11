import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { meQuery } from '../api.ts';
import { LogoIcon } from './icons.tsx';

export function AppHeader() {
  const { t } = useTranslation();
  const user = useQuery(meQuery).data?.user;

  return (
    <header className="border-b border-line">
      <div className="mx-auto flex max-w-290 flex-wrap items-center gap-x-6 gap-y-4 px-4 py-3 sm:px-6 sm:py-4">
        <Link to="/" className="flex items-center gap-2.5 text-ink no-underline">
          <LogoIcon />
          <span className="font-display text-[22px] font-bold tracking-tight">{t('app.name')}</span>
        </Link>
        {user && (
          <nav aria-label={t('app.mainMenu')} className="ml-auto flex items-center gap-1">
            <span
              role="img"
              aria-label={t('app.user', { name: user.displayName })}
              className="grid size-11 place-items-center rounded-full border border-line bg-card text-[15px] font-semibold"
            >
              {user.displayName.charAt(0)}
            </span>
          </nav>
        )}
      </div>
    </header>
  );
}
