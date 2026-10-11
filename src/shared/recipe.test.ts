import { describe, expect, it } from 'vitest';

import { RecipeInput } from './recipe.ts';

describe('RecipeInput', () => {
  it('trims text, stores empty text as null and fills defaults', () => {
    expect(RecipeInput.parse({ title: '  Pulla ', description: '  ', servings: '' })).toEqual({
      title: 'Pulla',
      description: null,
      servings: null,
      activeMinutes: null,
      totalMinutes: null,
      source: null,
      tags: [],
      ingredientGroups: [],
      stepGroups: [],
    });
  });

  it('requires a title', () => {
    expect(RecipeInput.safeParse({ title: ' ' }).success).toBe(false);
  });
});
