// Creates a user, or updates the display name and password of an existing one.
// Usage: npm run set-user -- <username> <display name> [--sql]
// --sql prints an SQL statement for manual use instead of writing to the database.
import { parseArgs } from 'node:util';

import { hashPassword } from './auth/password.ts';
import { sqlString } from './sql-literal.ts';

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { sql: { type: 'boolean', default: false } },
});
const [username, displayName] = positionals;
if (!username || !displayName || positionals.length > 2) {
  console.error('Usage: npm run set-user -- <username> <display name> [--sql]');
  process.exit(1);
}

const password = await readHidden('Password: ');
if (!password || password !== (await readHidden('Repeat password: '))) {
  console.error('Passwords are empty or do not match');
  process.exit(1);
}

const passwordHash = await hashPassword(password);

if (values.sql) {
  console.log(
    `INSERT INTO users (username, display_name, password_hash)\n` +
      `VALUES (${sqlString(username)}, ${sqlString(displayName)}, ${sqlString(passwordHash)})\n` +
      `ON CONFLICT (username) DO UPDATE\n` +
      `SET display_name = excluded.display_name, password_hash = excluded.password_hash,\n` +
      `    password_changed_at = now();`,
  );
} else {
  // Imported here, so that --sql works without DATABASE_URL.
  const { sql } = await import('./db.ts');
  await sql`
    INSERT INTO users (username, display_name, password_hash)
    VALUES (${username}, ${displayName}, ${passwordHash})
    ON CONFLICT (username) DO UPDATE
    SET display_name = excluded.display_name, password_hash = excluded.password_hash,
        password_changed_at = now()
  `;
  console.log(`Saved user ${username}`);
  await sql.end();
}

/** Reads a line from the terminal without echoing it. */
function readHidden(prompt: string): Promise<string> {
  const { stdin, stdout } = process;
  stdout.write(prompt);
  stdin.setRawMode(true);
  stdin.resume();
  stdin.setEncoding('utf8');
  return new Promise((resolve) => {
    let input = '';
    // A chunk can hold several characters when the password is pasted.
    const onData = (chunk: string) => {
      for (const char of chunk) {
        if (char === '\r' || char === '\n') {
          stdin.setRawMode(false);
          stdin.pause();
          stdin.off('data', onData);
          stdout.write('\n');
          resolve(input);
          return;
        } else if (char === '\u0003') {
          process.exit(130);
        } else if (char === '\u007f') {
          input = input.slice(0, -1);
        } else {
          input += char;
        }
      }
    };
    stdin.on('data', onData);
  });
}
