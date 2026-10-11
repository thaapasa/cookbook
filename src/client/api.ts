import { queryOptions } from '@tanstack/react-query';

import type { User } from '../shared/auth.ts';
import type { Note, NoteInput, Recipe, RecipeList, TagCount } from '../shared/recipe.ts';

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
    headers: { 'content-type': 'application/json', ...init?.headers },
  });
  if (!res.ok) throw new ApiError(res.status);
  return (await res.json()) as T;
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
