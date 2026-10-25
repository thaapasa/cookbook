// Fills the database with test recipes for development.
// Usage: npm run seed [-- --reset]
// Also creates the user `demo` with the password `demo`, and gives it the
// integration token `ckb_int_local_dev_token`.
// --reset deletes all existing recipes and tags first.
import { RecipeInput } from '../shared/recipe.ts';
import { hashPassword } from './auth/password.ts';
import { hashToken } from './auth/tokens.ts';
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

// The same fixed token that scripts/copy-prod-db.sh sets, so that other services
// in local dev can call the integration API. Token hashes are unique, so the
// token is first taken from any other user who has it.
const devToken = 'ckb_int_local_dev_token';
await sql`DELETE FROM user_tokens WHERE token_hash = ${hashToken(devToken)}`;
await sql`
  INSERT INTO user_tokens (user_id, kind, token_hash, last_chars)
  VALUES (${demo.id}, 'integration', ${hashToken(devToken)}, ${devToken.slice(-4)})
  ON CONFLICT (user_id, kind) DO UPDATE
  SET token_hash = excluded.token_hash, last_chars = excluded.last_chars, created_at = now()
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
