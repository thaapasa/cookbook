import { describe, expect, it } from 'vitest';

import type { WeekPlanChange, WeekPlanSnapshot } from '../../shared/week-plan.ts';
import { changeEntryName, describeChange } from './history.ts';

const lohi = '019a0000-0000-7000-8000-000000000001';
const keitto = '019a0000-0000-7000-8000-000000000002';

const entry: WeekPlanSnapshot = {
  date: '2026-10-17',
  position: 0,
  text: 'Lohta',
  note: null,
  recipeId: null,
};

function change(
  before: Partial<WeekPlanSnapshot> | null,
  after: Partial<WeekPlanSnapshot> | null,
  recipes: Record<string, string> = {},
): WeekPlanChange {
  return {
    id: 'c',
    at: '2026-10-17T12:00:00.000Z',
    user: 'Tuukka',
    source: 'app',
    before: before && { ...entry, ...before },
    after: after && { ...entry, ...after },
    recipes,
  };
}

describe('describeChange', () => {
  it('describes an added and a removed entry', () => {
    expect(describeChange(change(null, {}))).toEqual([{ kind: 'added' }]);
    expect(describeChange(change({ note: 'tuplasatsi' }, null))).toEqual([
      { kind: 'removed', note: 'tuplasatsi' },
    ]);
  });

  it('lists every field that changed', () => {
    expect(
      describeChange(change({}, { text: 'Uunilohta', note: 'perunat', date: '2026-10-20' })),
    ).toEqual([
      { kind: 'text', from: 'Lohta', to: 'Uunilohta' },
      { kind: 'note', from: null, to: 'perunat' },
      { kind: 'moved', from: '2026-10-17', to: '2026-10-20' },
    ]);
  });

  it('tells a reorder within a day from a move to another day', () => {
    expect(describeChange(change({}, { position: 2 }))).toEqual([{ kind: 'reordered' }]);
    expect(describeChange(change({}, { date: '2026-10-18', position: 2 }))).toEqual([
      { kind: 'moved', from: '2026-10-17', to: '2026-10-18' },
    ]);
  });

  it('describes recipe links, with null for a deleted recipe', () => {
    const titles = { [keitto]: 'Lohikeitto' };
    expect(describeChange(change({}, { recipeId: keitto }, titles))).toEqual([
      { kind: 'linked', recipe: 'Lohikeitto' },
    ]);
    expect(describeChange(change({ recipeId: lohi }, {}, titles))).toEqual([
      { kind: 'unlinked', recipe: null },
    ]);
    expect(describeChange(change({ recipeId: lohi }, { recipeId: keitto }, titles))).toEqual([
      { kind: 'relinked', from: null, to: 'Lohikeitto' },
    ]);
  });
});

describe('changeEntryName', () => {
  it('uses the text after the change, or before it for a removal', () => {
    expect(changeEntryName(change({}, { text: 'Uunilohta' }))).toBe('Uunilohta');
    expect(changeEntryName(change({}, null))).toBe('Lohta');
  });
});
