import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { downloadImage, isPrivateAddress } from './image-download.ts';

const image = Buffer.from('image bytes');

let server: Server;
let base: string;

beforeAll(async () => {
  server = createServer((req, res) => {
    switch (req.url) {
      case '/photo.jpg':
        return res.writeHead(200, { 'Content-Type': 'image/jpeg' }).end(image);
      case '/moved':
        return res.writeHead(302, { Location: '/photo.jpg' }).end();
      case '/loop':
        return res.writeHead(302, { Location: '/loop' }).end();
      case '/page':
        return res.writeHead(200, { 'Content-Type': 'text/html' }).end('<html></html>');
      case '/large':
        return res.writeHead(200, { 'Content-Length': 26 * 1024 * 1024 }).end();
      case '/large-stream':
        res.writeHead(200);
        for (let i = 0; i < 26; i++) res.write(Buffer.alloc(1024 * 1024));
        return res.end();
      default:
        return res.writeHead(404).end();
    }
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => {
  server.close();
});

const local = { allowPrivateAddresses: true };

describe('downloadImage', () => {
  it('downloads the file and follows redirects', async () => {
    expect(await downloadImage(`${base}/photo.jpg`, local)).toEqual(image);
    expect(await downloadImage(`${base}/moved`, local)).toEqual(image);
  });

  it('rejects unusable responses', async () => {
    await expect(downloadImage(`${base}/loop`, local)).rejects.toThrow('Too many redirects');
    await expect(downloadImage(`${base}/page`, local)).rejects.toThrow('web page');
    await expect(downloadImage(`${base}/missing`, local)).rejects.toThrow('status 404');
    await expect(downloadImage(`${base}/large`, local)).rejects.toThrow('25 MB');
    await expect(downloadImage(`${base}/large-stream`, local)).rejects.toThrow('25 MB');
  });

  it('refuses private addresses and other protocols', async () => {
    const port = (server.address() as AddressInfo).port;
    await expect(downloadImage(`${base}/photo.jpg`)).rejects.toThrow('not a public address');
    await expect(downloadImage(`http://localhost:${port}/photo.jpg`)).rejects.toThrow(
      'not a public address',
    );
    await expect(downloadImage('http://[::1]/photo.jpg')).rejects.toThrow('not a public address');
    await expect(downloadImage('file:///etc/passwd')).rejects.toThrow('Only http and https');
  });
});

describe('isPrivateAddress', () => {
  it('accepts public addresses', () => {
    expect(isPrivateAddress('8.8.8.8')).toBe(false);
    expect(isPrivateAddress('2a00:1450:4001::200e')).toBe(false);
  });

  it('refuses addresses outside the public internet', () => {
    for (const address of [
      '127.0.0.1',
      '10.1.2.3',
      '172.17.0.2',
      '192.168.1.1',
      '169.254.169.254',
      '100.64.0.1',
      '0.0.0.0',
      '::1',
      '::',
      '::ffff:127.0.0.1',
      '::ffff:a9fe:a9fe',
      'fd00::1',
      'fe80::1',
      'not an address',
    ]) {
      expect(isPrivateAddress(address), address).toBe(true);
    }
  });
});
