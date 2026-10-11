import { createHash, randomBytes } from 'node:crypto';

import type { User } from '../../shared/auth.ts';
import { sql } from '../db.ts';

const sessionDays = 90;
// Extend the session at most once a day, not on every request.
const extendAfterMs = 24 * 60 * 60 * 1000;

function hashToken(token: string): Buffer {
  return createHash('sha256').update(token).digest();
}

/** Creates a session and returns the token for the cookie. */
export async function createSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString('base64url');
  await sql`DELETE FROM sessions WHERE expires_at < now()`;
  await sql`
    INSERT INTO sessions (token_hash, user_id, expires_at)
    VALUES (${hashToken(token)}, ${userId}, now() + make_interval(days => ${sessionDays}))
  `;
  return token;
}

/** Returns the user of a valid session, and extends the session. */
export async function getSessionUser(token: string): Promise<User | null> {
  const tokenHash = hashToken(token);
  const [row] = await sql<(User & { expiresAt: Date })[]>`
    SELECT u.id, u.username, u.display_name, s.expires_at
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ${tokenHash} AND s.expires_at > now()
  `;
  if (!row) return null;

  const fullExpiry = Date.now() + sessionDays * 24 * 60 * 60 * 1000;
  if (fullExpiry - row.expiresAt.getTime() > extendAfterMs) {
    await sql`
      UPDATE sessions SET expires_at = now() + make_interval(days => ${sessionDays})
      WHERE token_hash = ${tokenHash}
    `;
  }
  return { id: row.id, username: row.username, displayName: row.displayName };
}

export async function deleteSession(token: string): Promise<void> {
  await sql`DELETE FROM sessions WHERE token_hash = ${hashToken(token)}`;
}
