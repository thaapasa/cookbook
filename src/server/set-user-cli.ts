// Creates a user, or updates the display name and password of an existing one.
// Usage: npm run set-user -- <username> <display name>
import { hashPassword } from './auth/password.ts';
import { sql } from './db.ts';

const [username, displayName] = process.argv.slice(2);
if (!username || !displayName) {
  console.error('Usage: npm run set-user -- <username> <display name>');
  process.exit(1);
}

const password = await readHidden('Password: ');
if (!password || password !== (await readHidden('Repeat password: '))) {
  console.error('Passwords are empty or do not match');
  process.exit(1);
}

await sql`
  INSERT INTO users (username, display_name, password_hash)
  VALUES (${username}, ${displayName}, ${await hashPassword(password)})
  ON CONFLICT (username) DO UPDATE
  SET display_name = excluded.display_name, password_hash = excluded.password_hash
`;
console.log(`Saved user ${username}`);
await sql.end();

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
