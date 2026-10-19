import { type CallToolResult, McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod';

import type { User } from '../../shared/auth.ts';
import {
  IngredientNameCount,
  Note,
  NoteInput,
  Recipe,
  RecipeIngredients,
  RecipeList,
  SaveRecipeRequest,
  TagCount,
} from '../../shared/recipe.ts';
import {
  AddEntryInput,
  IsoDate,
  maxPlanDays,
  UpdateEntryInput,
  WeekPlanEntry,
  WeekPlanQuery,
} from '../../shared/week-plan.ts';
import { DownloadError, downloadImage } from '../image-download.ts';
import { deleteRecipeWithPhoto, replacePhoto } from '../recipes/photos.ts';
import {
  addNote,
  type Author,
  createRecipe,
  getIngredients,
  getRecipe,
  listIngredientNames,
  listRecipes,
  listTags,
  updateRecipe,
} from '../recipes/repository.ts';
import { addEntry, listEntries, removeEntry, updateEntry } from '../week-plan/repository.ts';

const recipeId = z.uuid().describe('Recipe id from search_recipes.');
const entryId = z.uuid().describe('Week plan entry id from get_week_plan.');

const IdResult = z.object({ id: z.uuid() });

function result(data: Record<string, unknown>): CallToolResult {
  return { content: [{ type: 'text', text: JSON.stringify(data) }], structuredContent: data };
}

function error(text: string): CallToolResult {
  return { content: [{ type: 'text', text }], isError: true };
}

/** Creates an MCP server whose tools act as the given user. */
export function createMcpServer(user: User): McpServer {
  const author: Author = { userId: user.id, source: 'mcp' };
  const server = new McpServer({ name: 'cookbook', version: '1.0.0' });

  server.registerTool(
    'search_recipes',
    {
      title: 'Search recipes',
      description:
        'Finds recipes by words and tags. Words match the title, tags, ingredients, description and steps, including parts of words and Finnish inflected forms. Without a query, lists all recipes in alphabetical order. With a query, title matches come first. Returns one page of 12 summaries. Use this to find recipe ids for the other tools. Summaries do not include ingredients or steps: use get_recipe for one recipe or get_ingredients for several.',
      inputSchema: z.object({
        query: z.string().optional(),
        tags: z.array(z.string()).optional().describe('Only recipes that have all these tags.'),
        page: z.int().min(1).optional(),
      }),
      outputSchema: RecipeList,
      annotations: { readOnlyHint: true },
    },
    async ({ query, tags, page }) =>
      result(await listRecipes({ q: query, tags: tags ?? [], page: page ?? 1 })),
  );

  server.registerTool(
    'get_recipe',
    {
      title: 'Get recipe',
      description:
        'Returns the full content of one recipe by id, with its photo and notes. Use this to show or cook a recipe, and always before update_recipe. For only the ingredients of several recipes, use get_ingredients.',
      inputSchema: z.object({ id: recipeId }),
      outputSchema: Recipe,
      annotations: { readOnlyHint: true },
    },
    async ({ id }) => {
      const recipe = await getRecipe(id);
      return recipe ? result(recipe) : error(`No recipe ${id}`);
    },
  );

  server.registerTool(
    'create_recipe',
    {
      title: 'Create recipe',
      description:
        'Creates a new recipe, for example when importing one from a web page, photo or text. Call list_ingredient_names and list_tags first to reuse existing names. Do NOT use to change an existing recipe: use update_recipe.',
      inputSchema: SaveRecipeRequest,
      outputSchema: IdResult,
    },
    async ({ recipe, revisionNote }) =>
      result({ id: await createRecipe(recipe, author, revisionNote) }),
  );

  server.registerTool(
    'update_recipe',
    {
      title: 'Update recipe',
      description:
        'Replaces the full content of an existing recipe by id and records a revision. Fields that are left out or null are cleared, so read the recipe with get_recipe first and send back all of its content with the changes. Does not change the photo or the notes: use set_recipe_photo and add_note for those.',
      inputSchema: z.object({ id: recipeId, ...SaveRecipeRequest.shape }),
      outputSchema: IdResult,
    },
    async ({ id, recipe, revisionNote }) =>
      (await updateRecipe(id, recipe, author, revisionNote))
        ? result({ id })
        : error(`No recipe ${id}`),
  );

  server.registerTool(
    'delete_recipe',
    {
      title: 'Delete recipe',
      description:
        'Deletes a recipe permanently by id, with its photo, notes and revision history. It cannot be restored. Use only when the user explicitly asks to delete the recipe.',
      inputSchema: z.object({ id: recipeId }),
      outputSchema: IdResult,
      annotations: { destructiveHint: true },
    },
    async ({ id }) =>
      (await deleteRecipeWithPhoto(id)) ? result({ id }) : error(`No recipe ${id}`),
  );

  server.registerTool(
    'set_recipe_photo',
    {
      title: 'Set recipe photo',
      description:
        'Sets the photo of a recipe by id and replaces the old one. The image can be up to about 25 MB. Supported formats are JPEG, PNG, WebP, GIF, AVIF and TIFF, and the server detects the format from the data. HEIC is not supported, so convert iPhone photos to JPEG first. The server shrinks the image to fit 1600 × 1600 pixels and stores it as WebP. For an image with a public URL, use set_recipe_photo_from_url instead.',
      inputSchema: z.object({
        id: recipeId,
        data: z
          .string()
          .transform((s) => s.replace(/^data:[^,]*;base64,/, ''))
          .pipe(z.base64())
          .describe('The image file as base64, or as a base64 data URL.'),
      }),
      outputSchema: IdResult,
    },
    async ({ id, data }) => {
      const saved = await replacePhoto(id, Buffer.from(data, 'base64'));
      if (saved === 'not-found') return error(`No recipe ${id}`);
      if (saved === 'not-an-image') return error('The data is not an image');
      return result({ id });
    },
  );

  server.registerTool(
    'set_recipe_photo_from_url',
    {
      title: 'Set recipe photo from URL',
      description:
        'Sets the photo of a recipe by id from a public image URL, and replaces the old one. The server downloads the image. When importing a recipe from a web page, the og:image meta tag or the main <img> of the page usually holds the photo URL. The image can be up to 25 MB, and the formats are the same as in set_recipe_photo. Use set_recipe_photo instead for an image that has no public URL.',
      inputSchema: z.object({
        id: recipeId,
        url: z
          .url({ protocol: /^https?$/ })
          .describe('URL of the image file itself, not of a web page.'),
      }),
      outputSchema: IdResult,
    },
    async ({ id, url }) => {
      let data: Buffer;
      try {
        data = await downloadImage(url);
      } catch (e) {
        if (e instanceof DownloadError) return error(e.message);
        throw e;
      }
      const saved = await replacePhoto(id, data);
      if (saved === 'not-found') return error(`No recipe ${id}`);
      if (saved === 'not-an-image') return error('The URL does not point to an image');
      return result({ id });
    },
  );

  server.registerTool(
    'add_note',
    {
      title: 'Add note',
      description:
        'Adds a dated note to a recipe by id, such as how it turned out or what to try next time. Notes are signed by the user and shown on the recipe page. They are not part of the recipe content and do not create a revision. Do NOT use to change the recipe itself: use update_recipe.',
      inputSchema: z.object({ id: recipeId, ...NoteInput.shape }),
      outputSchema: Note,
    },
    async ({ id, text }) => {
      const note = await addNote(id, user.id, text);
      return note ? result(note) : error(`No recipe ${id}`);
    },
  );

  server.registerTool(
    'list_tags',
    {
      title: 'List tags',
      description:
        'Lists all tags in use, most used first. Use this to reuse existing tags when creating or updating a recipe, and to find tag names for the tags filter of search_recipes.',
      inputSchema: z.object({}),
      outputSchema: z.object({ tags: z.array(TagCount) }),
      annotations: { readOnlyHint: true },
    },
    async () => result({ tags: await listTags() }),
  );

  server.registerTool(
    'list_ingredient_names',
    {
      title: 'List ingredient names',
      description:
        'Lists the ingredient names in use, in alphabetical order. Use this before create_recipe or update_recipe to reuse an existing name instead of a new variant of it, so that shopping lists combine the same ingredient. Does not return amounts or recipes: use get_ingredients for those.',
      inputSchema: z.object({
        query: z.string().optional().describe('Only names that contain this text, ignoring case.'),
      }),
      outputSchema: z.object({ ingredients: z.array(IngredientNameCount) }),
      annotations: { readOnlyHint: true },
    },
    async ({ query }) => result({ ingredients: await listIngredientNames(query) }),
  );

  server.registerTool(
    'get_ingredients',
    {
      title: 'Get ingredients',
      description:
        'Returns the ingredients of several recipes by id in one call, for example to build a shopping list for planned dishes. Does not include steps or other content: use get_recipe for one full recipe.',
      inputSchema: z.object({
        ids: z
          .array(z.uuid())
          .min(1)
          .max(50)
          .describe('Recipe ids from search_recipes or get_week_plan.'),
      }),
      outputSchema: z.object({
        recipes: z.array(RecipeIngredients).describe('In the order of the ids.'),
        missing: z.array(z.uuid()).describe('The ids that match no recipe.'),
      }),
      annotations: { readOnlyHint: true },
    },
    async ({ ids }) => {
      const recipes = await getIngredients(ids);
      const found = new Set(recipes.map((r) => r.id));
      return result({ recipes, missing: ids.filter((id) => !found.has(id)) });
    },
  );

  server.registerTool(
    'get_week_plan',
    {
      title: 'Get week plan',
      description: `Returns the week plan entries from one date to another, both included, up to ${maxPlanDays} days. The household shares one plan. A week starts on Saturday, the grocery delivery day. Dates without entries are left out. To build a shopping list, pass the recipe ids to get_ingredients.`,
      inputSchema: z.object({ from: IsoDate, to: IsoDate }),
      outputSchema: z.object({ entries: z.array(WeekPlanEntry) }),
      annotations: { readOnlyHint: true },
    },
    async (range) => {
      const parsed = WeekPlanQuery.safeParse(range);
      if (!parsed.success) return error(`The range must be 1–${maxPlanDays} days`);
      return result({ entries: await listEntries(parsed.data.from, parsed.data.to) });
    },
  );

  server.registerTool(
    'add_week_plan_entry',
    {
      title: 'Add week plan entry',
      description:
        'Adds a meal to the week plan on a date, as free text or linked to a recipe. Returns the new entry.',
      inputSchema: AddEntryInput,
      outputSchema: WeekPlanEntry,
    },
    async (input) => {
      const entry = await addEntry(input, author);
      return entry === 'recipe-not-found' ? error(`No recipe ${input.recipeId}`) : result(entry);
    },
  );

  server.registerTool(
    'update_week_plan_entry',
    {
      title: 'Update week plan entry',
      description:
        'Changes a week plan entry by id. Fields that are left out keep their values. Give a date to move the entry to another date, and a position to reorder it within its date. Returns the changed entry.',
      inputSchema: z.object({ id: entryId, ...UpdateEntryInput.shape }),
      outputSchema: WeekPlanEntry,
    },
    async ({ id, ...update }) => {
      const entry = await updateEntry(id, update, author);
      if (entry === 'not-found') return error(`No week plan entry ${id}`);
      if (entry === 'recipe-not-found') return error(`No recipe ${update.recipeId}`);
      return result(entry);
    },
  );

  server.registerTool(
    'remove_week_plan_entry',
    {
      title: 'Remove week plan entry',
      description:
        'Removes an entry from the week plan by id. The change history keeps a copy of it.',
      inputSchema: z.object({ id: entryId }),
      outputSchema: IdResult,
      annotations: { destructiveHint: true },
    },
    async ({ id }) =>
      (await removeEntry(id, author)) ? result({ id }) : error(`No week plan entry ${id}`),
  );

  return server;
}
