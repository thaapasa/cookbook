import type { WeekPlanChange } from '../../shared/week-plan.ts';

/** One thing that a change did to an entry. A recipe is `null` when it has been deleted. */
export type ChangePart =
  | { kind: 'added' }
  | { kind: 'removed'; note: string | null }
  | { kind: 'text'; from: string; to: string }
  | { kind: 'note'; from: string | null; to: string | null }
  | { kind: 'linked'; recipe: string | null }
  | { kind: 'unlinked'; recipe: string | null }
  | { kind: 'relinked'; from: string | null; to: string | null }
  | { kind: 'moved'; from: string; to: string }
  | { kind: 'reordered' };

/** Returns the name of the entry that a change is about, as it was after the change. */
export function changeEntryName(change: WeekPlanChange): string {
  return (change.after ?? change.before)!.text;
}

/** Lists what a change did, in the order: text, note, recipe link, place. */
export function describeChange(change: WeekPlanChange): ChangePart[] {
  const { before, after, recipes } = change;
  const title = (id: string) => recipes[id] ?? null;
  if (!before) return [{ kind: 'added' }];
  if (!after) return [{ kind: 'removed', note: before.note }];

  const parts: ChangePart[] = [];
  if (before.text !== after.text) parts.push({ kind: 'text', from: before.text, to: after.text });
  if (before.note !== after.note) parts.push({ kind: 'note', from: before.note, to: after.note });
  if (before.recipeId !== after.recipeId) {
    if (!before.recipeId) parts.push({ kind: 'linked', recipe: title(after.recipeId!) });
    else if (!after.recipeId) parts.push({ kind: 'unlinked', recipe: title(before.recipeId) });
    else {
      parts.push({ kind: 'relinked', from: title(before.recipeId), to: title(after.recipeId) });
    }
  }
  if (before.date !== after.date) parts.push({ kind: 'moved', from: before.date, to: after.date });
  else if (before.position !== after.position) parts.push({ kind: 'reordered' });
  return parts;
}
