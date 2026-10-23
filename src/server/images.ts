import { randomUUID } from 'node:crypto';
import { mkdir, readdir, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

import sharp from 'sharp';

import type { Photo } from '../shared/recipe.ts';

export const imagesDir = path.resolve(process.env.IMAGES_DIR ?? 'data/images');
await mkdir(imagesDir, { recursive: true });

// Wide enough for the recipe page on a high-density screen.
const maxSize = 1600;

/**
 * The short sides of the smaller sizes, smallest first. Photos are cropped to fit
 * their place, so the short side decides how sharp they look.
 */
export const photoSizes = [256, 768];

const quality = 82;

const fullName = /^([\w-]+)\.webp$/;
const sizedName = /^([\w-]+)\.s(\d+)\.webp$/;

/**
 * The file name of a smaller size. The size and the format are in the name, so a
 * change of sizes gives new names and browsers never show a cached old file.
 */
function sizedFileName(name: string, size: number): string {
  return name.replace(/\.webp$/, `.s${size}.webp`);
}

/** The URLs of a stored photo and its smaller sizes. */
export function photoUrls(name: string | null): Photo | null {
  if (!name) return null;
  return {
    url: `/images/${name}`,
    sizes: photoSizes.map((size) => ({ size, url: `/images/${sizedFileName(name, size)}` })),
  };
}

/**
 * Resizes an uploaded photo, stores it and its smaller sizes as WebP and returns
 * its path relative to `imagesDir`. Throws if the data is not an image.
 */
export async function savePhoto(data: Buffer): Promise<string> {
  const image = await sharp(data)
    .rotate()
    .resize(maxSize, maxSize, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality })
    .toBuffer();
  // A new name for each upload, so that browsers do not show a cached old photo.
  const name = `${randomUUID()}.webp`;
  await writeImage(name, image);
  for (const size of photoSizes) await saveSmallerSize(imagesDir, name, image, size);
  return name;
}

/** Deletes a photo and all files made from it. */
export async function deletePhoto(name: string): Promise<void> {
  const match = fullName.exec(path.basename(name));
  if (!match) return;
  const prefix = `${match[1]}.`;
  const files = await readdir(imagesDir);
  await Promise.all(
    files
      .filter((f) => f.startsWith(prefix))
      .map((f) => rm(path.join(imagesDir, f), { force: true })),
  );
}

/**
 * Creates the missing smaller sizes of each photo and deletes the smaller sizes
 * that are no longer in use. Leaves the full photos and other files alone.
 */
export async function syncPhotoSizes(dir = imagesDir): Promise<void> {
  const files = new Set(await readdir(dir));
  let created = 0;
  let deleted = 0;
  for (const file of files) {
    const match = sizedName.exec(file);
    if (!match) continue;
    if (!photoSizes.includes(Number(match[2])) || !files.has(`${match[1]}.webp`)) {
      await rm(path.join(dir, file), { force: true });
      deleted++;
    }
  }
  for (const file of files) {
    if (!fullName.test(file)) continue;
    const missing = photoSizes.filter((size) => !files.has(sizedFileName(file, size)));
    if (!missing.length) continue;
    try {
      const image = path.join(dir, file);
      for (const size of missing) {
        await saveSmallerSize(dir, file, image, size);
        created++;
      }
    } catch (error) {
      console.error(`Could not make the smaller sizes of ${file}:`, error);
    }
  }
  if (created || deleted) {
    console.log(`Photo sizes: created ${created} files, deleted ${deleted} files`);
  }
}

/** Makes a smaller size from the full photo, never larger than the photo. */
async function saveSmallerSize(
  dir: string,
  name: string,
  image: Buffer | string,
  size: number,
): Promise<void> {
  const data = await sharp(image)
    .resize(size, size, { fit: 'outside', withoutEnlargement: true })
    .webp({ quality })
    .toBuffer();
  await writeImage(sizedFileName(name, size), data, dir);
}

/**
 * Writes through a temporary file, so that a crash never leaves a partial file that
 * the startup check would take as complete.
 */
async function writeImage(name: string, data: Buffer, dir = imagesDir): Promise<void> {
  const temp = path.join(dir, `${name}.${randomUUID()}.tmp`);
  await writeFile(temp, data);
  await rename(temp, path.join(dir, name));
}
