/** The public address of the app, such as `https://reseptit.pomeranssi.fi`, without a trailing slash. */
export const publicUrl = readPublicUrl();

function readPublicUrl(): string {
  const value = process.env.PUBLIC_URL;
  if (!value) throw new Error('PUBLIC_URL is not set');
  const url = new URL(value);
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error(`PUBLIC_URL must be an http or https address: ${value}`);
  }
  return url.href.replace(/\/+$/, '');
}

/** Returns the absolute URL of a path on the app's site. */
export function absoluteUrl(path: string): string {
  return publicUrl + path;
}
