import { describe, expect, it } from 'vitest';

import {
  cookingStateLifetimeMs,
  emptyCookingState,
  loadCookingState,
  removeExpiredCookingStates,
  saveCookingState,
} from './state.ts';

class MemoryStorage implements Storage {
  private items = new Map<string, string>();
  get length() {
    return this.items.size;
  }
  clear() {
    this.items.clear();
  }
  getItem(key: string) {
    return this.items.get(key) ?? null;
  }
  key(index: number) {
    return [...this.items.keys()][index] ?? null;
  }
  removeItem(key: string) {
    this.items.delete(key);
  }
  setItem(key: string, value: string) {
    this.items.set(key, value);
  }
}

const state = { done: ['0-1', '1-0'], activeStep: 3 };
const now = Date.parse('2026-11-10T18:00:00Z');

describe('cooking state', () => {
  it('loads the saved state of the recipe', () => {
    const storage = new MemoryStorage();
    saveCookingState(storage, 'a', state, now);
    expect(loadCookingState(storage, 'a', now + 1000)).toEqual(state);
    expect(loadCookingState(storage, 'b', now + 1000)).toBeNull();
  });

  it('forgets the state after its lifetime', () => {
    const storage = new MemoryStorage();
    saveCookingState(storage, 'a', state, now);
    expect(loadCookingState(storage, 'a', now + cookingStateLifetimeMs)).toEqual(state);
    expect(loadCookingState(storage, 'a', now + cookingStateLifetimeMs + 1)).toBeNull();
  });

  it('removes the entry when the state is cleared', () => {
    const storage = new MemoryStorage();
    saveCookingState(storage, 'a', state, now);
    saveCookingState(storage, 'a', emptyCookingState, now);
    expect(storage.length).toBe(0);
  });

  it('ignores a state it cannot read', () => {
    const storage = new MemoryStorage();
    storage.setItem('cooking:a', '{not json');
    storage.setItem('cooking:b', JSON.stringify({ savedAt: now, state: { done: 'x' } }));
    expect(loadCookingState(storage, 'a', now)).toBeNull();
    expect(loadCookingState(storage, 'b', now)).toBeNull();
  });

  it('fills in fields missing from an older saved state', () => {
    const storage = new MemoryStorage();
    storage.setItem('cooking:a', JSON.stringify({ savedAt: now, state: { done: ['0-0'] } }));
    expect(loadCookingState(storage, 'a', now)).toEqual({ done: ['0-0'], activeStep: null });
  });

  it('removes the expired and broken states of all recipes', () => {
    const storage = new MemoryStorage();
    saveCookingState(storage, 'old', state, now - cookingStateLifetimeMs - 1);
    saveCookingState(storage, 'new', state, now);
    storage.setItem('cooking:broken', 'x');
    storage.setItem('theme', 'dark');
    removeExpiredCookingStates(storage, now);
    expect(storage.getItem('cooking:old')).toBeNull();
    expect(storage.getItem('cooking:broken')).toBeNull();
    expect(loadCookingState(storage, 'new', now)).toEqual(state);
    expect(storage.getItem('theme')).toBe('dark');
  });
});
