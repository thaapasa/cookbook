import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getRouteApi } from '@tanstack/react-router';
import { type FormEvent, useState } from 'react';
import { Button, Form, Input, Label, TextField } from 'react-aria-components';
import { useTranslation } from 'react-i18next';

import { ApiError, login, meQuery } from '../api.ts';
import { useGoBack } from '../back.tsx';
import { errorClass, fieldClass, primaryButtonClass } from '../components/fieldStyles.ts';

const route = getRouteApi('/_main/login');

// The login form has larger fields than the other forms.
const loginFieldClass = fieldClass
  .replace('min-h-12', 'min-h-13')
  .replace('rounded-xl', 'rounded-[14px]')
  .replace('px-3.5', 'px-4')
  .replace('text-base', 'text-[17px]');
const loginButtonClass = primaryButtonClass
  .replace('min-h-11', 'mt-1 min-h-13')
  .replace('text-[15px]', 'text-[17px]');
const loginLabelClass = 'text-[15px] font-medium text-ink-soft';

export function LoginPage() {
  const { t } = useTranslation();
  const { redirect = '/' } = route.useSearch();
  const goBack = useGoBack();
  const queryClient = useQueryClient();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const submit = useMutation({
    mutationFn: () => login({ username, password }),
    onSuccess: async (user) => {
      queryClient.setQueryData(meQuery.queryKey, { user });
      await goBack({ href: redirect });
    },
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    submit.mutate();
  };

  return (
    <main className="mx-auto flex max-w-105 flex-col gap-7 px-4 pt-12 pb-20 sm:px-6 sm:pt-18">
      <h1 className="font-display text-[clamp(32px,5vw,40px)] leading-[1.05] font-bold tracking-[-0.03em]">
        {t('login.heading')}
      </h1>
      <Form
        onSubmit={onSubmit}
        className="flex flex-col gap-5 rounded-[20px] border border-line-soft bg-card p-6"
      >
        <TextField
          value={username}
          onChange={setUsername}
          isRequired
          autoComplete="username"
          autoFocus
          className="flex flex-col gap-2"
        >
          <Label className={loginLabelClass}>{t('login.username')}</Label>
          <Input className={loginFieldClass} autoCapitalize="none" autoCorrect="off" />
        </TextField>
        <TextField
          value={password}
          onChange={setPassword}
          isRequired
          type="password"
          autoComplete="current-password"
          className="flex flex-col gap-2"
        >
          <Label className={loginLabelClass}>{t('login.password')}</Label>
          <Input className={loginFieldClass} />
        </TextField>
        {submit.isError && (
          <p role="alert" className={errorClass}>
            {submit.error instanceof ApiError && submit.error.status === 401
              ? t('login.invalid')
              : t('login.error')}
          </p>
        )}
        <Button type="submit" isDisabled={submit.isPending} className={loginButtonClass}>
          {t('login.submit')}
        </Button>
      </Form>
    </main>
  );
}
