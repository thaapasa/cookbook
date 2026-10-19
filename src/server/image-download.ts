import { lookup } from 'node:dns';
import http from 'node:http';
import https from 'node:https';
import { BlockList, isIP, type LookupFunction } from 'node:net';

const maxBytes = 25 * 1024 * 1024;
const timeoutMs = 15_000;
const maxRedirects = 3;

/** An error whose message can be shown to the caller as is. */
export class DownloadError extends Error {}

// Addresses that are not on the public internet. Downloading from them would let
// a caller reach the server itself or other services on its network.
const blocked = new BlockList();
for (const [prefix, bits] of [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4],
] as const) {
  blocked.addSubnet(prefix, bits, 'ipv4');
}
for (const [prefix, bits] of [
  ['::', 128],
  ['::1', 128],
  // NAT64 addresses can point to any IPv4 address. BlockList itself checks
  // IPv4-mapped addresses (::ffff:a.b.c.d) against the IPv4 rules.
  ['64:ff9b::', 96],
  ['fc00::', 7],
  ['fe80::', 10],
  ['ff00::', 8],
] as const) {
  blocked.addSubnet(prefix, bits, 'ipv6');
}

/** Tells if an IP address is outside the public internet. */
export function isPrivateAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 0) return true;
  return blocked.check(address, family === 4 ? 'ipv4' : 'ipv6');
}

// Checks the addresses when the connection is made, so that the host name cannot
// resolve to a different address after the check.
const publicLookup: LookupFunction = (hostname, options, callback) => {
  lookup(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) return callback(err, '', 0);
    if (addresses.length === 0 || addresses.some((a) => isPrivateAddress(a.address))) {
      return callback(new DownloadError(`${hostname} is not a public address`), '', 0);
    }
    if (options.all) return callback(null, addresses);
    callback(null, addresses[0].address, addresses[0].family);
  });
};

export interface DownloadOptions {
  /** Allows local addresses. Only for tests. */
  allowPrivateAddresses?: boolean;
}

/**
 * Downloads an image from a public http or https URL, following a few redirects.
 * Throws a `DownloadError` if the download fails or the response is not usable.
 */
export async function downloadImage(url: string, options: DownloadOptions = {}): Promise<Buffer> {
  const signal = AbortSignal.timeout(timeoutMs);
  let current = new URL(url);
  try {
    for (let redirects = 0; ; redirects++) {
      const res = await get(current, signal, options);
      const location = res.headers.location;
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && location) {
        res.resume();
        if (redirects >= maxRedirects) throw new DownloadError('Too many redirects');
        current = new URL(location, current);
        continue;
      }
      if (res.statusCode !== 200) {
        res.resume();
        throw new DownloadError(`The server responded with status ${res.statusCode}`);
      }
      if (res.headers['content-type']?.startsWith('text/html')) {
        res.resume();
        throw new DownloadError('The URL points to a web page, not an image');
      }
      return await readBody(res);
    }
  } catch (e) {
    if (e instanceof DownloadError) throw e;
    if (signal.aborted) throw new DownloadError('The download timed out');
    throw new DownloadError(`Could not download the image: ${(e as Error).message}`);
  }
}

function get(
  url: URL,
  signal: AbortSignal,
  options: DownloadOptions,
): Promise<http.IncomingMessage> {
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new DownloadError('Only http and https URLs are supported');
  }
  // The lookup function is skipped when the host is an IP address.
  const host = url.hostname.replace(/^\[(.*)\]$/, '$1');
  if (!options.allowPrivateAddresses && isIP(host) && isPrivateAddress(host)) {
    throw new DownloadError(`${host} is not a public address`);
  }
  const client = url.protocol === 'https:' ? https : http;
  return new Promise((resolve, reject) => {
    client
      .get(url, {
        signal,
        lookup: options.allowPrivateAddresses ? undefined : publicLookup,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Cookbook/1.0)',
          Accept: 'image/avif,image/webp,image/*,*/*;q=0.8',
        },
      })
      .on('response', resolve)
      .on('error', reject);
  });
}

async function readBody(res: http.IncomingMessage): Promise<Buffer> {
  if (Number(res.headers['content-length']) > maxBytes) {
    res.destroy();
    throw new DownloadError('The image is larger than 25 MB');
  }
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of res) {
    size += (chunk as Buffer).length;
    if (size > maxBytes) {
      res.destroy();
      throw new DownloadError('The image is larger than 25 MB');
    }
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks);
}
