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

const recipeId = z.uuid().describe('Recipe id from search_recipes.');

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
        'Finds recipes by words and tags. Words match the title, tags, ingredients, description and steps, including parts of words and Finnish inflected forms. Without a query, lists all recipes in alphabetical order. With a query, title matches come first. Returns one page of 12 summaries (id, title, activeMinutes, totalMinutes, photoUrl, tags) with total, page and pageSize. Use this to find recipe ids for the other tools. Summaries do not include ingredients or steps: use get_recipe for one recipe or get_ingredients for several.',
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
      description:
        'Returns the full content of one recipe by id: title, description, servings, activeMinutes, totalMinutes, source, tags, ingredientGroups (each ingredient has amount, name and note), stepGroups, photoUrl and notes (newest first, with author and date). Use this to show or cook a recipe, and always before update_recipe. Get the id from search_recipes. For only the ingredients of several recipes, use get_ingredients.',
      inputSchema: z.object({ id: recipeId }),
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
        'Creates a new recipe, for example when importing one from a web page, photo or text. Only title is required. Put ingredients in ingredientGroups and steps in stepGroups. Give a group a name, such as "Sauce", when the recipe has several parts, and leave it null when there is only one group. In an ingredient, amount holds the quantity and unit ("2 dl"), name the ingredient and note any extra detail ("finely chopped"). Times are whole minutes. New tags are created as needed. Call list_ingredient_names and list_tags first to reuse existing names. revisionNote is shown in the revision history. Returns the id of the new recipe. Do NOT use to change an existing recipe: use update_recipe.',
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
        'Replaces the full content of an existing recipe by id and records a revision with revisionNote. Takes the same recipe fields as create_recipe. Fields that are left out or null are cleared, so read the recipe with get_recipe first and send back all of its content with the changes. Does not change the photo or the notes: use set_recipe_photo and add_note for those. Returns the recipe id, or an error if no recipe has the id.',
      inputSchema: z.object({ id: recipeId, ...SaveRecipeRequest.shape }),
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
        'Deletes a recipe permanently by id, with its photo, notes and revision history. It cannot be restored. Use only when the user explicitly asks to delete the recipe. Returns the id of the deleted recipe, or an error if no recipe has the id.',
      inputSchema: z.object({ id: recipeId }),
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
        'Sets the photo of a recipe by id and replaces the old one. Takes the image file as base64 or as a base64 data URL, up to about 25 MB. Supported formats are JPEG, PNG, WebP, GIF, AVIF and TIFF, and the server detects the format from the data. HEIC is not supported, so convert iPhone photos to JPEG first. The server shrinks the image to fit 1600 × 1600 pixels and stores it as WebP. Returns the recipe id, or an error if no recipe has the id or the data is not an image.',
      inputSchema: z.object({
        id: recipeId,
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
        'Adds a dated note to a recipe by id, such as how it turned out or what to try next time. Notes are signed by the user and shown on the recipe page. They are not part of the recipe content and do not create a revision. Returns the new note (id, authorName, text, createdAt). Do NOT use to change the recipe itself: use update_recipe.',
      inputSchema: z.object({ id: recipeId, ...NoteInput.shape }),
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
        'Lists all tags in use with the number of recipes for each, most used first. Returns the name and count of each tag. Use this to reuse existing tags when creating or updating a recipe, and to find tag names for the tags filter of search_recipes.',
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
        'Lists the ingredient names in use, in alphabetical order, with the number of recipes for each. The optional query keeps only names that contain the text, ignoring case. Use this before create_recipe or update_recipe to reuse an existing name instead of a new variant of it, so that shopping lists combine the same ingredient. Does not return amounts or recipes: use get_ingredients for those.',
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
        'Returns the ingredients of up to 50 recipes by id in one call, for example to build a shopping list for planned dishes. For each recipe returns id, title, servings and ingredientGroups (each ingredient has amount, name and note), in the order of the ids. missing lists the ids that match no recipe. Does not include steps or other content: use get_recipe for one full recipe.',
      inputSchema: z.object({
        ids: z.array(z.uuid()).min(1).max(50).describe('Recipe ids from search_recipes.'),
      }),
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
