import type { User } from '../../shared/auth.ts';
import { type Profile, TokenKind } from '../../shared/profile.ts';
import { generatePassword, hashPassword, verifyPassword } from '../auth/password.ts';
import { hashToken } from '../auth/tokens.ts';
import { sql } from '../db.ts';

export async function getProfile(userId: string): Promise<Profile | null> {
  const [user] = await sql<
    { username: string; displayName: string; createdAt: Date; passwordChangedAt: Date }[]
  >`
    SELECT username, display_name, created_at, password_changed_at FROM users WHERE id = ${userId}
  `;
  if (!user) return null;
  const rows = await sql<{ kind: TokenKind; lastChars: string; createdAt: Date }[]>`
    SELECT kind, last_chars, created_at FROM user_tokens WHERE user_id = ${userId}
  `;
  const tokens = Object.fromEntries(
    TokenKind.options.map((kind) => [kind, null]),
  ) as Profile['tokens'];
  for (const row of rows) {
    tokens[row.kind] = { lastChars: row.lastChars, createdAt: row.createdAt.toISOString() };
  }
  return {
    username: user.username,
    displayName: user.displayName,
    createdAt: user.createdAt.toISOString(),
    passwordChangedAt: user.passwordChangedAt.toISOString(),
    tokens,
  };
}

/** Sets the display name and returns the updated user. */
export async function setDisplayName(userId: string, displayName: string): Promise<User | null> {
  const [user] = await sql<User[]>`
    UPDATE users SET display_name = ${displayName} WHERE id = ${userId}
    RETURNING id, username, display_name
  `;
  return user ?? null;
}

export async function checkPassword(userId: string, password: string): Promise<boolean> {
  const [row] = await sql<{ passwordHash: string }[]>`
    SELECT password_hash FROM users WHERE id = ${userId}
  `;
  return !!row && (await verifyPassword(password, row.passwordHash));
}

/**
 * Gives the user a new random password and returns it. Ends the user's other
 * sessions, so that a device with the old login must log in again.
 */
export async function resetPassword(userId: string, keepSessionToken: string): Promise<string> {
  const password = generatePassword();
  const passwordHash = await hashPassword(password);
  await sql.begin(async (tx) => {
    await tx`
      UPDATE users SET password_hash = ${passwordHash}, password_changed_at = now()
      WHERE id = ${userId}
    `;
    await tx`
      DELETE FROM sessions
      WHERE user_id = ${userId} AND token_hash <> ${hashToken(keepSessionToken)}
    `;
  });
  return password;
}
