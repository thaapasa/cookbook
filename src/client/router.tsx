import { createRootRoute, createRoute, createRouter, Outlet } from '@tanstack/react-router';
import { z } from 'zod';

import { AppHeader } from './components/AppHeader.tsx';
import { CookingPage } from './pages/CookingPage.tsx';
import { EditorPage } from './pages/EditorPage.tsx';
import { LoginPage } from './pages/LoginPage.tsx';
import { RecipeListPage } from './pages/RecipeListPage.tsx';
import { RecipePage } from './pages/RecipePage.tsx';

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

export const router = createRouter({
  routeTree: rootRoute.addChildren([
    mainRoute.addChildren([recipeListRoute, recipeRoute, loginRoute]),
    newRecipeRoute,
    editRecipeRoute,
    cookingRoute,
  ]),
  scrollRestoration: true,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
