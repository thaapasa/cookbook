import { useFormContext, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { FormTextField, Section } from './fields.tsx';
import { type EditorValues, newStep, type StepRow } from './form.ts';
import { GroupList } from './GroupList.tsx';
import { RemoveButton } from './IngredientsSection.tsx';

export function StepsSection() {
  const { t } = useTranslation();
  const { control } = useFormContext<EditorValues>();
  const groups = useWatch({ control, name: 'stepGroups' });
  // Steps are numbered across groups.
  const stepNumber = (group: number, index: number) =>
    groups.slice(0, group).reduce((sum, g) => sum + g.items.length, 0) + index + 1;

  return (
    <Section title={t('editor.steps')} hint={t('editor.stepsHint')}>
      <GroupList<StepRow, 'stepGroups'>
        name="stepGroups"
        itemType="application/x-cookbook-step"
        newItem={newStep}
        ordered
        labels={{
          addItem: t('editor.addStep'),
          addGroup: t('editor.addStepGroup'),
          moveItem: (_, p) => t('editor.moveStep', { n: stepNumber(p.group, p.index) }),
        }}
        renderItem={({ path, position, autoFocus, handle, remove }) => {
          const n = stepNumber(position.group, position.index);
          return (
            <div className="grid grid-cols-[36px_32px_minmax(0,1fr)_44px] items-start gap-2">
              <div className="mt-0.5">{handle}</div>
              <span
                aria-hidden="true"
                className="mt-2.25 grid size-7.5 place-items-center rounded-full bg-ink font-display text-sm font-bold text-white"
              >
                {n}
              </span>
              <FormTextField
                name={`${path}.text`}
                label={t('editor.step', { n })}
                hideLabel
                rows={2}
                autoFocus={autoFocus}
              />
              <div className="mt-0.5">
                <RemoveButton label={t('editor.removeStep')} onPress={remove} />
              </div>
            </div>
          );
        }}
      />
    </Section>
  );
}
