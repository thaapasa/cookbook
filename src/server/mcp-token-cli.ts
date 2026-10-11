// Generates a personal MCP token for a user and replaces the old one.
// Usage: npm run mcp-token -- <username> [--sql]
// --sql prints an SQL statement for manual use instead of writing to the database.
import { parseArgs } from 'node:util';

import { hashToken, newToken } from './auth/tokens.ts';
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

const token = newToken();
const tokenHash = hashToken(token);

if (values.sql) {
  console.log(
    `UPDATE users SET mcp_token_hash = ${sqlBytes(tokenHash)} WHERE username = ${sqlString(username)};`,
  );
} else {
  // Imported here, so that --sql works without DATABASE_URL.
  const { sql } = await import('./db.ts');
  const updated =
    await sql`UPDATE users SET mcp_token_hash = ${tokenHash} WHERE username = ${username}`;
  await sql.end();
  if (!updated.count) {
    console.error(`No user ${username}`);
    process.exit(1);
  }
}
console.error(`MCP token for ${username}, shown only once:\n${token}`);
