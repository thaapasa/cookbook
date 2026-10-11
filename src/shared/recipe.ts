import { z } from 'zod';

/** Free text where an empty value is stored as `null`. */
export const OptionalText = z
  .string()
  .trim()
  .nullish()
  .transform((s) => s || null);

const Minutes = z
  .int()
  .min(0)
  .nullish()
  .transform((m) => m ?? null);

export const IngredientInput = z.object({
  amount: OptionalText,
  name: z.string().trim().min(1),
  note: OptionalText,
});
export type IngredientInput = z.infer<typeof IngredientInput>;

export const IngredientGroupInput = z.object({
  name: OptionalText,
  ingredients: z.array(IngredientInput),
});

export const StepGroupInput = z.object({
  name: OptionalText,
  steps: z.array(z.string().trim().min(1)),
});

/** The content of a recipe. Revisions store their snapshots in this format. */
export const RecipeInput = z.object({
  title: z.string().trim().min(1),
  description: OptionalText,
  servings: OptionalText,
  activeMinutes: Minutes,
  totalMinutes: Minutes,
  source: OptionalText,
  tags: z.array(z.string().trim().min(1)).default([]),
  ingredientGroups: z.array(IngredientGroupInput).default([]),
  stepGroups: z.array(StepGroupInput).default([]),
});
export type RecipeInput = z.input<typeof RecipeInput>;
export type RecipeContent = z.output<typeof RecipeInput>;

/** The body of a request that creates or updates a recipe. */
export const SaveRecipeRequest = z.object({
  recipe: RecipeInput,
  /** What changed, shown in the revision history. */
  revisionNote: OptionalText,
});
export type SaveRecipeRequest = z.input<typeof SaveRecipeRequest>;

export type Note = {
  id: string;
  authorName: string;
  text: string;
  /** ISO 8601 timestamp. */
  createdAt: string;
};

export const NoteInput = z.object({ text: z.string().trim().min(1) });
export type NoteInput = z.infer<typeof NoteInput>;

export type Recipe = RecipeContent & {
  id: string;
  photoUrl: string | null;
  notes: Note[];
};

export type RecipeSummary = {
  id: string;
  title: string;
  activeMinutes: number | null;
  totalMinutes: number | null;
  photoUrl: string | null;
  tags: string[];
};

export const recipePageSize = 12;

/** Query parameters of the recipe list. `tag` repeats once per tag. */
export const RecipeListQuery = z.object({
  q: z.string().trim().optional(),
  tag: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((t) => (t === undefined ? [] : [t].flat())),
  page: z.coerce.number().int().min(1).default(1),
});
export type RecipeListQuery = z.input<typeof RecipeListQuery>;

export type RecipeList = {
  recipes: RecipeSummary[];
  total: number;
  page: number;
  pageSize: number;
};

export type TagCount = { name: string; count: number };
