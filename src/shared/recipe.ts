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

// Descriptions that both the input and the output schemas use.
const groupNameInfo =
  'A heading such as "Sauce" when the recipe has several parts. Null when there is only one group.';
const activeMinutesInfo = 'Hands-on time in minutes.';
const totalMinutesInfo = 'Time from start to finish in minutes, including waiting and baking.';
const photoUrlInfo = 'Path of the photo on the cookbook site, or null if there is no photo.';

export const IngredientInput = z.object({
  amount: OptionalText.describe(
    'Quantity and unit as text, such as "2 dl" or "1–2". Null when there is no amount, as with salt to taste.',
  ),
  name: z
    .string()
    .trim()
    .min(1)
    .describe(
      'The ingredient alone, such as "onion". Reuse a name from list_ingredient_names when one fits, so that shopping lists combine the same ingredient.',
    ),
  note: OptionalText.describe('Preparation or other detail, such as "finely chopped".'),
});
export type IngredientInput = z.infer<typeof IngredientInput>;

export const IngredientGroupInput = z.object({
  name: OptionalText.describe(groupNameInfo),
  ingredients: z.array(IngredientInput),
});

export const StepGroupInput = z.object({
  name: OptionalText.describe(groupNameInfo),
  steps: z
    .array(z.string().trim().min(1))
    .describe(
      'One step per item, as plain text. The recipe page numbers the steps across all groups, so leave the numbers out.',
    ),
});

/** The content of a recipe. Revisions store their snapshots in this format. */
export const RecipeInput = z.object({
  title: z.string().trim().min(1),
  description: OptionalText.describe(
    'A short introduction to the dish, shown under the title. Plain text.',
  ),
  servings: OptionalText.describe(
    'Free text, such as "4 servings" or "1 baking tray (24 pieces)".',
  ),
  activeMinutes: Minutes.describe(activeMinutesInfo),
  totalMinutes: Minutes.describe(totalMinutesInfo),
  source: OptionalText.describe(
    'Where the recipe comes from: a web page URL, which the recipe page shows as a link, or free text such as the name of a book.',
  ),
  tags: z
    .array(z.string().trim().min(1))
    .default([])
    .describe('Reuse names from list_tags when they fit. New tags are created as needed.'),
  ingredientGroups: z.array(IngredientGroupInput).default([]),
  stepGroups: z.array(StepGroupInput).default([]),
});
export type RecipeInput = z.input<typeof RecipeInput>;
export type RecipeContent = z.output<typeof RecipeInput>;

/** The body of a request that creates or updates a recipe. */
export const SaveRecipeRequest = z.object({
  recipe: RecipeInput,
  revisionNote: OptionalText.describe('What changed, shown in the revision history.'),
});
export type SaveRecipeRequest = z.input<typeof SaveRecipeRequest>;

export const Note = z.object({
  id: z.uuid(),
  authorName: z.string().describe('Display name of the user who wrote the note.'),
  text: z.string(),
  createdAt: z.iso.datetime(),
});
export type Note = z.infer<typeof Note>;

export const NoteInput = z.object({ text: z.string().trim().min(1) });
export type NoteInput = z.infer<typeof NoteInput>;

const Ingredient = z.object({
  amount: z.string().nullable(),
  name: z.string(),
  note: z.string().nullable(),
});

const IngredientGroup = z.object({
  name: z.string().nullable(),
  ingredients: z.array(Ingredient),
});

const StepGroup = z.object({
  name: z.string().nullable(),
  steps: z.array(z.string()),
});

export const Recipe = z.object({
  id: z.uuid(),
  title: z.string(),
  description: z.string().nullable(),
  servings: z.string().nullable(),
  activeMinutes: z.int().nullable().describe(activeMinutesInfo),
  totalMinutes: z.int().nullable().describe(totalMinutesInfo),
  source: z.string().nullable(),
  tags: z.array(z.string()),
  ingredientGroups: z.array(IngredientGroup),
  stepGroups: z.array(StepGroup),
  photoUrl: z.string().nullable().describe(photoUrlInfo),
  notes: z.array(Note).describe('Newest first.'),
});
export type Recipe = z.infer<typeof Recipe>;

export const RecipeSummary = Recipe.pick({
  id: true,
  title: true,
  activeMinutes: true,
  totalMinutes: true,
  photoUrl: true,
  tags: true,
});
export type RecipeSummary = z.infer<typeof RecipeSummary>;

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

export const RecipeList = z.object({
  recipes: z.array(RecipeSummary),
  total: z.int().describe('Number of matching recipes on all pages.'),
  page: z.int(),
  pageSize: z.int(),
});
export type RecipeList = z.infer<typeof RecipeList>;

export const TagCount = z.object({
  name: z.string(),
  count: z.int().describe('Number of recipes with the tag.'),
});
export type TagCount = z.infer<typeof TagCount>;

export const IngredientNameCount = z.object({
  name: z.string(),
  count: z.int().describe('Number of recipes that use the ingredient.'),
});
export type IngredientNameCount = z.infer<typeof IngredientNameCount>;

/** The ingredients of a recipe, for building a shopping list. */
export const RecipeIngredients = Recipe.pick({
  id: true,
  title: true,
  servings: true,
  ingredientGroups: true,
});
export type RecipeIngredients = z.infer<typeof RecipeIngredients>;
