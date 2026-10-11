// Fills the database with test recipes for development.
// Usage: npm run seed [-- --reset]
// Also creates the user `demo` with the password `demo`.
// --reset deletes all existing recipes and tags first.
import { RecipeInput } from '../shared/recipe.ts';
import { hashPassword } from './auth/password.ts';
import { sql } from './db.ts';
import { migrate } from './migrate.ts';
import { createRecipe } from './recipes/repository.ts';
import { seedRecipes } from './seed-data.ts';

if (process.env.NODE_ENV === 'production') {
  console.error('Refusing to seed a production database');
  process.exit(1);
}

await migrate();

const reset = process.argv.includes('--reset');
const [{ count }] = await sql<{ count: string }[]>`SELECT count(*) FROM recipes`;
if (Number(count) > 0 && !reset) {
  console.error(`The database already has ${count} recipes. Use --reset to replace them.`);
  await sql.end();
  process.exit(1);
}
if (reset) {
  await sql`DELETE FROM recipes`;
  await sql`DELETE FROM tags`;
}

const [demo] = await sql<{ id: string }[]>`
  INSERT INTO users (username, display_name, password_hash)
  VALUES ('demo', 'Demo', ${await hashPassword('demo')})
  ON CONFLICT (username) DO UPDATE SET username = excluded.username
  RETURNING id
`;

for (const [index, { notes = [], ...recipe }] of seedRecipes.entries()) {
  const id = await createRecipe(RecipeInput.parse(recipe), {
    userId: demo.id,
    source: index % 2 ? 'app' : 'mcp',
  });
  for (const note of notes) {
    await sql`
      INSERT INTO notes (recipe_id, user_id, text, created_at, updated_at)
      VALUES (${id}, ${demo.id}, ${note.text},
              now() - make_interval(days => ${note.daysAgo}),
              now() - make_interval(days => ${note.daysAgo}))
    `;
  }
}

console.log(`Added ${seedRecipes.length} recipes`);
await sql.end();
