import {
  type CallToolResult,
  McpServer,
  type StandardSchemaWithJSON,
  type ToolAnnotations,
  type ToolCallback,
} from '@modelcontextprotocol/server';
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

const entryId = z.uuid().describe('Week plan entry id from get_week_plan.');

const IdResult = z.object({ id: z.uuid() });

type JsonSchemaOptions = Parameters<StandardSchemaWithJSON['~standard']['jsonSchema']['input']>[0];

/** Removes the JSON Schema keywords that Zod adds but that tell the reader nothing new. */
function leanJsonSchema({ jsonSchema }: { jsonSchema: Record<string, unknown> }) {
  if (jsonSchema.format) delete jsonSchema.pattern;
  if (jsonSchema.minimum === Number.MIN_SAFE_INTEGER) delete jsonSchema.minimum;
  if (jsonSchema.maximum === Number.MAX_SAFE_INTEGER) delete jsonSchema.maximum;
}

/** Wraps a schema so that its JSON Schema leaves out format patterns and safe integer bounds. */
function lean<T extends StandardSchemaWithJSON>(schema: T): T {
  const std = schema['~standard'];
  const options = (o: JsonSchemaOptions) => ({
    ...o,
    libraryOptions: { override: leanJsonSchema },
  });
  return {
    '~standard': {
      ...std,
      jsonSchema: {
        input: (o: JsonSchemaOptions) => std.jsonSchema.input(options(o)),
        output: (o: JsonSchemaOptions) => std.jsonSchema.output(options(o)),
      },
    },
  } as T;
}

type ToolConfig<Input, Output> = {
  title: string;
  description: string;
  inputSchema: Input;
  outputSchema: Output;
  annotations?: ToolAnnotations;
};

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

  function register<Input extends StandardSchemaWithJSON, Output extends StandardSchemaWithJSON>(
    name: string,
    config: ToolConfig<Input, Output>,
    cb: ToolCallback<Input>,
  ) {
    const schemas = {
      inputSchema: lean(config.inputSchema),
      outputSchema: lean(config.outputSchema),
    };
    server.registerTool(name, { ...config, ...schemas }, cb);
  }

  register(
    'search_recipes',
    {
      title: 'Search recipes',
      description:
        'Finds recipes by words and tags. Words match the title, tags, ingredients, description and steps, including parts of words and Finnish inflected forms. Without a query, lists all recipes in alphabetical order. With a query, title matches come first. Returns one page of 12 summaries. Use this to find recipe ids for the other tools. Summaries do not include ingredients or steps: use get_recipe for one recipe or get_ingredients for several.',
      inputSchema: z.object({
        query: z.string().optional(),
        tags: z
          .array(z.string())
          .optional()
          .describe('Exact tag names from list_tags. Only recipes that have all of them.'),
        page: z.int().min(1).optional(),
      }),
      outputSchema: RecipeList,
      annotations: { readOnlyHint: true },
    },
    async ({ query, tags, page }) =>
      result(await listRecipes({ q: query, tags: tags ?? [], page: page ?? 1 })),
  );

  register(
    'get_recipe',
    {
      title: 'Get recipe',
      description:
        'Returns the full content of one recipe by id, with its photo and notes. Use this to show or cook a recipe, and always before update_recipe. For only the ingredients of several recipes, use get_ingredients.',
      inputSchema: z.object({ id: z.uuid() }),
      outputSchema: Recipe,
      annotations: { readOnlyHint: true },
    },
    async ({ id }) => {
      const recipe = await getRecipe(id);
      return recipe ? result(recipe) : error(`No recipe ${id}`);
    },
  );

  register(
    'create_recipe',
    {
      title: 'Create recipe',
      description:
        'Creates a new recipe, for example when importing one from a web page, photo or text. Call list_ingredient_names and list_tags first to reuse existing names. After importing from a web page, set the photo with set_recipe_photo_from_url. Do NOT use to change an existing recipe: use update_recipe.',
      inputSchema: SaveRecipeRequest,
      outputSchema: IdResult,
      annotations: { destructiveHint: false },
    },
    async ({ recipe, revisionNote }) =>
      result({ id: await createRecipe(recipe, author, revisionNote) }),
  );

  register(
    'update_recipe',
    {
      title: 'Update recipe',
      description:
        'Replaces the full content of an existing recipe by id and records a revision. Fields that are left out or null are cleared, so read the recipe with get_recipe first and send back all of its content with the changes. Does not change the photo or the notes: use set_recipe_photo and add_note for those.',
      inputSchema: z.object({ id: z.uuid(), ...SaveRecipeRequest.shape }),
      outputSchema: IdResult,
      annotations: { idempotentHint: true },
    },
    async ({ id, recipe, revisionNote }) =>
      (await updateRecipe(id, recipe, author, revisionNote))
        ? result({ id })
        : error(`No recipe ${id}`),
  );

  register(
    'delete_recipe',
    {
      title: 'Delete recipe',
      description:
        'Deletes a recipe permanently by id, with its photo, notes and revision history. It cannot be restored. Use only when the user explicitly asks to delete the recipe.',
      inputSchema: z.object({ id: z.uuid() }),
      outputSchema: IdResult,
      annotations: { destructiveHint: true },
    },
    async ({ id }) =>
      (await deleteRecipeWithPhoto(id)) ? result({ id }) : error(`No recipe ${id}`),
  );

  register(
    'set_recipe_photo',
    {
      title: 'Set recipe photo',
      description:
        'Sets the photo of a recipe by id from image data, and replaces the old one. Use this only when you have the bytes of the image file, for example from a code tool. An image that the user pasted into the chat cannot be sent this way: use set_recipe_photo_from_url if the image has a public URL, or ask the user to upload the photo in the recipe editor. The image can be up to about 25 MB. Supported formats are JPEG, PNG, WebP, GIF, AVIF and TIFF, and the server detects the format from the data. HEIC is not supported, so convert iPhone photos to JPEG first. The server shrinks the image to fit 1600 × 1600 pixels and stores it as WebP.',
      inputSchema: z.object({
        id: z.uuid(),
        data: z
          .string()
          .transform((s) => s.replace(/^data:[^,]*;base64,/, ''))
          .pipe(z.base64())
          .describe('The image file as base64, or as a base64 data URL.'),
      }),
      outputSchema: IdResult,
      annotations: { idempotentHint: true },
    },
    async ({ id, data }) => {
      const saved = await replacePhoto(id, Buffer.from(data, 'base64'));
      if (saved === 'not-found') return error(`No recipe ${id}`);
      if (saved === 'not-an-image') return error('The data is not an image');
      return result({ id });
    },
  );

  register(
    'set_recipe_photo_from_url',
    {
      title: 'Set recipe photo from URL',
      description:
        'Sets the photo of a recipe by id from a public image URL, and replaces the old one. The server downloads the image. When importing a recipe from a web page, the og:image meta tag or the main <img> of the page usually holds the photo URL. The image can be up to about 25 MB, and the formats are the same as in set_recipe_photo.',
      inputSchema: z.object({
        id: z.uuid(),
        url: z
          .url({ protocol: /^https?$/ })
          .describe('An http or https URL of the image file itself, not of a web page.'),
      }),
      outputSchema: IdResult,
      annotations: { idempotentHint: true },
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

  register(
    'add_note',
    {
      title: 'Add note',
      description:
        'Adds a dated note to a recipe by id, such as how it turned out or what to try next time. Notes are signed by the user and shown on the recipe page. They are not part of the recipe content and do not create a revision. Do NOT use to change the recipe itself: use update_recipe.',
      inputSchema: z.object({ id: z.uuid(), ...NoteInput.shape }),
      outputSchema: Note,
      annotations: { destructiveHint: false },
    },
    async ({ id, text }) => {
      const note = await addNote(id, user.id, text);
      return note ? result(note) : error(`No recipe ${id}`);
    },
  );

  register(
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

  register(
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

  register(
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

  register(
    'get_week_plan',
    {
      title: 'Get week plan',
      description: `Returns the week plan entries from one date to another, both included, up to ${maxPlanDays} days. The household shares one plan. A week starts on Saturday, the grocery delivery day, so to read one week, pass a Saturday as from and the next Friday as to. Dates without entries are left out. To build a shopping list, pass the recipe ids to get_ingredients.`,
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

  register(
    'add_week_plan_entry',
    {
      title: 'Add week plan entry',
      description: 'Adds a meal to the week plan on a date, as free text or linked to a recipe.',
      inputSchema: AddEntryInput,
      outputSchema: WeekPlanEntry,
      annotations: { destructiveHint: false },
    },
    async (input) => {
      const entry = await addEntry(input, author);
      return entry === 'recipe-not-found' ? error(`No recipe ${input.recipeId}`) : result(entry);
    },
  );

  register(
    'update_week_plan_entry',
    {
      title: 'Update week plan entry',
      description:
        'Changes a week plan entry by id. Fields that are left out keep their values. Give a date to move the entry to another date, and a position to reorder it within its date.',
      inputSchema: z.object({ id: entryId, ...UpdateEntryInput.shape }),
      outputSchema: WeekPlanEntry,
      annotations: { idempotentHint: true },
    },
    async ({ id, ...update }) => {
      const entry = await updateEntry(id, update, author);
      if (entry === 'not-found') return error(`No week plan entry ${id}`);
      if (entry === 'recipe-not-found') return error(`No recipe ${update.recipeId}`);
      return result(entry);
    },
  );

  register(
    'remove_week_plan_entry',
    {
      title: 'Remove week plan entry',
      description: 'Removes an entry from the week plan by id.',
      inputSchema: z.object({ id: entryId }),
      outputSchema: IdResult,
      annotations: { destructiveHint: true },
    },
    async ({ id }) =>
      (await removeEntry(id, author)) ? result({ id }) : error(`No week plan entry ${id}`),
  );

  return server;
}
