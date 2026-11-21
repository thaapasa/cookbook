import { Button, Checkbox, FileTrigger } from 'react-aria-components';
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
  /** Whether the photo shows a similar dish, not this recipe. */
  illustration: boolean;
  onSelect: (file: File) => void;
  onRemove: () => void;
  onIllustrationChange: (illustration: boolean) => void;
}) {
  const { t } = useTranslation();
  const { recipeId, url, illustration, onSelect, onRemove, onIllustrationChange } = props;

  return (
    <div className="flex flex-col gap-2">
      <span className={labelClass}>{t('editor.photo')}</span>
      <RecipePhoto
        recipeId={recipeId}
        photo={url ? { url, sizes: [], illustration } : null}
        iconSize={48}
        className="rounded-2xl"
      />
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
      {url && (
        <Checkbox
          isSelected={illustration}
          onChange={onIllustrationChange}
          className="group flex cursor-pointer items-start gap-3 py-1"
        >
          <span className="mt-0.5 grid size-5.5 shrink-0 place-items-center rounded-md border-2 border-field bg-card group-data-focus-visible:outline-2 group-data-focus-visible:outline-offset-2 group-data-focus-visible:outline-accent group-data-selected:border-accent group-data-selected:bg-accent">
            <span className="hidden h-2.75 w-1.5 -translate-y-px rotate-45 border-r-2 border-b-2 border-on-ink group-data-selected:block" />
          </span>
          <span className="flex flex-col">
            <span className="text-[15px] font-semibold text-ink">{t('editor.illustration')}</span>
            <span className="text-sm text-muted">{t('editor.illustrationHint')}</span>
          </span>
        </Checkbox>
      )}
    </div>
  );
}
