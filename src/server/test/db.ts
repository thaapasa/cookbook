import { RecipeInput } from '../../shared/recipe.ts';
import { hashPassword } from '../auth/password.ts';
import { generateToken } from '../auth/user-tokens.ts';
import { sql } from '../db.ts';
import { type Author, createRecipe } from '../recipes/repository.ts';

/** Empties every table except `migrations`. Refuses to run outside a test database. */
export async function resetDatabase(): Promise<void> {
  const [{ name }] = await sql<{ name: string }[]>`SELECT current_database() AS name`;
  if (!name.endsWith('_test')) {
    throw new Error(`Refusing to empty database ${name}`);
  }
  const tables = await sql<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> 'migrations'
  `;
  if (!tables.length) return;
  await sql`TRUNCATE ${sql(tables.map((t) => t.tablename))} CASCADE`;
}

/** Adds a user and returns its id. */
export async function createUser(username: string, password = 'secret'): Promise<string> {
  const [row] = await sql<{ id: string }[]>`
    INSERT INTO users (username, display_name, password_hash)
    VALUES (${username}, ${`${username} display`}, ${await hashPassword(password)})
    RETURNING id
  `;
  return row.id;
}

/** Gives a user a new MCP token and returns the token. */
export function setMcpToken(userId: string): Promise<string> {
  return generateToken(userId, 'mcp');
}

/** Adds a recipe with the given content and returns its id. */
export function addRecipe(author: Author, input: RecipeInput): Promise<string> {
  return createRecipe(RecipeInput.parse(input), author);
}
