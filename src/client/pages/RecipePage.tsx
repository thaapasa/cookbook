import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getRouteApi, Link, useNavigate } from '@tanstack/react-router';
import { type FormEvent, useState } from 'react';
import {
  Button,
  Dialog,
  DialogTrigger,
  Form,
  Heading,
  Label,
  Modal,
  ModalOverlay,
  TextArea,
  TextField,
} from 'react-aria-components';
import { useTranslation } from 'react-i18next';

import type { Recipe } from '../../shared/recipe.ts';
import { addNote, ApiError, deleteRecipe, meQuery, recipeQuery } from '../api.ts';
import { errorClass, secondaryButtonClass } from '../components/fieldStyles.ts';
import { ChevronLeftIcon, PencilIcon, TrashIcon } from '../components/icons.tsx';
import { RecipePhoto } from '../components/RecipePhoto.tsx';
import { useFormatDate, useFormatMinutes } from '../format.ts';

const route = getRouteApi('/_main/recipes/$recipeId');

const sectionHeading = 'font-display text-[26px] font-bold tracking-[-0.02em] sm:text-[28px]';
const groupHeading = 'text-[13px] font-semibold tracking-[0.08em] text-muted uppercase';

export function RecipePage() {
  const { t } = useTranslation();
  const { recipeId } = route.useParams();
  const recipe = useQuery(recipeQuery(recipeId));

  return (
    <main className="mx-auto flex max-w-290 flex-col gap-8 px-4 pt-4 pb-18 sm:px-6 sm:pt-6">
      <Link
        to="/"
        className="inline-flex min-h-11 items-center gap-1.5 self-start text-[15px] font-semibold text-muted no-underline hover:text-accent-strong"
      >
        <ChevronLeftIcon />
        {t('recipe.allRecipes')}
      </Link>
      {recipe.isPending ? (
        <p className="text-muted">{t('common.loading')}</p>
      ) : recipe.isError ? (
        <p className="font-display text-2xl font-bold">
          {recipe.error instanceof ApiError && recipe.error.status === 404
            ? t('recipe.notFound')
            : t('common.loadError')}
        </p>
      ) : (
        <RecipeContent recipe={recipe.data} />
      )}
    </main>
  );
}

function RecipeContent({ recipe }: { recipe: Recipe }) {
  const { t } = useTranslation();
  const formatMinutes = useFormatMinutes();
  const user = useQuery(meQuery).data?.user;
  const facts = [
    { label: t('recipe.servings'), value: recipe.servings },
    {
      label: t('recipe.activeTime'),
      value: recipe.activeMinutes !== null ? formatMinutes(recipe.activeMinutes) : null,
    },
    {
      label: t('recipe.totalTime'),
      value: recipe.totalMinutes !== null ? formatMinutes(recipe.totalMinutes) : null,
    },
    { label: t('recipe.source'), value: recipe.source && <Source source={recipe.source} /> },
  ].filter((f) => f.value);

  // Steps are numbered across groups.
  const stepOffsets = recipe.stepGroups.map((_, g) =>
    recipe.stepGroups.slice(0, g).reduce((sum, group) => sum + group.steps.length, 0),
  );

  return (
    <>
      <section className="grid items-end gap-x-12 gap-y-6 md:grid-cols-2">
        <RecipePhoto
          recipeId={recipe.id}
          photoUrl={recipe.photoUrl}
          label={t('recipe.photo')}
          iconSize={56}
          className="-mx-4 sm:mx-0 sm:rounded-3xl md:order-last"
        />
        <div className="flex min-w-0 flex-col gap-4.5">
          {recipe.tags.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {recipe.tags.map((tag) => (
                <li key={tag}>
                  <Link
                    to="/"
                    search={{ tags: [tag] }}
                    className="block rounded-full bg-chip px-3 py-1 text-sm font-medium text-ink no-underline hover:text-accent-strong"
                  >
                    {tag}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <h1 className="font-display text-[clamp(44px,7vw,76px)] leading-[0.98] font-bold tracking-[-0.035em] break-words">
            {recipe.title}
          </h1>
          {recipe.description && (
            <p className="max-w-[34em] text-[17px] text-pretty text-ink-soft sm:text-[19px]">
              {recipe.description}
            </p>
          )}
          {facts.length > 0 && (
            <dl className="flex flex-wrap gap-x-8 gap-y-3 text-[15px]">
              {facts.map((fact) => (
                <div key={fact.label} className="flex flex-col">
                  <dt className="text-muted">{fact.label}</dt>
                  <dd className="text-[17px] font-semibold">{fact.value}</dd>
                </div>
              ))}
            </dl>
          )}
          {user && (
            <div className="flex flex-wrap gap-2.5 pt-1.5">
              <Link
                to="/recipes/$recipeId/edit"
                params={{ recipeId: recipe.id }}
                className={`${secondaryButtonClass} min-h-13 px-5 text-base hover:text-ink`}
              >
                <PencilIcon />
                {t('recipe.edit')}
              </Link>
              <DeleteRecipeButton recipe={recipe} />
            </div>
          )}
        </div>
      </section>

      <div className="grid items-start gap-x-14 gap-y-10 border-t border-line pt-7 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <section className="flex min-w-0 flex-col gap-6">
          <h2 className={sectionHeading}>{t('recipe.ingredients')}</h2>
          {recipe.ingredientGroups.map((group, g) => (
            <div key={g} className="flex flex-col gap-2.5">
              {group.name && <h3 className={groupHeading}>{group.name}</h3>}
              <ul className="flex flex-col">
                {group.ingredients.map((ingredient, i) => (
                  <li
                    key={i}
                    className="grid grid-cols-[5.5rem_minmax(0,1fr)] items-baseline gap-x-3.5 gap-y-0.5 border-b border-line-soft py-2.5 sm:grid-cols-[5.5rem_minmax(0,1fr)_minmax(0,1fr)]"
                  >
                    <span className="font-semibold tabular-nums">{ingredient.amount}</span>
                    <span>{ingredient.name}</span>
                    {ingredient.note && (
                      <span className="col-start-2 text-sm leading-snug text-muted sm:col-start-3">
                        {ingredient.note}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>

        <section className="flex min-w-0 flex-col gap-6">
          <h2 className={sectionHeading}>{t('recipe.steps')}</h2>
          {recipe.stepGroups.map((group, g) => (
            <div key={g} className="flex flex-col gap-4">
              {group.name && <h3 className={groupHeading}>{group.name}</h3>}
              <ol className="flex flex-col gap-5">
                {group.steps.map((step, i) => {
                  const stepNumber = stepOffsets[g] + i + 1;
                  return (
                    <li
                      key={i}
                      value={stepNumber}
                      className="grid grid-cols-[2.75rem_1fr] items-start gap-4"
                    >
                      <span
                        aria-hidden="true"
                        className="grid size-9 place-items-center rounded-full bg-ink font-display font-bold text-white"
                      >
                        {stepNumber}
                      </span>
                      <p className="mt-1 text-[17px] text-pretty sm:text-lg">{step}</p>
                    </li>
                  );
                })}
              </ol>
            </div>
          ))}
        </section>
      </div>

      <Notes recipe={recipe} />
    </>
  );
}

function DeleteRecipeButton({ recipe }: { recipe: Recipe }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const remove = useMutation({
    mutationFn: () => deleteRecipe(recipe.id),
    onSuccess: async () => {
      await navigate({ to: '/' });
      queryClient.removeQueries(recipeQuery(recipe.id));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['recipes'] }),
        queryClient.invalidateQueries({ queryKey: ['tags'] }),
      ]);
    },
  });

  return (
    <DialogTrigger onOpenChange={() => remove.reset()}>
      <Button
        className={`${secondaryButtonClass} min-h-13 px-5 text-base hover:bg-danger-soft hover:text-accent-strong`}
      >
        <TrashIcon />
        {t('recipe.delete')}
      </Button>
      <ModalOverlay className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4">
        <Modal className="w-full max-w-md rounded-3xl bg-card p-6 shadow-xl">
          <Dialog role="alertdialog" className="flex flex-col gap-4 outline-none">
            {({ close }) => (
              <>
                <Heading slot="title" className="font-display text-2xl font-bold">
                  {t('recipe.deleteTitle')}
                </Heading>
                <p className="text-pretty text-ink-soft">
                  {t('recipe.deleteConfirm', { title: recipe.title })}
                </p>
                {remove.isError && <p className={errorClass}>{t('recipe.deleteError')}</p>}
                <div className="flex flex-wrap justify-end gap-2.5 pt-2">
                  <Button onPress={close} className={secondaryButtonClass}>
                    {t('recipe.deleteCancel')}
                  </Button>
                  <Button
                    onPress={() => remove.mutate()}
                    isDisabled={remove.isPending}
                    className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-full bg-accent-strong px-5.5 text-[15px] font-semibold text-white data-disabled:cursor-default data-disabled:opacity-50"
                  >
                    <TrashIcon />
                    {t('recipe.deleteSubmit')}
                  </Button>
                </div>
              </>
            )}
          </Dialog>
        </Modal>
      </ModalOverlay>
    </DialogTrigger>
  );
}

function Source({ source }: { source: string }) {
  const url = URL.parse(source);
  if (url && (url.protocol === 'http:' || url.protocol === 'https:')) {
    return (
      <a
        href={url.href}
        target="_blank"
        rel="noreferrer"
        className="text-accent-strong underline-offset-3"
      >
        {url.hostname.replace(/^www\./, '')}
      </a>
    );
  }
  return source;
}

function Notes({ recipe }: { recipe: Recipe }) {
  const { t } = useTranslation();
  const formatDate = useFormatDate();
  const user = useQuery(meQuery).data?.user;

  return (
    <section
      aria-labelledby="notes-heading"
      className="flex max-w-190 flex-col gap-4.5 border-t border-line pt-8"
    >
      <div className="flex flex-wrap items-baseline gap-3">
        <h2 id="notes-heading" className={sectionHeading}>
          {t('recipe.notes')}
        </h2>
        <span className="text-[15px] text-muted">
          {t('recipe.noteCount', { count: recipe.notes.length })}
        </span>
      </div>
      {recipe.notes.length ? (
        <ul className="flex flex-col gap-2.5">
          {recipe.notes.map((note) => (
            <li
              key={note.id}
              className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-3.5 rounded-2xl border border-line-soft bg-card px-4.5 py-4"
            >
              <span
                aria-hidden="true"
                className="grid size-10 place-items-center rounded-full bg-chip text-[15px] font-semibold"
              >
                {note.authorName.charAt(0)}
              </span>
              <div className="flex min-w-0 flex-col gap-0.5">
                <div className="flex flex-wrap items-baseline gap-x-2.5">
                  <strong className="font-semibold">{note.authorName}</strong>
                  <time dateTime={note.createdAt} className="text-sm text-muted">
                    {formatDate(note.createdAt)}
                  </time>
                </div>
                <p className="text-[17px] text-pretty whitespace-pre-line">{note.text}</p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted">{t('recipe.noNotes')}</p>
      )}
      {user ? (
        <NoteForm recipeId={recipe.id} />
      ) : (
        <Link
          to="/login"
          search={{ redirect: `/recipes/${recipe.id}` }}
          className="self-start text-sm text-muted underline-offset-3 hover:text-accent-strong"
        >
          {t('recipe.loginToAddNote')}
        </Link>
      )}
    </section>
  );
}

function NoteForm({ recipeId }: { recipeId: string }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [text, setText] = useState('');
  const save = useMutation({
    mutationFn: () => addNote(recipeId, { text }),
    onSuccess: async () => {
      setText('');
      await queryClient.invalidateQueries(recipeQuery(recipeId));
    },
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (text.trim()) save.mutate();
  };

  return (
    <Form onSubmit={onSubmit} className="flex flex-col gap-2.5">
      <TextField value={text} onChange={setText} className="flex flex-col gap-1.5">
        <Label className="text-sm font-semibold text-ink-soft">{t('recipe.addNote')}</Label>
        <TextArea
          rows={2}
          placeholder={t('recipe.notePlaceholder')}
          className="w-full resize-y rounded-xl border border-field bg-card px-3.5 py-3 leading-normal focus:border-accent focus:outline-2 focus:outline-offset-1 focus:outline-accent"
        />
      </TextField>
      {save.isError && <p className="text-sm text-accent-strong">{t('recipe.saveNoteError')}</p>}
      <Button
        type="submit"
        isDisabled={!text.trim() || save.isPending}
        className="min-h-11 cursor-pointer self-end rounded-full bg-ink px-5.5 text-[15px] font-semibold text-white data-disabled:cursor-default data-disabled:opacity-50"
      >
        {t('recipe.saveNote')}
      </Button>
    </Form>
  );
}
