import { type CallToolResult, McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod';

import type { User } from '../../shared/auth.ts';
import { NoteInput, SaveRecipeRequest } from '../../shared/recipe.ts';
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
        'Lists recipes in alphabetical order, or the matches of a search with the best matches first. Returns one page of summaries.',
      inputSchema: z.object({
        query: z.string().optional().describe('Words to search for in titles and content.'),
        tags: z.array(z.string()).optional().describe('Only recipes that have all these tags.'),
        page: z.int().min(1).optional().describe('Page number, starting from 1.'),
      }),
      annotations: { readOnlyHint: true },
    },
    async ({ query, tags, page }) =>
      result(await listRecipes({ q: query, tags: tags ?? [], page: page ?? 1 })),
  );

  server.registerTool(
    'get_recipe',
    {
      title: 'Get recipe',
      description: 'Returns the full content of a recipe.',
      inputSchema: z.object({ id: z.uuid() }),
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
      description: 'Creates a recipe and returns its id.',
      inputSchema: SaveRecipeRequest,
    },
    async ({ recipe, revisionNote }) =>
      result({ id: await createRecipe(recipe, author, revisionNote) }),
  );

  server.registerTool(
    'update_recipe',
    {
      title: 'Update recipe',
      description:
        'Replaces the full content of a recipe. Read the recipe with get_recipe first and send back all of its content with the changes. Fields that are left out are cleared.',
      inputSchema: z.object({ id: z.uuid(), ...SaveRecipeRequest.shape }),
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
        'Deletes a recipe permanently, with its photo, notes and revision history. It cannot be restored.',
      inputSchema: z.object({ id: z.uuid() }),
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
        'Sets the photo of a recipe and replaces the old one. The server detects the format from the data and resizes the image. Supported formats are JPEG, PNG, WebP, GIF, AVIF and TIFF. HEIC is not supported, so convert iPhone photos to JPEG first.',
      inputSchema: z.object({
        id: z.uuid(),
        data: z
          .string()
          .transform((s) => s.replace(/^data:[^,]*;base64,/, ''))
          .pipe(z.base64())
          .describe('The image file as base64, or as a base64 data URL.'),
      }),
    },
    async ({ id, data }) => {
      const saved = await replacePhoto(id, Buffer.from(data, 'base64'));
      if (saved === 'not-found') return error(`No recipe ${id}`);
      if (saved === 'not-an-image') return error('The data is not an image');
      return result({ id });
    },
  );

  server.registerTool(
    'add_note',
    {
      title: 'Add note',
      description:
        'Adds a dated note to a recipe, such as how it turned out. Notes are not part of the recipe content.',
      inputSchema: z.object({ id: z.uuid(), ...NoteInput.shape }),
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
      description: 'Lists the tags in use, with the number of recipes for each.',
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true },
    },
    async () => result({ tags: await listTags() }),
  );

  server.registerTool(
    'list_ingredient_names',
    {
      title: 'List ingredient names',
      description:
        'Lists the ingredient names in use, with the number of recipes for each. Use the existing names to keep them consistent across recipes.',
      inputSchema: z.object({
        query: z.string().optional().describe('Only names that contain this text.'),
      }),
      annotations: { readOnlyHint: true },
    },
    async ({ query }) => result({ ingredients: await listIngredientNames(query) }),
  );

  server.registerTool(
    'get_ingredients',
    {
      title: 'Get ingredients',
      description:
        'Returns the ingredients and servings of several recipes, for example to build a shopping list.',
      inputSchema: z.object({ ids: z.array(z.uuid()).min(1).max(50) }),
      annotations: { readOnlyHint: true },
    },
    async ({ ids }) => {
      const recipes = await getIngredients(ids);
      const found = new Set(recipes.map((r) => r.id));
      return result({ recipes, missing: ids.filter((id) => !found.has(id)) });
    },
  );

  return server;
}
