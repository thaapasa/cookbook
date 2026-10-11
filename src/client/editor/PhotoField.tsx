import { Button, FileTrigger } from 'react-aria-components';
import { useTranslation } from 'react-i18next';

import { labelClass, secondaryButtonClass } from '../components/fieldStyles.ts';
import { UploadIcon } from '../components/icons.tsx';
import { RecipePhoto } from '../components/RecipePhoto.tsx';

/** The photo of the recipe. The new file or the removal is saved with the recipe. */
export function PhotoField(props: {
  /** Picks the placeholder color. */
  recipeId: string;
  /** The photo to show: the selected file, the saved photo or `null`. */
  url: string | null;
  onSelect: (file: File) => void;
  onRemove: () => void;
}) {
  const { t } = useTranslation();
  const { recipeId, url, onSelect, onRemove } = props;

  return (
    <div className="flex flex-col gap-2">
      <span className={labelClass}>{t('editor.photo')}</span>
      <RecipePhoto recipeId={recipeId} photoUrl={url} iconSize={48} className="rounded-2xl" />
      <div className="flex flex-wrap gap-2">
        <FileTrigger
          acceptedFileTypes={['image/*']}
          onSelect={(files) => {
            const selected = files?.[0];
            if (selected) onSelect(selected);
          }}
        >
          <Button className={`${secondaryButtonClass} px-4`}>
            <UploadIcon />
            {url ? t('editor.changePhoto') : t('editor.addPhoto')}
          </Button>
        </FileTrigger>
        {url && (
          <Button
            onPress={onRemove}
            className="min-h-11 cursor-pointer px-3.5 text-[15px] font-semibold text-accent-strong"
          >
            {t('editor.removePhoto')}
          </Button>
        )}
      </div>
    </div>
  );
}
