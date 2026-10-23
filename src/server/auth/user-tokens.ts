import type { User } from '../../shared/auth.ts';
import type { TokenKind } from '../../shared/profile.ts';
import { sql } from '../db.ts';
import { hashToken, newUserToken } from './tokens.ts';

/** Gives the user a new token of the kind, replacing the old one, and returns it. */
export async function generateToken(userId: string, kind: TokenKind): Promise<string> {
  const { token, hash, lastChars } = newUserToken(kind);
  await sql`
    INSERT INTO user_tokens (user_id, kind, token_hash, last_chars)
    VALUES (${userId}, ${kind}, ${hash}, ${lastChars})
    ON CONFLICT (user_id, kind) DO UPDATE
    SET token_hash = excluded.token_hash, last_chars = excluded.last_chars, created_at = now()
  `;
  return token;
}

/** Returns the user of a token of the kind. */
export async function getTokenUser(kind: TokenKind, token: string): Promise<User | null> {
  const [user] = await sql<User[]>`
    SELECT u.id, u.username, u.display_name
    FROM user_tokens t JOIN users u ON u.id = t.user_id
    WHERE t.kind = ${kind} AND t.token_hash = ${hashToken(token)}
  `;
  return user ?? null;
}
