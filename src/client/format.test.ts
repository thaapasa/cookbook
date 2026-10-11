import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useFormatMinutes } from './format.ts';

describe('useFormatMinutes', () => {
  it('formats minutes as hours and minutes', () => {
    const { result } = renderHook(() => useFormatMinutes());
    const format = result.current;
    expect(format(45)).toBe('45 min');
    expect(format(120)).toBe('2 h');
    expect(format(90)).toBe('1 h 30 min');
  });
});
