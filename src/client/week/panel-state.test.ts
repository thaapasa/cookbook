import { describe, expect, it } from 'vitest';

import { MemoryStorage } from '../memory-storage.ts';
import { loadPanelState, panelStateLifetimeMs, savePanelState } from './panel-state.ts';

const state = { open: true, start: '2026-12-05' };
const now = Date.parse('2026-11-25T18:00:00Z');

describe('week panel state', () => {
  it('loads the saved state', () => {
    const storage = new MemoryStorage();
    savePanelState(storage, state, now);
    expect(loadPanelState(storage, now + panelStateLifetimeMs)).toEqual(state);
  });

  it('forgets the state after its lifetime', () => {
    const storage = new MemoryStorage();
    savePanelState(storage, state, now);
    expect(loadPanelState(storage, now + panelStateLifetimeMs + 1)).toBeNull();
  });

  it('moves a saved date to the start of its week', () => {
    const storage = new MemoryStorage();
    savePanelState(storage, { open: false, start: '2026-12-08' }, now);
    expect(loadPanelState(storage, now)).toEqual({ open: false, start: '2026-12-05' });
  });

  it('ignores a broken entry', () => {
    const storage = new MemoryStorage();
    storage.setItem('week-panel', '{"savedAt":1,');
    expect(loadPanelState(storage, now)).toBeNull();
    storage.setItem('week-panel', JSON.stringify({ savedAt: now, state: { open: 'yes' } }));
    expect(loadPanelState(storage, now)).toBeNull();
  });
});
