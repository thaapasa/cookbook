import { describe, expect, it } from 'vitest';

import { generatePassword, hashPassword, verifyPassword } from './password.ts';

describe('password hashing', () => {
  it('verifies the right password and rejects a wrong one', async () => {
    const phc = await hashPassword('kanelipulla');
    expect(phc).toMatch(/^\$argon2id\$v=19\$m=65536,t=3,p=4\$[\w-]+\$[\w-]+$/);
    expect(await verifyPassword('kanelipulla', phc)).toBe(true);
    expect(await verifyPassword('kanelipullaa', phc)).toBe(false);
  });

  it('uses a new salt for each hash', async () => {
    expect(await hashPassword('same')).not.toBe(await hashPassword('same'));
  });

  it('rejects a malformed or unsupported hash', async () => {
    const phc = await hashPassword('x');
    expect(await verifyPassword('x', phc.replace('argon2id', 'argon2i'))).toBe(false);
    expect(await verifyPassword('x', phc.replace('v=19', 'v=16'))).toBe(false);
    expect(await verifyPassword('x', 'not a hash')).toBe(false);
  });
});

describe('generatePassword', () => {
  it('returns 20 letters and digits', () => {
    expect(generatePassword()).toMatch(/^[A-Za-z0-9]{20}$/);
  });

  it('returns a different password each time', () => {
    expect(generatePassword()).not.toBe(generatePassword());
  });
});
