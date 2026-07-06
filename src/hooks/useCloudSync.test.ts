import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useMergeStore } from '../stores/mergeStore';
import { useCloudSync, markInitialLoadDone, resetInitialLoadDone } from './useCloudSync';

describe('useCloudSync', () => {
  beforeEach(() => {
    resetInitialLoadDone();
    useMergeStore.getState().clearConflict();
  });

  it('should export markInitialLoadDone and resetInitialLoadDone', () => {
    expect(markInitialLoadDone).toBeInstanceOf(Function);
    expect(resetInitialLoadDone).toBeInstanceOf(Function);
  });

  it('should allow marking and resetting initial load state', () => {
    expect(() => markInitialLoadDone()).not.toThrow();
    expect(() => resetInitialLoadDone()).not.toThrow();
  });

  describe('M5-style audit: reactive push (no polling)', () => {
    // Regression guard for the M5 follow-up PR: the previous
    // useEffect-based debounce that depended on `[applications,
    // opportunities, isAuthenticated, isSyncPaused]` was replaced with
    // a `jobApplicationsUpdated` + `jobOpportunitiesUpdated` CustomEvent
    // listener pair (see AGENTS.md "Reactive state sync"). The
    // 2s debounce is now driven by the event, not by store state.
    // If a future contributor re-introduces a polling-style timer,
    // this test fails fast.
    it('does not schedule setInterval during mount (event-driven push only)', () => {
      const setIntervalSpy = vi.spyOn(globalThis, 'setInterval');
      try {
        renderHook(() => useCloudSync());
        expect(setIntervalSpy).not.toHaveBeenCalled();
      } finally {
        setIntervalSpy.mockRestore();
      }
    });
  });
});
