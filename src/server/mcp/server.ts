import { type CallToolResult, McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod';

import type { User } from '../../shared/auth.ts';
import { SaveRecipeRequest } from '../../shared/recipe.ts';
import { type Author, createRecipe, getRecipe, listRecipes } from '../recipes/repository.ts';

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

  return server;
}
