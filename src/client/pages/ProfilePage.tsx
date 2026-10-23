import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type FormEvent, type ReactNode, useState } from 'react';
import {
  Button,
  Dialog,
  DialogTrigger,
  Form,
  Heading,
  Input,
  Label,
  Modal,
  ModalOverlay,
  TextField,
} from 'react-aria-components';
import { Trans, useTranslation } from 'react-i18next';

import type { Profile, TokenKind } from '../../shared/profile.ts';
import {
  ApiError,
  generateToken,
  meQuery,
  profileQuery,
  resetPassword,
  updateProfile,
} from '../api.ts';
import {
  errorClass,
  fieldClass,
  labelClass,
  primaryButtonClass,
  secondaryButtonClass,
} from '../components/fieldStyles.ts';
import { CheckIcon, CopyIcon } from '../components/icons.tsx';
import { PageMessage, RequireUser } from '../components/RequireUser.tsx';
import { useFormatDate } from '../format.ts';

const cardClass = 'flex flex-col gap-3.5 rounded-[20px] border border-line-soft bg-card p-5.5';
const cardHeading = 'font-display text-[19px] font-bold tracking-[-0.01em]';
const monoClass = 'font-mono text-[15px]';

export function ProfilePage() {
  return (
    <RequireUser>
      <ProfileContent />
    </RequireUser>
  );
}

function ProfileContent() {
  const { t } = useTranslation();
  const profile = useQuery(profileQuery);

  if (profile.isPending) return <PageMessage>{t('common.loading')}</PageMessage>;
  if (profile.isError) return <PageMessage>{t('common.loadError')}</PageMessage>;
  return (
    <main className="mx-auto flex max-w-140 flex-col gap-5 px-4 pt-12 pb-20 sm:px-6">
      <h1 className="mb-1.5 font-display text-[clamp(34px,5vw,46px)] leading-[1.05] font-bold tracking-[-0.03em]">
        {t('profile.heading')}
      </h1>
      <NameCard profile={profile.data} />
      <PasswordCard profile={profile.data} />
      <TokenCard kind="mcp" profile={profile.data} />
      <TokenCard kind="integration" profile={profile.data} />
    </main>
  );
}

function NameCard({ profile }: { profile: Profile }) {
  const { t } = useTranslation();
  const formatDate = useFormatDate();
  const queryClient = useQueryClient();
  const [displayName, setDisplayName] = useState(profile.displayName);
  const save = useMutation({
    mutationFn: () => updateProfile({ displayName }),
    onSuccess: async (user) => {
      queryClient.setQueryData(meQuery.queryKey, { user });
      await queryClient.invalidateQueries(profileQuery);
    },
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    save.mutate();
  };

  return (
    <section className={cardClass}>
      <h2 className={cardHeading}>{t('profile.name')}</h2>
      <p className="text-ink-soft">
        <Trans
          i18nKey="profile.created"
          values={{ username: profile.username, date: formatDate(profile.createdAt) }}
          components={{ strong: <strong className="font-semibold" /> }}
        />
      </p>
      <Form onSubmit={onSubmit} className="flex flex-col gap-4">
        <TextField
          value={displayName}
          onChange={(value) => {
            setDisplayName(value);
            save.reset();
          }}
          isRequired
          maxLength={100}
          className="flex flex-col gap-1.5"
        >
          <Label className={labelClass}>{t('profile.displayName')}</Label>
          <Input className={fieldClass} />
        </TextField>
        {save.isError && (
          <p role="alert" className={errorClass}>
            {t('profile.saveNameError')}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="submit"
            isDisabled={save.isPending || !displayName.trim()}
            className={primaryButtonClass}
          >
            {t('profile.saveName')}
          </Button>
          {save.isSuccess && (
            <span role="status" className="text-sm text-muted">
              {t('profile.nameSaved')}
            </span>
          )}
        </div>
      </Form>
    </section>
  );
}

function PasswordCard({ profile }: { profile: Profile }) {
  const { t } = useTranslation();
  const formatDate = useFormatDate();
  return (
    <section className={cardClass}>
      <h2 className={cardHeading}>{t('profile.password')}</h2>
      <p className="text-ink-soft">
        {t('profile.passwordChanged', { date: formatDate(profile.passwordChangedAt) })}
      </p>
      <CredentialDialog
        buttonLabel={t('profile.resetPassword')}
        info={t('profile.resetPasswordInfo')}
        resultTitle={t('profile.newPassword')}
        resultInfo={t('profile.newPasswordInfo')}
        action={resetPassword}
      />
    </section>
  );
}

const tokenTexts = {
  mcp: {
    title: 'profile.mcpToken',
    info: 'profile.mcpTokenInfo',
    newTitle: 'profile.newMcpToken',
    newInfo: 'profile.newMcpTokenInfo',
  },
  integration: {
    title: 'profile.integrationToken',
    info: 'profile.integrationTokenInfo',
    newTitle: 'profile.newIntegrationToken',
    newInfo: 'profile.newIntegrationTokenInfo',
  },
} as const;

function TokenCard({ kind, profile }: { kind: TokenKind; profile: Profile }) {
  const { t } = useTranslation();
  const formatDate = useFormatDate();
  const token = profile.tokens[kind];
  const texts = tokenTexts[kind];
  return (
    <section className={cardClass}>
      <div className="flex flex-col gap-1">
        <h2 className={cardHeading}>{t(texts.title)}</h2>
        <p className="mt-0.5 text-sm text-muted">{t(texts.info)}</p>
      </div>
      <p className="text-ink-soft">
        {token ? (
          <Trans
            i18nKey="profile.tokenCreated"
            values={{ date: formatDate(token.createdAt), lastChars: token.lastChars }}
            components={{ mono: <span className={monoClass} /> }}
          />
        ) : (
          t('profile.noToken')
        )}
      </p>
      <CredentialDialog
        buttonLabel={t(token ? 'profile.regenerateToken' : 'profile.generateToken')}
        info={t('profile.generateTokenInfo')}
        resultTitle={t(texts.newTitle)}
        resultInfo={t(texts.newInfo)}
        action={(currentPassword) => generateToken(kind, currentPassword)}
      />
    </section>
  );
}

/**
 * A button that opens a dialog. The dialog asks for the current password, and
 * the server then changes the credential and returns the new secret. The dialog
 * shows the secret once.
 */
function CredentialDialog(props: {
  buttonLabel: string;
  info: string;
  resultTitle: string;
  resultInfo: string;
  action: (currentPassword: string) => Promise<string>;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [currentPassword, setCurrentPassword] = useState('');
  const change = useMutation({
    mutationFn: () => props.action(currentPassword),
    onSuccess: () => queryClient.invalidateQueries(profileQuery),
  });

  // Forgets the password and the secret when the dialog opens or closes.
  const onOpenChange = () => {
    setCurrentPassword('');
    change.reset();
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    change.mutate();
  };

  return (
    <DialogTrigger onOpenChange={onOpenChange}>
      <Button className={`${secondaryButtonClass} self-start`}>{props.buttonLabel}</Button>
      <ModalOverlay className="fixed inset-0 z-50 grid place-items-center bg-scrim p-4">
        <Modal className="w-full max-w-110 rounded-3xl bg-card p-7 shadow-[0_24px_60px_var(--color-shadow)]">
          <Dialog className="flex flex-col gap-4.5 outline-none">
            {({ close }) =>
              change.isSuccess ? (
                <>
                  <DialogHeading>{props.resultTitle}</DialogHeading>
                  <p className="text-pretty text-ink-soft">{props.resultInfo}</p>
                  <SecretField label={props.resultTitle} value={change.data} />
                  <div className="flex justify-end pt-1">
                    <Button onPress={close} className={primaryButtonClass}>
                      {t('profile.close')}
                    </Button>
                  </div>
                </>
              ) : (
                <Form onSubmit={onSubmit} className="flex flex-col gap-4.5">
                  <DialogHeading>{props.buttonLabel}</DialogHeading>
                  <p className="text-pretty text-ink-soft">{props.info}</p>
                  <TextField
                    value={currentPassword}
                    onChange={setCurrentPassword}
                    isRequired
                    type="password"
                    autoComplete="current-password"
                    autoFocus
                    className="flex flex-col gap-1.5"
                  >
                    <Label className={labelClass}>{t('profile.currentPassword')}</Label>
                    <Input className={fieldClass} />
                  </TextField>
                  {change.isError && (
                    <p role="alert" className={errorClass}>
                      {change.error instanceof ApiError && change.error.status === 403
                        ? t('profile.wrongPassword')
                        : t('profile.error')}
                    </p>
                  )}
                  <div className="flex flex-wrap justify-end gap-2.5 pt-1">
                    <Button onPress={close} className={secondaryButtonClass}>
                      {t('profile.cancel')}
                    </Button>
                    <Button
                      type="submit"
                      isDisabled={change.isPending}
                      className={primaryButtonClass}
                    >
                      {t('profile.confirm')}
                    </Button>
                  </div>
                </Form>
              )
            }
          </Dialog>
        </Modal>
      </ModalOverlay>
    </DialogTrigger>
  );
}

function DialogHeading({ children }: { children: ReactNode }) {
  return (
    <Heading slot="title" className="font-display text-[26px] font-bold tracking-[-0.02em]">
      {children}
    </Heading>
  );
}

const secretFieldClass = fieldClass
  .replace('min-h-12', 'min-h-13')
  .replace('bg-card', 'bg-paper')
  .replace('text-base', 'font-mono text-[17px] tracking-[0.02em]');

/** A read-only field with a copy button. */
function SecretField({ label, value }: { label: string; value: string }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  // The clipboard API only works on HTTPS and localhost. Elsewhere the user
  // selects the text.
  const canCopy = !!navigator.clipboard;
  const copyLabel = copied ? t('profile.copied') : t('profile.copy');

  const copy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
  };

  return (
    <div className="flex items-center gap-2">
      <TextField value={value} isReadOnly aria-label={label} className="min-w-0 flex-1">
        <Input className={secretFieldClass} onFocus={(e) => e.currentTarget.select()} />
      </TextField>
      {canCopy && (
        <Button
          onPress={() => void copy()}
          aria-label={copyLabel}
          className="grid size-11 flex-none cursor-pointer place-items-center rounded-full border border-field bg-card text-ink"
        >
          {copied ? <CheckIcon size={22} /> : <CopyIcon size={22} />}
        </Button>
      )}
    </div>
  );
}
