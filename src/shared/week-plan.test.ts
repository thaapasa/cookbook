import { describe, expect, it } from 'vitest';

import {
  addDays,
  AddEntryInput,
  toIsoDate,
  UpdateEntryInput,
  weekDates,
  WeekPlanQuery,
  weekStart,
} from './week-plan.ts';

describe('addDays', () => {
  it('crosses month and year boundaries', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2027-01-01', -1)).toBe('2026-12-31');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
  });

  it('is not affected by daylight saving time', () => {
    // Finland moves the clocks back on 25 October 2026.
    expect(addDays('2026-10-24', 1)).toBe('2026-10-25');
    expect(addDays('2026-10-25', 1)).toBe('2026-10-26');
  });
});

describe('weekStart', () => {
  it('returns the Saturday on or before the date', () => {
    expect(weekStart('2026-10-17')).toBe('2026-10-17');
    expect(weekStart('2026-10-20')).toBe('2026-10-17');
    expect(weekStart('2026-10-23')).toBe('2026-10-17');
    expect(weekStart('2026-10-24')).toBe('2026-10-24');
  });

  it('supports other start days', () => {
    // Monday
    expect(weekStart('2026-10-18', 1)).toBe('2026-10-12');
    expect(weekStart('2026-10-19', 1)).toBe('2026-10-19');
  });
});

describe('weekDates', () => {
  it('returns seven consecutive dates', () => {
    expect(weekDates('2026-12-26')).toEqual([
      '2026-12-26',
      '2026-12-27',
      '2026-12-28',
      '2026-12-29',
      '2026-12-30',
      '2026-12-31',
      '2027-01-01',
    ]);
  });
});

describe('toIsoDate', () => {
  it('uses the local date', () => {
    expect(toIsoDate(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });
});

describe('WeekPlanQuery', () => {
  it('accepts a range of one day', () => {
    expect(WeekPlanQuery.safeParse({ from: '2026-10-17', to: '2026-10-17' }).success).toBe(true);
  });

  it('rejects a reversed range, a range that is too long and invalid dates', () => {
    expect(WeekPlanQuery.safeParse({ from: '2026-10-17', to: '2026-10-16' }).success).toBe(false);
    expect(WeekPlanQuery.safeParse({ from: '2026-01-01', to: '2027-01-02' }).success).toBe(false);
    expect(WeekPlanQuery.safeParse({ from: '2026-02-30', to: '2026-03-01' }).success).toBe(false);
  });
});

describe('AddEntryInput', () => {
  it('trims the text and stores an empty note as null', () => {
    expect(AddEntryInput.parse({ date: '2026-10-17', text: ' Uunilohi ', note: ' ' })).toEqual({
      date: '2026-10-17',
      text: 'Uunilohi',
      note: null,
      recipeId: null,
    });
  });

  it('requires a text', () => {
    expect(AddEntryInput.safeParse({ date: '2026-10-17', text: ' ' }).success).toBe(false);
  });
});

describe('UpdateEntryInput', () => {
  it('keeps left-out fields undefined', () => {
    expect(UpdateEntryInput.parse({ note: '' })).toEqual({ note: null });
    expect(UpdateEntryInput.parse({ recipeId: null })).toEqual({ recipeId: null });
  });

  it('rejects an empty update', () => {
    expect(UpdateEntryInput.safeParse({}).success).toBe(false);
  });
});
