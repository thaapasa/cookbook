import { useState } from 'react';
import { Button } from 'react-aria-components';
import { useFormContext, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { useFormatDate } from '../format.ts';
import { FormTextField, Section } from './fields.tsx';
import { type EditorValues, newKey } from './form.ts';
import { RemoveButton } from './IngredientsSection.tsx';

export function NotesSection({ authorName }: { authorName: string }) {
  const { t } = useTranslation();
  const formatDate = useFormatDate();
  const { control, setValue, getValues } = useFormContext<EditorValues>();
  const notes = useWatch({ control, name: 'notes' });
  const [focusKey, setFocusKey] = useState<string | null>(null);

  const add = () => {
    const key = newKey();
    setValue('notes', [{ key, text: '', authorName }, ...getValues('notes')], {
      shouldDirty: true,
    });
    setFocusKey(key);
  };
  const remove = (key: string) =>
    setValue(
      'notes',
      getValues('notes').filter((n) => n.key !== key),
      { shouldDirty: true },
    );

  return (
    <Section title={t('editor.notes')} hint={t('editor.notesHint')} className="gap-3.5">
      {notes.length > 0 && (
        <ul className="flex flex-col gap-2.5">
          {notes.map((note, i) => (
            <li key={note.key} className="flex flex-col gap-1.5">
              <span className="text-sm text-muted">
                <strong className="font-semibold text-ink">{note.authorName}</strong> ·{' '}
                {note.createdAt ? (
                  <time dateTime={note.createdAt}>{formatDate(note.createdAt)}</time>
                ) : (
                  t('editor.newNote')
                )}
              </span>
              <div className="grid grid-cols-[minmax(0,1fr)_44px] items-start gap-2">
                <FormTextField
                  name={`notes.${i}.text`}
                  label={t('editor.noteText')}
                  hideLabel
                  rows={2}
                  autoFocus={note.key === focusKey}
                />
                <div className="mt-0.5">
                  <RemoveButton label={t('editor.removeNote')} onPress={() => remove(note.key)} />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      <Button
        onPress={add}
        className="min-h-11 cursor-pointer self-start px-1 text-[15px] font-semibold text-accent-strong"
      >
        {t('editor.addNote')}
      </Button>
    </Section>
  );
}
