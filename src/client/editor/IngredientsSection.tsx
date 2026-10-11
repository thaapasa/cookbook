import type { KeyboardEvent } from 'react';
import { Button } from 'react-aria-components';
import { useTranslation } from 'react-i18next';

import { CloseIcon } from '../components/icons.tsx';
import { FormTextField, Section } from './fields.tsx';
import { type IngredientRow, newIngredient } from './form.ts';
import { GroupList } from './GroupList.tsx';

const rowGrid = 'grid grid-cols-[36px_minmax(0,1fr)_44px] items-start gap-2';
const fieldsGrid = 'grid gap-2 sm:grid-cols-[130px_minmax(0,1.2fr)_minmax(0,1fr)]';

export function IngredientsSection() {
  const { t } = useTranslation();

  return (
    <Section title={t('editor.ingredients')} hint={t('editor.ingredientsHint')}>
      <GroupList<IngredientRow, 'ingredientGroups'>
        name="ingredientGroups"
        itemType="application/x-cookbook-ingredient"
        newItem={newIngredient}
        labels={{
          addItem: t('editor.addIngredient'),
          addGroup: t('editor.addIngredientGroup'),
          moveItem: (item) =>
            item.name
              ? t('editor.moveIngredient', { name: item.name })
              : t('editor.moveIngredientEmpty'),
        }}
        columns={
          <div
            aria-hidden="true"
            className={`${rowGrid} hidden pt-1 text-[13px] font-semibold text-muted sm:grid`}
          >
            <span />
            <div className={fieldsGrid}>
              <span>{t('editor.amount')}</span>
              <span>{t('editor.ingredient')}</span>
              <span>{t('editor.note')}</span>
            </div>
          </div>
        }
        renderItem={({ path, autoFocus, handle, remove, addItem }) => {
          // Enter moves to the next field, and adds a row after the last one.
          const onKeyDown = (e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
            if (e.key !== 'Enter' || e.nativeEvent.isComposing) return;
            e.preventDefault();
            const list = e.currentTarget.closest('[data-group]');
            const fields = [...(list?.querySelectorAll<HTMLElement>('[data-enter-nav]') ?? [])];
            const next = fields[fields.indexOf(e.currentTarget) + 1];
            if (next) next.focus();
            else addItem();
          };
          return (
            <div className={rowGrid}>
              {handle}
              <div className={fieldsGrid}>
                <FormTextField
                  name={`${path}.amount`}
                  label={t('editor.amount')}
                  hideLabel
                  placeholder={t('editor.amountPlaceholder')}
                  autoFocus={autoFocus}
                  inputClassName="tabular-nums"
                  onKeyDown={onKeyDown}
                  enterNav
                />
                <FormTextField
                  name={`${path}.name`}
                  label={t('editor.ingredient')}
                  hideLabel
                  placeholder={t('editor.ingredient')}
                  onKeyDown={onKeyDown}
                  enterNav
                />
                <FormTextField
                  name={`${path}.note`}
                  label={t('editor.note')}
                  hideLabel
                  placeholder={t('editor.notePlaceholder')}
                  inputClassName="bg-field-soft text-[15px] text-ink-soft"
                  onKeyDown={onKeyDown}
                  enterNav
                />
              </div>
              <RemoveButton label={t('editor.removeRow')} onPress={remove} />
            </div>
          );
        }}
      />
    </Section>
  );
}

export function RemoveButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Button
      aria-label={label}
      onPress={onPress}
      className="grid size-11 flex-none cursor-pointer place-items-center rounded-xl text-muted hover:bg-danger-soft hover:text-accent-strong"
    >
      <CloseIcon />
    </Button>
  );
}
