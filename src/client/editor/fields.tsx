import type { KeyboardEvent, ReactNode } from 'react';
import { FieldError, Input, Label, TextArea, TextField } from 'react-aria-components';
import { Controller, type FieldPath, useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { errorClass, fieldClass, labelClass, optionalClass } from '../components/fieldStyles.ts';
import type { EditorValues } from './form.ts';

/** A text field bound to the editor form, with a label and the validation error. */
export function FormTextField(props: {
  /** Path of a text value in the form. */
  name: FieldPath<EditorValues>;
  label: string;
  /** Shown after the label, such as "(vapaaehtoinen)". */
  hint?: string;
  hideLabel?: boolean;
  placeholder?: string;
  rows?: number;
  autoFocus?: boolean;
  inputMode?: 'numeric';
  className?: string;
  inputClassName?: string;
  onKeyDown?: (e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  /** Marks the field for moving to the next field with Enter. */
  enterNav?: boolean;
}) {
  const { t } = useTranslation();
  const { control } = useFormContext<EditorValues>();
  const { name, label, hint, hideLabel, placeholder, rows, autoFocus, inputMode } = props;
  const inputProps = {
    placeholder,
    inputMode,
    onKeyDown: props.onKeyDown,
    'data-enter-nav': props.enterNav ? '' : undefined,
    className: `${fieldClass} ${rows ? 'resize-y leading-normal' : ''} ${props.inputClassName ?? ''}`,
  };

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <TextField
          value={field.value as string}
          onChange={field.onChange}
          onBlur={field.onBlur}
          name={field.name}
          autoFocus={autoFocus}
          isInvalid={fieldState.invalid}
          validationBehavior="aria"
          className={`flex flex-col gap-1.5 ${props.className ?? ''}`}
        >
          <Label className={hideLabel ? 'sr-only' : labelClass}>
            {label}
            {hint && <span className={optionalClass}> {hint}</span>}
          </Label>
          {rows ? (
            <TextArea ref={field.ref} rows={rows} {...inputProps} />
          ) : (
            <Input ref={field.ref} {...inputProps} />
          )}
          <FieldError className={errorClass}>
            {fieldState.error?.message &&
              t(`editor.${fieldState.error.message as 'required' | 'wholeMinutes'}`)}
          </FieldError>
        </TextField>
      )}
    />
  );
}

export function Section(props: {
  title: string;
  hint?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={`flex flex-col gap-4 ${props.className ?? ''}`}>
      <div className="flex flex-col gap-1">
        <h2 className="font-display text-[26px] font-bold tracking-[-0.02em]">{props.title}</h2>
        {props.hint && <p className="text-sm text-muted">{props.hint}</p>}
      </div>
      {props.children}
    </section>
  );
}
