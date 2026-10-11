import { useQuery } from '@tanstack/react-query';
import { type KeyboardEvent, useState } from 'react';
import { Button, Input, Label, TextField } from 'react-aria-components';
import { useController, useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { tagsQuery } from '../api.ts';
import { CloseIcon } from '../components/icons.tsx';
import { Section } from './fields.tsx';
import type { EditorValues } from './form.ts';

export function TagsSection() {
  const { t } = useTranslation();
  const { control } = useFormContext<EditorValues>();
  const { field } = useController({ control, name: 'tags' });
  const tags = field.value;
  const suggestions = (useQuery(tagsQuery).data ?? [])
    .map((tag) => tag.name)
    .filter((name) => !tags.includes(name));
  const [draft, setDraft] = useState('');

  const add = (tag: string) => {
    const name = tag.trim();
    if (name && !tags.includes(name)) field.onChange([...tags, name]);
  };
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Enter' || e.nativeEvent.isComposing) return;
    e.preventDefault();
    add(draft);
    setDraft('');
  };

  return (
    <Section title={t('editor.tags')} className="gap-3.5">
      {tags.length > 0 && (
        <ul className="flex flex-wrap items-center gap-2">
          {tags.map((tag) => (
            <li
              key={tag}
              className="inline-flex items-center gap-0.5 rounded-full bg-chip pl-3.5 text-[15px] font-medium"
            >
              {tag}
              <Button
                aria-label={t('editor.removeTag', { tag })}
                onPress={() => field.onChange(tags.filter((x) => x !== tag))}
                className="grid size-10 cursor-pointer place-items-center rounded-full text-ink-soft hover:text-accent-strong"
              >
                <CloseIcon size={14} strokeWidth={2.4} />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {suggestions.length > 0 && <span className="text-sm text-muted">{t('editor.addTag')}</span>}
        {suggestions.map((tag) => (
          <Button
            key={tag}
            onPress={() => add(tag)}
            className="min-h-10 cursor-pointer rounded-full border border-dashed border-dashed-line px-3.5 text-[15px] font-medium"
          >
            + {tag}
          </Button>
        ))}
        <TextField
          value={draft}
          onChange={setDraft}
          onBlur={() => {
            add(draft);
            setDraft('');
          }}
          className="max-w-60 flex-[1_1_180px]"
        >
          <Label className="sr-only">{t('editor.newTag')}</Label>
          <Input
            onKeyDown={onKeyDown}
            placeholder={t('editor.newTagPlaceholder')}
            className="min-h-10 w-full rounded-full border border-field bg-card px-3.5 py-1.5 focus:border-accent focus:outline-2 focus:outline-offset-1 focus:outline-accent"
          />
        </TextField>
      </div>
    </Section>
  );
}
