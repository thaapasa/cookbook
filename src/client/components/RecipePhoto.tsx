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

/** The recipe photo in a 4:3 box, or a placeholder when the recipe has no photo. */
export function RecipePhoto(props: {
  recipeId: string;
  photoUrl: string | null;
  className?: string;
  iconSize?: number;
  label?: string;
}) {
  const { recipeId, photoUrl, className = '', iconSize, label } = props;
  if (photoUrl) {
    return <img src={photoUrl} alt="" className={`aspect-4/3 w-full object-cover ${className}`} />;
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

/** A small square recipe photo, or a placeholder tone when the recipe has no photo. */
export function RecipeThumb(props: {
  recipeId: string;
  photoUrl: string | null;
  className?: string;
  iconSize?: number;
}) {
  const { recipeId, photoUrl, className = '', iconSize } = props;
  if (photoUrl) {
    return <img src={photoUrl} alt="" className={`flex-none object-cover ${className}`} />;
  }
  return (
    <span className={`grid flex-none place-items-center ${tone(recipeId)} ${className}`}>
      {iconSize && <PlateIcon size={iconSize} />}
    </span>
  );
}
