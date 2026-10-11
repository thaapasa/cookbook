import { createRootRoute, createRoute, createRouter, Outlet } from '@tanstack/react-router';
import { z } from 'zod';

import { AppHeader } from './components/AppHeader.tsx';
import { RecipeListPage } from './pages/RecipeListPage.tsx';
import { RecipePage } from './pages/RecipePage.tsx';

const rootRoute = createRootRoute({
  component: () => (
    <div className="min-h-screen">
      <AppHeader />
      <Outlet />
    </div>
  ),
});

const RecipeListSearch = z.object({
  q: z.string().optional().catch(undefined),
  tags: z.array(z.string()).optional().catch(undefined),
  page: z.int().min(1).optional().catch(undefined),
});

const recipeListRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  validateSearch: RecipeListSearch,
  component: RecipeListPage,
});

const recipeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/recipes/$recipeId',
  component: RecipePage,
});

export const router = createRouter({
  routeTree: rootRoute.addChildren([recipeListRoute, recipeRoute]),
  scrollRestoration: true,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
