import { app } from '../app.ts';

/** The origin of `app.request` URLs. */
export const origin = 'http://localhost';

/**
 * Sends a request to the app. A `json` body is sent as JSON. Like a browser, sends
 * the same origin unless the `origin` header is set.
 */
export function request(
  path: string,
  opts: { method?: string; json?: unknown; cookie?: string; headers?: HeadersInit } = {},
): Promise<Response> {
  const headers = new Headers(opts.headers);
  if (!headers.has('origin')) headers.set('origin', origin);
  if (opts.cookie) headers.set('cookie', opts.cookie);
  let body: string | undefined;
  if (opts.json !== undefined) {
    headers.set('content-type', 'application/json');
    body = JSON.stringify(opts.json);
  }
  return Promise.resolve(app.request(path, { method: opts.method ?? 'GET', headers, body }));
}

/** Logs in and returns the session cookie for the `cookie` header. */
export async function login(username: string, password: string): Promise<string> {
  const res = await request('/api/auth/login', {
    method: 'POST',
    json: { username, password },
  });
  const cookie = res.headers.get('set-cookie')?.split(';')[0];
  if (res.status !== 200 || !cookie) throw new Error(`Login failed with ${res.status}`);
  return cookie;
}
