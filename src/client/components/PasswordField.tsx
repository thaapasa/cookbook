import { useState } from 'react';
import { Group, Input, Label, TextField, ToggleButton } from 'react-aria-components';
import { useTranslation } from 'react-i18next';

import { EyeIcon, EyeOffIcon } from './icons.tsx';

/**
 * A password field with a button that shows the password as typed. Safari on
 * the iPad has no such button of its own.
 */
export function PasswordField(props: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  autoFocus?: boolean;
  className?: string;
  labelClassName: string;
  inputClassName: string;
}) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  return (
    <TextField
      value={props.value}
      onChange={props.onChange}
      isRequired
      type={visible ? 'text' : 'password'}
      autoComplete={props.autoComplete}
      autoFocus={props.autoFocus}
      className={props.className}
    >
      <Label className={props.labelClassName}>{props.label}</Label>
      <Group className="relative">
        <Input
          className={`${props.inputClassName} pr-14`}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
        />
        <ToggleButton
          isSelected={visible}
          onChange={setVisible}
          aria-label={visible ? t('common.hidePassword') : t('common.showPassword')}
          className="absolute inset-y-0 right-1 my-auto grid size-11 cursor-pointer place-items-center rounded-[10px] text-muted outline-accent data-focus-visible:outline-2"
        >
          {visible ? <EyeOffIcon size={22} /> : <EyeIcon size={22} />}
        </ToggleButton>
      </Group>
    </TextField>
  );
}
