import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Button, Disclosure, DisclosurePanel, Heading } from 'react-aria-components';
import { useTranslation } from 'react-i18next';

import type { WeekPlanChange } from '../../shared/week-plan.ts';
import { weekPlanChangesQuery } from '../api.ts';
import { ChevronRightIcon, ClockIcon } from '../components/icons.tsx';
import { useFormatDay } from './dates.ts';
import { changeEntryName, type ChangePart, describeChange } from './history.ts';

/**
 * The change history of a week, newest first. It is for reading only: the user
 * restores an old entry by adding it again. The history loads when opened.
 */
export function WeekHistory({ start }: { start: string }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const history = useQuery({ ...weekPlanChangesQuery(start), enabled: expanded });

  return (
    <Disclosure
      isExpanded={expanded}
      onExpandedChange={setExpanded}
      className="mt-4 rounded-[20px] border border-line-soft bg-card"
    >
      <Heading className="m-0">
        <Button
          slot="trigger"
          className="flex min-h-14 w-full cursor-pointer items-center gap-2.5 rounded-[20px] px-4 text-left font-display text-lg font-bold outline-accent sm:px-5"
        >
          <ClockIcon className="text-muted" />
          {t('weekEdit.history')}
          <ChevronRightIcon
            className={`ml-auto text-muted transition-transform ${expanded ? 'rotate-90' : ''}`}
          />
        </Button>
      </Heading>
      {/* The closed panel keeps its box, so the padding is on the content. */}
      <DisclosurePanel>
        <div className="px-4 pb-4 sm:px-5">
          <p className="mb-3 text-[15px] text-muted">{t('weekEdit.historyHint')}</p>
          {history.isPending ? (
            <p className="text-muted">{t('common.loading')}</p>
          ) : history.isError ? (
            <p className="text-accent-strong">{t('common.loadError')}</p>
          ) : history.data.length === 0 ? (
            <p className="text-muted">{t('weekEdit.historyEmpty')}</p>
          ) : (
            <ol className="flex flex-col gap-2">
              {history.data.map((change) => (
                <ChangeRow key={change.id} change={change} />
              ))}
            </ol>
          )}
        </div>
      </DisclosurePanel>
    </Disclosure>
  );
}

function ChangeRow({ change }: { change: WeekPlanChange }) {
  const { t, i18n } = useTranslation();
  const time = new Intl.DateTimeFormat(i18n.language, {
    weekday: 'short',
    day: 'numeric',
    month: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(change.at));

  return (
    <li className="flex flex-col gap-1 rounded-[14px] bg-paper px-3.5 py-2.5">
      <div className="flex flex-wrap items-baseline gap-x-2 text-sm text-muted">
        <span className="tabular-nums">{time}</span>
        <span>{change.user}</span>
        {change.source === 'mcp' && (
          <span className="rounded-full bg-chip px-2 text-[13px] font-semibold text-ink-soft">
            {t('weekEdit.viaMcp')}
          </span>
        )}
      </div>
      <p className="font-semibold">{changeEntryName(change)}</p>
      <ul className="flex flex-col text-[15px] text-ink-soft">
        {describeChange(change).map((part, i) => (
          <li key={i}>
            <PartText part={part} />
          </li>
        ))}
      </ul>
    </li>
  );
}

function PartText({ part }: { part: ChangePart }) {
  const { t } = useTranslation();
  const format = useFormatDay();
  const day = (date: string) => `${format.weekday(date)} ${format.dayMonth(date)}`;
  const recipe = (title: string | null) => title ?? t('weekEdit.deletedRecipe');
  const note = (text: string | null) => text ?? t('weekEdit.noNote');

  switch (part.kind) {
    case 'added':
      return t('weekEdit.change.added');
    case 'removed':
      return part.note
        ? t('weekEdit.change.removedWithNote', { note: part.note })
        : t('weekEdit.change.removed');
    case 'text':
      return t('weekEdit.change.text', { from: part.from, to: part.to });
    case 'note':
      return t('weekEdit.change.note', { from: note(part.from), to: note(part.to) });
    case 'linked':
      return t('weekEdit.change.linked', { recipe: recipe(part.recipe) });
    case 'unlinked':
      return t('weekEdit.change.unlinked', { recipe: recipe(part.recipe) });
    case 'relinked':
      return t('weekEdit.change.relinked', { from: recipe(part.from), to: recipe(part.to) });
    case 'moved':
      return t('weekEdit.change.moved', { from: day(part.from), to: day(part.to) });
    case 'reordered':
      return t('weekEdit.change.reordered');
  }
}
