import { useTranslation } from 'react-i18next';

import type { Photo } from '../../shared/recipe.ts';
import { PlateIcon } from './icons.tsx';

const tones = [
  'bg-photo-1',
  'bg-photo-2',
  'bg-photo-3',
  'bg-photo-4',
  'bg-photo-5',
  'bg-photo-6',
] as const;

/** Picks a stable background tone from the recipe id. */
function tone(id: string): string {
  let sum = 0;
  for (const char of id) sum += char.charCodeAt(0);
  return tones[sum % tones.length];
}

// The server stores the full photo at up to 1600 px. The browser falls back to the
// largest candidate, so any width above the smaller sizes works here.
const fullPhotoWidth = 1600;

/**
 * The recipe photo in a 4:3 box, or a placeholder when the recipe has no photo.
 * With `sizes`, the browser picks the smallest size that looks sharp; otherwise it
 * shows the full photo. An illustration is toned with the accent color and labeled.
 */
export function RecipePhoto(props: {
  recipeId: string;
  photo: Photo | null;
  sizes?: string;
  loading?: 'lazy' | 'eager';
  className?: string;
  iconSize?: number;
  label?: string;
}) {
  const { recipeId, photo, sizes, loading, className = '', iconSize, label } = props;
  const { t } = useTranslation();
  if (photo) {
    // The short side is the width for a portrait photo and less than it otherwise,
    // so the browser never picks a size that is too small for the crop.
    const srcSet = sizes
      ? [...photo.sizes.map((s) => `${s.url} ${s.size}w`), `${photo.url} ${fullPhotoWidth}w`].join(
          ', ',
        )
      : undefined;
    const img = (
      <img
        src={photo.url}
        srcSet={srcSet}
        sizes={sizes}
        loading={loading}
        alt=""
        className={
          photo.illustration
            ? 'size-full object-cover grayscale contrast-105'
            : `aspect-4/3 w-full object-cover ${className}`
        }
      />
    );
    if (!photo.illustration) return img;
    // The label grows with the box, so it fits a card and the recipe page.
    return (
      <div className={`@container relative aspect-4/3 w-full overflow-hidden ${className}`}>
        {img}
        <div aria-hidden className="absolute inset-0 bg-accent opacity-35 mix-blend-multiply" />
        <span className="absolute bottom-2 left-2.5 text-xs font-semibold tracking-[0.04em] text-white uppercase text-shadow-[0_1px_3px_rgb(0_0_0/0.5)] @md:bottom-3.5 @md:left-4.5 @md:text-sm">
          {t('recipe.illustration')}
        </span>
      </div>
    );
  }
  return (
    <div className={`grid aspect-4/3 place-items-center ${tone(recipeId)} ${className}`}>
      <div className="flex flex-col items-center gap-2 text-sm text-muted">
        <PlateIcon size={iconSize} />
        {label}
      </div>
    </div>
  );
}

/** A small square recipe photo in the smallest size, or a placeholder tone when the recipe has no photo. */
export function RecipeThumb(props: {
  recipeId: string;
  photo: Photo | null;
  className?: string;
  iconSize?: number;
}) {
  const { recipeId, photo, className = '', iconSize } = props;
  if (photo) {
    const url = photo.sizes[0]?.url ?? photo.url;
    return <img src={url} alt="" className={`flex-none object-cover ${className}`} />;
  }
  return (
    <span className={`grid flex-none place-items-center ${tone(recipeId)} ${className}`}>
      {iconSize && <PlateIcon size={iconSize} />}
    </span>
  );
}
