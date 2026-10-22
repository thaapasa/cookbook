import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getRouteApi } from '@tanstack/react-router';
import { type FormEvent, useState } from 'react';
import { Button, Form, Input, Label, TextField } from 'react-aria-components';
import { useTranslation } from 'react-i18next';

import { ApiError, login, meQuery } from '../api.ts';
import { useGoBack } from '../back.tsx';
import {
  errorClass,
  fieldClass,
  labelClass,
  primaryButtonClass,
} from '../components/fieldStyles.ts';

const route = getRouteApi('/_main/login');

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
    <main className="mx-auto flex max-w-100 flex-col gap-6 px-4 pt-12 pb-16 sm:pt-16">
      <h1 className="font-display text-[34px] leading-tight font-bold tracking-[-0.03em]">
        {t('login.heading')}
      </h1>
      <Form
        onSubmit={onSubmit}
        className="flex flex-col gap-4 rounded-[18px] border border-line-soft bg-card p-5.5"
      >
        <TextField
          value={username}
          onChange={setUsername}
          isRequired
          autoComplete="username"
          autoFocus
          className="flex flex-col gap-1.5"
        >
          <Label className={labelClass}>{t('login.username')}</Label>
          <Input className={fieldClass} autoCapitalize="none" autoCorrect="off" />
        </TextField>
        <TextField
          value={password}
          onChange={setPassword}
          isRequired
          type="password"
          autoComplete="current-password"
          className="flex flex-col gap-1.5"
        >
          <Label className={labelClass}>{t('login.password')}</Label>
          <Input className={fieldClass} />
        </TextField>
        {submit.isError && (
          <p role="alert" className={errorClass}>
            {submit.error instanceof ApiError && submit.error.status === 401
              ? t('login.invalid')
              : t('login.error')}
          </p>
        )}
        <Button
          type="submit"
          isDisabled={submit.isPending}
          className={`${primaryButtonClass} mt-1 min-h-12`}
        >
          {t('login.submit')}
        </Button>
      </Form>
    </main>
  );
}
