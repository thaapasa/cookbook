import { deletePhoto, savePhoto } from '../images.ts';
import { deleteRecipe, setPhotoPath } from './repository.ts';

/**
 * Stores a new photo for a recipe and deletes the old one. Returns `'not-found'` if
 * the recipe does not exist and `'not-an-image'` if the data is not an image.
 */
export async function replacePhoto(
  recipeId: string,
  data: Buffer,
): Promise<'saved' | 'not-found' | 'not-an-image'> {
  let name: string;
  try {
    name = await savePhoto(data);
  } catch {
    return 'not-an-image';
  }
  const previous = await setPhotoPath(recipeId, name);
  if (previous === undefined) {
    await deletePhoto(name);
    return 'not-found';
  }
  if (previous) await deletePhoto(previous);
  return 'saved';
}

/** Removes the photo of a recipe. Returns `false` if the recipe does not exist. */
export async function removePhoto(recipeId: string): Promise<boolean> {
  const previous = await setPhotoPath(recipeId, null);
  if (previous === undefined) return false;
  if (previous) await deletePhoto(previous);
  return true;
}

/** Deletes a recipe and its photo. Returns `false` if the recipe does not exist. */
export async function deleteRecipeWithPhoto(recipeId: string): Promise<boolean> {
  const photo = await deleteRecipe(recipeId);
  if (photo === undefined) return false;
  if (photo) await deletePhoto(photo);
  return true;
}
