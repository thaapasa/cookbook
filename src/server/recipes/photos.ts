import { deletePhoto, savePhoto } from '../images.ts';
import { deleteRecipe, setPhotoPath } from './repository.ts';

/**
 * Stores a new photo for a recipe and deletes the old one. `illustration` marks the
 * photo as one of a similar dish. Returns the new version of the recipe, `'not-found'`
 * if the recipe does not exist and `'not-an-image'` if the data is not an image.
 */
export async function replacePhoto(
  recipeId: string,
  data: Buffer,
  illustration = false,
): Promise<number | 'not-found' | 'not-an-image'> {
  let name: string;
  try {
    name = await savePhoto(data);
  } catch {
    return 'not-an-image';
  }
  const result = await setPhotoPath(recipeId, name, illustration);
  if (!result) {
    await deletePhoto(name);
    return 'not-found';
  }
  if (result.previous) await deletePhoto(result.previous);
  return result.version;
}

/**
 * Removes the photo of a recipe. Returns the new version of the recipe, or `null` if
 * the recipe does not exist.
 */
export async function removePhoto(recipeId: string): Promise<number | null> {
  const result = await setPhotoPath(recipeId, null);
  if (!result) return null;
  if (result.previous) await deletePhoto(result.previous);
  return result.version;
}

/** Deletes a recipe and its photo. Returns `false` if the recipe does not exist. */
export async function deleteRecipeWithPhoto(recipeId: string): Promise<boolean> {
  const photo = await deleteRecipe(recipeId);
  if (photo === undefined) return false;
  if (photo) await deletePhoto(photo);
  return true;
}
