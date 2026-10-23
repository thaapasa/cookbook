import { describe, expect, it } from 'vitest';

import { hashToken, newUserToken } from './tokens.ts';

describe('newUserToken', () => {
  it('starts with a prefix that tells the kind', () => {
    expect(newUserToken('mcp').token).toMatch(/^ckb_mcp_[\w-]{43}$/);
    expect(newUserToken('integration').token).toMatch(/^ckb_int_[\w-]{43}$/);
  });

  it('returns the hash and the last characters of the token', () => {
    const { token, hash, lastChars } = newUserToken('mcp');
    expect(hash.equals(hashToken(token))).toBe(true);
    expect(token.endsWith(lastChars)).toBe(true);
    expect(lastChars).toHaveLength(4);
  });
});
