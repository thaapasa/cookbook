import { useQuery } from '@tanstack/react-query';
import { Navigate, useMatch } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { meQuery } from '../api.ts';

/** Shows the children to logged-in users and sends others to the login page. */
export function RequireUser({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  // The path of the page's own route. The location changes to the login page
  // before this component unmounts, and the redirect must not point there.
  const pathname = useMatch({ strict: false, select: (m) => m.pathname });
  const me = useQuery(meQuery);

  if (me.isPending) return <PageMessage>{t('common.loading')}</PageMessage>;
  if (me.isError) return <PageMessage>{t('common.loadError')}</PageMessage>;
  if (!me.data.user) return <Navigate to="/login" search={{ redirect: pathname }} replace />;
  return children;
}

export function PageMessage({ children }: { children: string }) {
  return <p className="mx-auto max-w-290 px-4 py-8 text-muted sm:px-6">{children}</p>;
}
