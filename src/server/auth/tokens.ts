import { createHash, randomBytes } from 'node:crypto';

/** Returns a new random token. */
export function newToken(): string {
  return randomBytes(32).toString('base64url');
}

/** The database stores this hash instead of the token. */
export function hashToken(token: string): Buffer {
  return createHash('sha256').update(token).digest();
}
