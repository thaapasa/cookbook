import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  redirect,
} from '@tanstack/react-router';
import { z } from 'zod';

import { AppHeader } from './components/AppHeader.tsx';
import { CookingPage } from './pages/CookingPage.tsx';
import { EditorPage } from './pages/EditorPage.tsx';
import { LoginPage } from './pages/LoginPage.tsx';
import { RecipeListPage } from './pages/RecipeListPage.tsx';
import { RecipePage } from './pages/RecipePage.tsx';
import { WeekEditPage } from './pages/WeekEditPage.tsx';
import { WeekPage } from './pages/WeekPage.tsx';
import { currentWeekStart, normalizeWeekStart } from './week/dates.ts';

const rootRoute = createRootRoute({
  component: () => (
    <div className="min-h-screen">
      <Outlet />
    </div>
  ),
});

/** Pages with the app header. The editor has its own header. */
const mainRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: '_main',
  component: () => (
    <>
      <AppHeader />
      <Outlet />
    </>
  ),
});

const RecipeListSearch = z.object({
  q: z.string().optional().catch(undefined),
  tags: z.array(z.string()).optional().catch(undefined),
  page: z.int().min(1).optional().catch(undefined),
});

const recipeListRoute = createRoute({
  getParentRoute: () => mainRoute,
  path: '/',
  validateSearch: RecipeListSearch,
  component: RecipeListPage,
});

const recipeRoute = createRoute({
  getParentRoute: () => mainRoute,
  path: '/recipes/$recipeId',
  component: RecipePage,
});

const LoginSearch = z.object({
  // Only paths within the app, so that the login page cannot redirect elsewhere.
  redirect: z
    .string()
    .regex(/^\/(?![/\\])/)
    .optional()
    .catch(undefined),
});

const loginRoute = createRoute({
  getParentRoute: () => mainRoute,
  path: '/login',
  validateSearch: LoginSearch,
  component: LoginPage,
});

const newRecipeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/recipes/new',
  component: EditorPage,
});

const editRecipeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/recipes/$recipeId/edit',
  component: EditorPage,
});

const cookingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/recipes/$recipeId/cook',
  component: CookingPage,
});

const weekRoute = createRoute({
  getParentRoute: () => mainRoute,
  path: '/week',
  beforeLoad: () => {
    redirect({
      to: '/week/$start',
      params: { start: currentWeekStart() },
      replace: true,
      throw: true,
    });
  },
});

/** Sends a date in the middle of a week, or an invalid date, to the start of a week. */
function checkWeekStart(to: '/week/$start' | '/week/$start/edit') {
  return ({ params }: { params: { start: string } }) => {
    const start = normalizeWeekStart(params.start);
    if (start !== params.start) redirect({ to, params: { start }, replace: true, throw: true });
  };
}

const weekViewRoute = createRoute({
  getParentRoute: () => mainRoute,
  path: '/week/$start',
  beforeLoad: checkWeekStart('/week/$start'),
  component: WeekPage,
});

const weekEditRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/week/$start/edit',
  beforeLoad: checkWeekStart('/week/$start/edit'),
  component: WeekEditPage,
});

export const router = createRouter({
  routeTree: rootRoute.addChildren([
    mainRoute.addChildren([recipeListRoute, recipeRoute, loginRoute, weekRoute, weekViewRoute]),
    newRecipeRoute,
    editRecipeRoute,
    cookingRoute,
    weekEditRoute,
  ]),
  scrollRestoration: true,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
