import { randomUUID } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

import sharp from 'sharp';

export const imagesDir = path.resolve(process.env.IMAGES_DIR ?? 'data/images');
await mkdir(imagesDir, { recursive: true });

// Wide enough for the recipe page on a high-density screen.
const maxSize = 1600;

/**
 * Resizes an uploaded photo, stores it as WebP and returns its path relative to
 * `imagesDir`. Throws if the data is not an image.
 */
export async function savePhoto(data: Buffer): Promise<string> {
  const image = await sharp(data)
    .rotate()
    .resize(maxSize, maxSize, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();
  // A new name for each upload, so that browsers do not show a cached old photo.
  const name = `${randomUUID()}.webp`;
  await writeFile(path.join(imagesDir, name), image);
  return name;
}

export async function deletePhoto(name: string): Promise<void> {
  await rm(path.join(imagesDir, path.basename(name)), { force: true });
}
