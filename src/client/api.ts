import { queryOptions } from '@tanstack/react-query';

import type { LoginRequest, User } from '../shared/auth.ts';
import type {
  Note,
  NoteInput,
  Recipe,
  RecipeList,
  SaveRecipeRequest,
  TagCount,
} from '../shared/recipe.ts';

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(`Request failed with status ${status}`);
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers:
      init?.body instanceof FormData
        ? init.headers
        : { 'content-type': 'application/json', ...init?.headers },
  });
  if (!res.ok) throw new ApiError(res.status);
  return (res.status === 204 ? undefined : await res.json()) as T;
}

export type RecipeListParams = { q?: string; tags?: string[]; page?: number };

export const recipeListQuery = ({ q, tags = [], page = 1 }: RecipeListParams) =>
  queryOptions({
    queryKey: ['recipes', { q, tags, page }],
    queryFn: () => {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      for (const tag of tags) params.append('tag', tag);
      params.set('page', String(page));
      return request<RecipeList>(`/api/recipes?${params}`);
    },
  });

export const tagsQuery = queryOptions({
  queryKey: ['tags'],
  queryFn: () => request<TagCount[]>('/api/tags'),
});

export const recipeQuery = (id: string) =>
  queryOptions({
    queryKey: ['recipe', id],
    queryFn: () => request<Recipe>(`/api/recipes/${id}`),
  });

export const meQuery = queryOptions({
  queryKey: ['me'],
  queryFn: () => request<{ user: User | null }>('/api/auth/me'),
});

export function addNote(recipeId: string, input: NoteInput): Promise<Note> {
  return request<Note>(`/api/recipes/${recipeId}/notes`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateNote(recipeId: string, noteId: string, input: NoteInput): Promise<void> {
  return request(`/api/recipes/${recipeId}/notes/${noteId}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export function deleteNote(recipeId: string, noteId: string): Promise<void> {
  return request(`/api/recipes/${recipeId}/notes/${noteId}`, { method: 'DELETE' });
}

export function login(input: LoginRequest): Promise<User> {
  return request<User>('/api/auth/login', { method: 'POST', body: JSON.stringify(input) });
}

export function logout(): Promise<void> {
  return request('/api/auth/logout', { method: 'POST' });
}

/** Creates a recipe and returns its id. */
export async function createRecipe(input: SaveRecipeRequest): Promise<string> {
  const { id } = await request<{ id: string }>('/api/recipes', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return id;
}

export function updateRecipe(recipeId: string, input: SaveRecipeRequest): Promise<void> {
  return request(`/api/recipes/${recipeId}`, { method: 'PUT', body: JSON.stringify(input) });
}

export function deleteRecipe(recipeId: string): Promise<void> {
  return request(`/api/recipes/${recipeId}`, { method: 'DELETE' });
}

export function uploadPhoto(recipeId: string, photo: File): Promise<void> {
  const body = new FormData();
  body.set('photo', photo);
  return request(`/api/recipes/${recipeId}/photo`, { method: 'PUT', body });
}

export function deletePhoto(recipeId: string): Promise<void> {
  return request(`/api/recipes/${recipeId}/photo`, { method: 'DELETE' });
}
