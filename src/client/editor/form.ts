import { z } from 'zod';

import {
  OptionalText,
  type Recipe,
  RecipeInput,
  type SaveRecipeRequest,
} from '../../shared/recipe.ts';

/** A client-side key for list items, used for React keys and focus. */
export const newKey = () => crypto.randomUUID();

const Minutes = z
  .string()
  .trim()
  .regex(/^\d*$/, 'wholeMinutes')
  .transform((s) => (s ? Number(s) : null));

const Ingredient = z
  .object({ key: z.string(), amount: z.string(), name: z.string(), note: z.string() })
  .refine((i) => i.name.trim() || !(i.amount.trim() || i.note.trim()), {
    path: ['name'],
    message: 'required',
  });

const Step = z.object({ key: z.string(), text: z.string() });

const Note = z.object({
  key: z.string(),
  /** Missing for a note that is not saved yet. */
  id: z.string().optional(),
  text: z.string(),
  authorName: z.string(),
  createdAt: z.string().optional(),
});

/**
 * The editor form. List items carry a `key`, empty rows are allowed, and the
 * times are text. `toSaveRequest` turns the values into a `RecipeInput`.
 */
export const EditorForm = z.object({
  title: z.string().trim().min(1, 'required'),
  description: z.string(),
  servings: z.string(),
  activeMinutes: Minutes,
  totalMinutes: Minutes,
  source: z.string(),
  tags: z.array(z.string()),
  ingredientGroups: z.array(
    z.object({ key: z.string(), name: z.string(), items: z.array(Ingredient) }),
  ),
  stepGroups: z.array(z.object({ key: z.string(), name: z.string(), items: z.array(Step) })),
  notes: z.array(Note),
  revisionNote: z.string(),
});
export type EditorValues = z.input<typeof EditorForm>;
export type EditorOutput = z.output<typeof EditorForm>;
export type IngredientRow = EditorValues['ingredientGroups'][number]['items'][number];
export type StepRow = EditorValues['stepGroups'][number]['items'][number];
export type NoteRow = EditorValues['notes'][number];

export const newIngredient = (): IngredientRow => ({
  key: newKey(),
  amount: '',
  name: '',
  note: '',
});
export const newStep = (): StepRow => ({ key: newKey(), text: '' });

export function toFormValues(recipe: Recipe | undefined): EditorValues {
  const minutes = (m: number | null | undefined) => (m == null ? '' : String(m));
  const ingredientGroups = recipe?.ingredientGroups.length
    ? recipe.ingredientGroups
    : [{ name: null, ingredients: [] }];
  const stepGroups = recipe?.stepGroups.length ? recipe.stepGroups : [{ name: null, steps: [] }];
  return {
    title: recipe?.title ?? '',
    description: recipe?.description ?? '',
    servings: recipe?.servings ?? '',
    activeMinutes: minutes(recipe?.activeMinutes),
    totalMinutes: minutes(recipe?.totalMinutes),
    source: recipe?.source ?? '',
    tags: recipe?.tags ?? [],
    ingredientGroups: ingredientGroups.map((g) => ({
      key: newKey(),
      name: g.name ?? '',
      items: g.ingredients.length
        ? g.ingredients.map((i) => ({
            key: newKey(),
            amount: i.amount ?? '',
            name: i.name,
            note: i.note ?? '',
          }))
        : [newIngredient()],
    })),
    stepGroups: stepGroups.map((g) => ({
      key: newKey(),
      name: g.name ?? '',
      items: g.steps.length ? g.steps.map((text) => ({ key: newKey(), text })) : [newStep()],
    })),
    notes: (recipe?.notes ?? []).map((n) => ({ key: newKey(), ...n })),
    revisionNote: '',
  };
}

/** Builds the API request. Drops empty rows, and groups that have neither a name nor rows. */
export function toSaveRequest(values: EditorOutput): SaveRecipeRequest {
  const ingredientGroups = values.ingredientGroups
    .map((g) => ({
      name: g.name,
      ingredients: g.items
        .filter((i) => i.name.trim())
        .map(({ amount, name, note }) => ({ amount, name, note })),
    }))
    .filter((g) => g.name.trim() || g.ingredients.length);
  const stepGroups = values.stepGroups
    .map((g) => ({
      name: g.name,
      steps: g.items.map((s) => s.text).filter((text) => text.trim()),
    }))
    .filter((g) => g.name.trim() || g.steps.length);
  const recipe = RecipeInput.parse({
    title: values.title,
    description: values.description,
    servings: values.servings,
    activeMinutes: values.activeMinutes,
    totalMinutes: values.totalMinutes,
    source: values.source,
    tags: values.tags,
    ingredientGroups,
    stepGroups,
  });
  return { recipe, revisionNote: OptionalText.parse(values.revisionNote) };
}

type Group<T> = { key: string; items: T[] };

/** A position in grouped items: the group index and the item index within it. */
export type ItemPosition = { group: number; index: number };

/**
 * Moves an item. `to.index` is the insertion index in the target group before the
 * item is removed from its old place.
 */
export function moveItem<T, G extends Group<T>>(
  groups: G[],
  from: ItemPosition,
  to: ItemPosition,
): G[] {
  const item = groups[from.group]?.items[from.index];
  if (!item) return groups;
  let index = to.index;
  if (from.group === to.group && from.index < to.index) index--;
  const next = groups.map((g) => ({ ...g, items: [...g.items] }));
  next[from.group].items.splice(from.index, 1);
  next[to.group].items.splice(index, 0, item);
  return next;
}

/** Moves an item one step up or down, across group boundaries. */
export function stepItem<T, G extends Group<T>>(
  groups: G[],
  from: ItemPosition,
  direction: -1 | 1,
): G[] {
  const { group, index } = from;
  if (direction < 0) {
    if (index > 0) return moveItem(groups, from, { group, index: index - 1 });
    if (group > 0)
      return moveItem(groups, from, { group: group - 1, index: groups[group - 1].items.length });
  } else {
    if (index < groups[group].items.length - 1)
      return moveItem(groups, from, { group, index: index + 2 });
    if (group < groups.length - 1) return moveItem(groups, from, { group: group + 1, index: 0 });
  }
  return groups;
}

/** Moves an element of an array. `to` is the insertion index before removal. */
export function moveInArray<T>(list: T[], from: number, to: number): T[] {
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(from < to ? to - 1 : to, 0, item);
  return next;
}
