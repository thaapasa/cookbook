import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Navigate, useLocation, useNavigate, useParams } from '@tanstack/react-router';
import { type KeyboardEvent, useEffect, useRef, useState } from 'react';
import { Button, Form } from 'react-aria-components';
import { FormProvider, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import type { User } from '../../shared/auth.ts';
import type { Recipe } from '../../shared/recipe.ts';
import {
  addNote,
  ApiError,
  createRecipe,
  deleteNote,
  deletePhoto,
  meQuery,
  recipeQuery,
  setPhotoFlags,
  updateNote,
  updateRecipe,
  uploadPhoto,
} from '../api.ts';
import { BackLink, useGoBack } from '../back.tsx';
import { errorClass, primaryButtonClass, secondaryButtonClass } from '../components/fieldStyles.ts';
import { CheckIcon, ChevronLeftIcon } from '../components/icons.tsx';
import { FormTextField, Section } from '../editor/fields.tsx';
import {
  EditorForm,
  type EditorOutput,
  type EditorValues,
  toFormValues,
  toSaveRequest,
} from '../editor/form.ts';
import { IngredientsSection } from '../editor/IngredientsSection.tsx';
import { NotesSection } from '../editor/NotesSection.tsx';
import { PhotoField } from '../editor/PhotoField.tsx';
import { StepsSection } from '../editor/StepsSection.tsx';
import { TagsSection } from '../editor/TagsSection.tsx';

const formId = 'recipe-editor';

/** Creates a recipe at `/recipes/new` and edits one at `/recipes/$recipeId/edit`. */
export function EditorPage() {
  const { t } = useTranslation();
  const { recipeId } = useParams({ strict: false });
  const pathname = useLocation({ select: (l) => l.pathname });
  const me = useQuery(meQuery);

  if (me.isPending) return <Message>{t('common.loading')}</Message>;
  if (me.isError) return <Message>{t('common.loadError')}</Message>;
  if (!me.data.user) return <Navigate to="/login" search={{ redirect: pathname }} replace />;
  return recipeId ? (
    <EditRecipe recipeId={recipeId} user={me.data.user} />
  ) : (
    <RecipeEditor user={me.data.user} />
  );
}

function EditRecipe({ recipeId, user }: { recipeId: string; user: User }) {
  const { t } = useTranslation();
  const recipe = useQuery(recipeQuery(recipeId));
  // A new key opens the editor again with the latest recipe.
  const [loads, setLoads] = useState(0);
  const reload = async () => {
    if ((await recipe.refetch()).isSuccess) setLoads((n) => n + 1);
  };
  if (recipe.isPending) return <Message>{t('common.loading')}</Message>;
  if (recipe.isError) {
    return (
      <Message>
        {recipe.error instanceof ApiError && recipe.error.status === 404
          ? t('recipe.notFound')
          : t('common.loadError')}
      </Message>
    );
  }
  return (
    <RecipeEditor
      key={`${recipeId}:${loads}`}
      recipe={recipe.data}
      user={user}
      onReload={() => void reload()}
    />
  );
}

function Message({ children }: { children: string }) {
  return <p className="mx-auto max-w-230 px-4 py-8 text-muted sm:px-6">{children}</p>;
}

function RecipeEditor({
  recipe: loadedRecipe,
  user,
  onReload,
}: {
  recipe?: Recipe;
  user: User;
  onReload?: () => void;
}) {
  const { t } = useTranslation();
  // The recipe as the editor opened it. The query refetches in the background, and
  // the save compares the form with what it started from, not with the latest data.
  const [recipe] = useState(loadedRecipe);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const goBack = useGoBack();
  const form = useForm<EditorValues, unknown, EditorOutput>({
    resolver: zodResolver(EditorForm),
    defaultValues: toFormValues(recipe),
  });
  const [photo, setPhoto] = useState<{ file: File; url: string } | null>(null);
  const [photoRemoved, setPhotoRemoved] = useState(false);
  const [illustration, setIllustration] = useState(recipe?.photo?.illustration ?? false);
  // The id and the version after the last successful step of the save. The server
  // refuses to update the recipe if the version has changed, and each step of the save
  // changes it too. A retry after a failed step then checks against the editor's own
  // last change, and a new recipe is updated instead of created again.
  const saved = useRef(recipe ? { id: recipe.id, version: recipe.version } : null);

  useEffect(
    () => () => {
      if (photo) URL.revokeObjectURL(photo.url);
    },
    [photo],
  );

  const save = useMutation({
    mutationFn: async (values: EditorOutput) => {
      const request = toSaveRequest(values);
      if (saved.current) {
        const { id, version } = saved.current;
        saved.current = { id, version: (await updateRecipe(id, { ...request, version })).version };
      } else {
        saved.current = await createRecipe(request);
      }
      const { id } = saved.current;
      const step = async (change: Promise<{ version: number }>) => {
        saved.current = { id, version: (await change).version };
      };

      if (photo) await step(uploadPhoto(id, photo.file, illustration));
      else if (photoRemoved && recipe?.photo) await step(deletePhoto(id));
      else if (recipe?.photo && illustration !== recipe.photo.illustration) {
        await step(setPhotoFlags(id, { illustration }));
      }

      // Notes have no revisions, so they are saved one by one.
      const initialNotes = new Map((recipe?.notes ?? []).map((n) => [n.id, n.text]));
      const kept = new Set(values.notes.map((n) => n.id));
      for (const noteId of initialNotes.keys()) {
        if (!kept.has(noteId)) await step(deleteNote(id, noteId));
      }
      for (const note of values.notes) {
        const text = note.text.trim();
        if (!note.id) {
          if (text) await step(addNote(id, { text }));
        } else if (!text) {
          await step(deleteNote(id, note.id));
        } else if (text !== initialNotes.get(note.id)) {
          await step(updateNote(id, note.id, { text }));
        }
      }
      return id;
    },
    onSuccess: async (id) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['recipes'] }),
        queryClient.invalidateQueries(recipeQuery(id)),
        queryClient.invalidateQueries({ queryKey: ['tags'] }),
      ]);
      // A new recipe replaces the editor, so that going back does not open an empty editor.
      if (recipe) await goBack({ to: '/recipes/$recipeId', params: { recipeId: id } });
      else await navigate({ to: '/recipes/$recipeId', params: { recipeId: id }, replace: true });
    },
  });

  // Enter in a single-line field does not submit the form.
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && e.target instanceof HTMLInputElement) e.preventDefault();
  };

  const cancel = recipe
    ? ({ to: '/recipes/$recipeId', params: { recipeId: recipe.id } } as const)
    : ({ to: '/' } as const);
  const hasErrors = Object.keys(form.formState.errors).length > 0;
  const conflict = save.error instanceof ApiError && save.error.status === 409;

  return (
    <FormProvider {...form}>
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-230 flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3.5 sm:px-6">
          <BackLink
            fallback={cancel}
            className="inline-flex min-h-11 items-center gap-1.5 text-[15px] font-semibold text-muted no-underline hover:text-accent-strong"
          >
            <ChevronLeftIcon />
            {t('editor.cancel')}
          </BackLink>
          <h1 className="font-display text-xl font-bold">
            {recipe ? t('editor.editTitle') : t('editor.newTitle')}
          </h1>
          <Button
            type="submit"
            form={formId}
            isDisabled={save.isPending}
            className={`${primaryButtonClass} ml-auto`}
          >
            <CheckIcon />
            {t('editor.save')}
          </Button>
        </div>
      </header>

      <div onKeyDown={onKeyDown}>
        <Form
          id={formId}
          onSubmit={(e) => void form.handleSubmit((values) => save.mutate(values))(e)}
          validationBehavior="aria"
          className="mx-auto flex max-w-230 flex-col gap-11 px-4 pt-8 pb-20 sm:px-6"
        >
          <Section title={t('editor.basics')} className="gap-5">
            <div className="flex flex-wrap gap-6">
              <div className="flex-[1_1_260px]">
                <PhotoField
                  recipeId={recipe?.id ?? 'new'}
                  url={photo?.url ?? (photoRemoved ? null : (recipe?.photo?.url ?? null))}
                  illustration={illustration}
                  onSelect={(file) => setPhoto({ file, url: URL.createObjectURL(file) })}
                  onRemove={() => {
                    setPhoto(null);
                    setPhotoRemoved(true);
                    setIllustration(false);
                  }}
                  onIllustrationChange={setIllustration}
                />
              </div>
              <div className="flex flex-[1.4_1_340px] flex-col gap-4">
                <FormTextField
                  name="title"
                  label={t('editor.title')}
                  autoFocus={!recipe}
                  inputClassName="text-xl font-semibold"
                />
                <FormTextField
                  name="description"
                  label={t('editor.description')}
                  hint={t('editor.optional')}
                  rows={3}
                />
                <FormTextField
                  name="servings"
                  label={t('editor.servings')}
                  hint={t('editor.optional')}
                  placeholder={t('editor.servingsPlaceholder')}
                />
                <div className="grid grid-cols-2 gap-3">
                  <FormTextField
                    name="activeMinutes"
                    label={t('editor.activeTime')}
                    hint={t('editor.optionalMinutes')}
                    inputMode="numeric"
                  />
                  <FormTextField
                    name="totalMinutes"
                    label={t('editor.totalTime')}
                    hint={t('editor.optionalMinutes')}
                    inputMode="numeric"
                  />
                </div>
                <FormTextField
                  name="source"
                  label={t('editor.source')}
                  hint={t('editor.optional')}
                  placeholder={t('editor.sourcePlaceholder')}
                />
              </div>
            </div>
          </Section>

          <TagsSection />
          <IngredientsSection />
          <StepsSection />
          <NotesSection authorName={user.displayName} />

          <section className="flex flex-col gap-3.5 rounded-[18px] bg-panel p-5.5">
            {recipe && (
              <FormTextField
                name="revisionNote"
                label={t('editor.revisionNote')}
                hint={t('editor.revisionNoteOptional')}
                placeholder={t('editor.revisionNotePlaceholder')}
              />
            )}
            {(hasErrors || save.isError) && (
              <p role="alert" className={errorClass}>
                {hasErrors
                  ? t('editor.invalid')
                  : conflict
                    ? t('editor.conflict')
                    : t('editor.saveError')}
              </p>
            )}
            {conflict && onReload && (
              <Button onPress={onReload} className={`${secondaryButtonClass} self-start`}>
                {t('editor.reload')}
              </Button>
            )}
            <div className="flex flex-wrap justify-end gap-2.5">
              <BackLink
                fallback={cancel}
                className={`${secondaryButtonClass} min-h-12 hover:text-ink`}
              >
                {t('editor.cancel')}
              </BackLink>
              <Button
                type="submit"
                isDisabled={save.isPending}
                className={`${primaryButtonClass} min-h-12 px-6.5 text-base`}
              >
                {save.isPending ? t('editor.saving') : t('editor.saveChanges')}
              </Button>
            </div>
          </section>
        </Form>
      </div>
    </FormProvider>
  );
}
