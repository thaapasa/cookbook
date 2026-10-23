// Generates a personal MCP token for a user and replaces the old one.
// Usage: npm run mcp-token -- <username> [--sql]
// --sql prints an SQL statement for manual use instead of writing to the database.
import { parseArgs } from 'node:util';

import { newUserToken } from './auth/tokens.ts';
import { sqlBytes, sqlString } from './sql-literal.ts';

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { sql: { type: 'boolean', default: false } },
});
const [username] = positionals;
if (!username || positionals.length > 1) {
  console.error('Usage: npm run mcp-token -- <username> [--sql]');
  process.exit(1);
}

const { token, hash, lastChars } = newUserToken('mcp');

if (values.sql) {
  console.log(
    `INSERT INTO user_tokens (user_id, kind, token_hash, last_chars)\n` +
      `SELECT id, 'mcp', ${sqlBytes(hash)}, ${sqlString(lastChars)} FROM users WHERE username = ${sqlString(username)}\n` +
      `ON CONFLICT (user_id, kind) DO UPDATE\n` +
      `SET token_hash = excluded.token_hash, last_chars = excluded.last_chars, created_at = now();`,
  );
} else {
  // Imported here, so that --sql works without DATABASE_URL.
  const { sql } = await import('./db.ts');
  const updated = await sql`
    INSERT INTO user_tokens (user_id, kind, token_hash, last_chars)
    SELECT id, 'mcp', ${hash}, ${lastChars} FROM users WHERE username = ${username}
    ON CONFLICT (user_id, kind) DO UPDATE
    SET token_hash = excluded.token_hash, last_chars = excluded.last_chars, created_at = now()
  `;
  await sql.end();
  if (!updated.count) {
    console.error(`No user ${username}`);
    process.exit(1);
  }
}
console.error(`MCP token for ${username}, shown only once:\n${token}`);
