import { beforeEach, describe, expect, it } from 'vitest';

import { createSession, getSessionUser } from '../auth/sessions.ts';
import { generateToken, getTokenUser } from '../auth/user-tokens.ts';
import { sql } from '../db.ts';
import { createUser, resetDatabase } from '../test/db.ts';
import { checkPassword, getProfile, resetPassword, setDisplayName } from './repository.ts';

let userId: string;

beforeEach(async () => {
  await resetDatabase();
  userId = await createUser('cook');
});

describe('getProfile', () => {
  it('returns the user without tokens', async () => {
    const profile = await getProfile(userId);
    expect(profile).toMatchObject({
      username: 'cook',
      displayName: 'cook display',
      tokens: { mcp: null, integration: null },
    });
    expect(Date.parse(profile!.createdAt)).toBeGreaterThan(Date.now() - 60_000);
  });

  it('returns the last characters and date of each token', async () => {
    const token = await generateToken(userId, 'integration');
    const profile = await getProfile(userId);
    expect(profile!.tokens.mcp).toBeNull();
    expect(profile!.tokens.integration).toMatchObject({ lastChars: token.slice(-4) });
  });

  it('returns null for an unknown user', async () => {
    expect(await getProfile('00000000-0000-7000-8000-000000000000')).toBeNull();
  });
});

describe('setDisplayName', () => {
  it('changes the name', async () => {
    expect(await setDisplayName(userId, 'Kokki')).toEqual({
      id: userId,
      username: 'cook',
      displayName: 'Kokki',
    });
    expect((await getProfile(userId))!.displayName).toBe('Kokki');
  });
});

describe('checkPassword', () => {
  it('accepts only the right password', async () => {
    expect(await checkPassword(userId, 'secret')).toBe(true);
    expect(await checkPassword(userId, 'wrong')).toBe(false);
  });
});

describe('resetPassword', () => {
  it('replaces the password and records when', async () => {
    await sql`UPDATE users SET password_changed_at = now() - interval '10 days'`;
    const password = await resetPassword(userId, await createSession(userId));

    expect(await checkPassword(userId, password)).toBe(true);
    expect(await checkPassword(userId, 'secret')).toBe(false);
    const { passwordChangedAt } = (await getProfile(userId))!;
    expect(Date.parse(passwordChangedAt)).toBeGreaterThan(Date.now() - 60_000);
  });

  it('ends the other sessions of the user and keeps the current one', async () => {
    const current = await createSession(userId);
    const other = await createSession(userId);
    const otherUser = await createSession(await createUser('baker'));

    await resetPassword(userId, current);
    expect(await getSessionUser(current)).toMatchObject({ id: userId });
    expect(await getSessionUser(other)).toBeNull();
    expect(await getSessionUser(otherUser)).toMatchObject({ username: 'baker' });
  });
});

describe('generateToken', () => {
  it('replaces the old token of the kind', async () => {
    const old = await generateToken(userId, 'mcp');
    const token = await generateToken(userId, 'mcp');

    expect(await getTokenUser('mcp', old)).toBeNull();
    expect(await getTokenUser('mcp', token)).toMatchObject({ id: userId });
    expect((await getProfile(userId))!.tokens.mcp!.lastChars).toBe(token.slice(-4));
  });

  it('keeps the tokens of other kinds', async () => {
    const mcp = await generateToken(userId, 'mcp');
    await generateToken(userId, 'integration');
    expect(await getTokenUser('mcp', mcp)).toMatchObject({ id: userId });
  });

  it('accepts a token only as its own kind', async () => {
    const token = await generateToken(userId, 'integration');
    expect(await getTokenUser('mcp', token)).toBeNull();
    expect(await getTokenUser('integration', token)).toMatchObject({ id: userId });
  });
});
