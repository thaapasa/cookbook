import type { Context } from 'hono';

const windowMs = 15 * 60 * 1000;
/** The longest time that a client must wait after it has used up its attempts. */
export const loginRetryAfterSeconds = windowMs / 1000;
// A family member who mistypes a few times stays well below these.
const maxPerUsername = 10;
const maxPerIp = 30;
// Expired entries are removed when a map grows past this, so that requests with
// many different usernames or addresses cannot grow the memory without limit.
const pruneAt = 10_000;

type Entry = { count: number; resetAt: number };

/** Counts login attempts per key in a fixed time window. */
class AttemptCounter {
  private readonly entries = new Map<string, Entry>();
  private readonly max: number;

  constructor(max: number) {
    this.max = max;
  }

  /** Counts an attempt. Returns `false` if the key has no attempts left. */
  take(key: string, now: number): boolean {
    let entry = this.entries.get(key);
    if (!entry || entry.resetAt <= now) {
      if (this.entries.size >= pruneAt) this.prune(now);
      entry = { count: 0, resetAt: now + windowMs };
      this.entries.set(key, entry);
    }
    if (entry.count >= this.max) return false;
    entry.count++;
    return true;
  }

  /** Gives back an attempt, for a successful login. */
  giveBack(key: string): void {
    const entry = this.entries.get(key);
    if (entry && entry.count > 0) entry.count--;
  }

  clear(): void {
    this.entries.clear();
  }

  private prune(now: number): void {
    for (const [key, entry] of this.entries) {
      if (entry.resetAt <= now) this.entries.delete(key);
    }
  }
}

const byUsername = new AttemptCounter(maxPerUsername);
const byIp = new AttemptCounter(maxPerIp);

/**
 * Counts a login attempt before the password is checked. Returns `false` if the
 * username or the client address has used up its attempts. The attempt is
 * counted first, so that parallel requests cannot all get through before the
 * first one fails.
 */
export function takeLoginAttempt(c: Context, username: string, now = Date.now()): boolean {
  const ip = clientIp(c);
  const ipOk = byIp.take(ip, now);
  const usernameOk = byUsername.take(username, now);
  return ipOk && usernameOk;
}

/** Gives back the attempt of a successful login. */
export function giveBackLoginAttempt(c: Context, username: string): void {
  byIp.giveBack(clientIp(c));
  byUsername.giveBack(username);
}

/** Forgets all attempts. For tests. */
export function resetLoginAttempts(): void {
  byUsername.clear();
  byIp.clear();
}

/**
 * The address of the client. In production, Caddy adds the address it got the
 * request from as the last `X-Forwarded-For` entry, so the earlier entries can
 * be set by the client and are not used.
 */
function clientIp(c: Context): string {
  const forwarded = c.req.header('x-forwarded-for')?.split(',').at(-1)?.trim();
  if (forwarded) return forwarded;
  const incoming = (c.env as { incoming?: { socket?: { remoteAddress?: string } } } | undefined)
    ?.incoming;
  return incoming?.socket?.remoteAddress ?? 'unknown';
}
