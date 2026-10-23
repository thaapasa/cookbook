import { createHash, randomBytes } from 'node:crypto';

import type { TokenKind } from '../../shared/profile.ts';

/** Returns a new random token. */
export function newToken(): string {
  return randomBytes(32).toString('base64url');
}

/** The database stores this hash instead of the token. */
export function hashToken(token: string): Buffer {
  return createHash('sha256').update(token).digest();
}

// The prefix tells the kind of a token, also to a secret scanner.
const tokenPrefixes: Record<TokenKind, string> = { mcp: 'ckb_mcp_', integration: 'ckb_int_' };

/** The page shows this many characters from the end of a token, to tell tokens apart. */
const shownChars = 4;

/** Returns a new personal token of a user, with its hash and last characters. */
export function newUserToken(kind: TokenKind): {
  token: string;
  hash: Buffer;
  lastChars: string;
} {
  const token = tokenPrefixes[kind] + newToken();
  return { token, hash: hashToken(token), lastChars: token.slice(-shownChars) };
}
