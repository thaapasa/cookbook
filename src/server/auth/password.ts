import { argon2, randomBytes, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const argon2Async = promisify(argon2);

// RFC 9106 second recommended option: 64 MiB, 3 passes, 4 lanes.
const params = { memory: 65536, passes: 3, parallelism: 4 };
const tagLength = 32;

/** Hashes a password into a PHC string: `$argon2id$v=19$m=...,t=...,p=...$salt$hash`. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await argon2Async('argon2id', {
    message: password,
    nonce: salt,
    tagLength,
    ...params,
  });
  return [
    '',
    'argon2id',
    'v=19',
    `m=${params.memory},t=${params.passes},p=${params.parallelism}`,
    salt.toString('base64url'),
    hash.toString('base64url'),
  ].join('$');
}

/** Checks a password against a PHC string from `hashPassword`. */
export async function verifyPassword(password: string, phc: string): Promise<boolean> {
  const [, algorithm, version, paramString, salt, hash] = phc.split('$');
  if (algorithm !== 'argon2id' || version !== 'v=19' || !paramString || !salt || !hash) {
    return false;
  }
  const p = Object.fromEntries(paramString.split(',').map((kv) => kv.split('=')));
  const expected = Buffer.from(hash, 'base64url');
  const actual = await argon2Async('argon2id', {
    message: password,
    nonce: Buffer.from(salt, 'base64url'),
    tagLength: expected.length,
    memory: Number(p.m),
    passes: Number(p.t),
    parallelism: Number(p.p),
  });
  return timingSafeEqual(actual, expected);
}
