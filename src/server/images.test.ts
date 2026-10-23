import { mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import sharp from 'sharp';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { deletePhoto, imagesDir, photoUrls, savePhoto, syncPhotoSizes } from './images.ts';

function image(width: number, height: number, format: 'jpeg' | 'webp' = 'jpeg'): Promise<Buffer> {
  return sharp({ create: { width, height, channels: 3, background: '#c84' } })
    [format]()
    .toBuffer();
}

async function dimensions(file: string): Promise<[number | undefined, number | undefined]> {
  const { width, height } = await sharp(file).metadata();
  return [width, height];
}

function stem(name: string): string {
  return name.replace(/\.webp$/, '');
}

describe('photoUrls', () => {
  it('returns the URLs of the full photo and its smaller sizes', () => {
    expect(photoUrls('a.webp')).toEqual({
      url: '/images/a.webp',
      sizes: [
        { size: 256, url: '/images/a.s256.webp' },
        { size: 768, url: '/images/a.s768.webp' },
      ],
    });
    expect(photoUrls(null)).toBeNull();
  });
});

describe('savePhoto', () => {
  it('stores the smaller sizes by the short side', async () => {
    const landscape = stem(await savePhoto(await image(2000, 1000)));
    expect(await dimensions(path.join(imagesDir, `${landscape}.webp`))).toEqual([1600, 800]);
    expect(await dimensions(path.join(imagesDir, `${landscape}.s256.webp`))).toEqual([512, 256]);
    expect(await dimensions(path.join(imagesDir, `${landscape}.s768.webp`))).toEqual([1536, 768]);

    const portrait = stem(await savePhoto(await image(600, 900)));
    expect(await dimensions(path.join(imagesDir, `${portrait}.s256.webp`))).toEqual([256, 384]);
  });

  it('does not make the smaller sizes larger than the photo', async () => {
    const name = stem(await savePhoto(await image(400, 300)));
    expect(await dimensions(path.join(imagesDir, `${name}.s768.webp`))).toEqual([400, 300]);
  });
});

describe('deletePhoto', () => {
  it('deletes the photo and all files made from it', async () => {
    const name = await savePhoto(await image(40, 30));
    const other = await savePhoto(await image(40, 30));
    await writeFile(path.join(imagesDir, `${stem(name)}.s512.webp`), '');

    await deletePhoto(name);
    const files = await readdir(imagesDir);
    expect(files.filter((f) => f.startsWith(stem(name)))).toEqual([]);
    expect(files.filter((f) => f.startsWith(stem(other)))).toHaveLength(3);
  });
});

describe('syncPhotoSizes', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'cookbook-images-'));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('creates missing sizes and deletes the ones not in use', async () => {
    await writeFile(path.join(dir, 'a.webp'), await image(1000, 800, 'webp'));
    await writeFile(path.join(dir, 'a.s256.webp'), 'kept as is');
    await writeFile(path.join(dir, 'a.s512.webp'), '');
    await writeFile(path.join(dir, 'gone.s256.webp'), '');
    await writeFile(path.join(dir, 'notes.txt'), '');

    await syncPhotoSizes(dir);

    expect((await readdir(dir)).sort()).toEqual([
      'a.s256.webp',
      'a.s768.webp',
      'a.webp',
      'notes.txt',
    ]);
    expect(await dimensions(path.join(dir, 'a.s768.webp'))).toEqual([960, 768]);
  });

  it('skips a photo that is not an image', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    await writeFile(path.join(dir, 'broken.webp'), 'not an image');
    await writeFile(path.join(dir, 'b.webp'), await image(300, 300, 'webp'));

    await syncPhotoSizes(dir);

    expect((await readdir(dir)).sort()).toEqual([
      'b.s256.webp',
      'b.s768.webp',
      'b.webp',
      'broken.webp',
    ]);
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });
});
