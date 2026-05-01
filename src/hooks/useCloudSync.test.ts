// src/hooks/useCloudSync.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useMergeStore } from '../stores/mergeStore';
import { markInitialLoadDone, resetInitialLoadDone } from './useCloudSync';

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
    // These are module-level flags — just verify they don't throw
    expect(() => markInitialLoadDone()).not.toThrow();
    expect(() => resetInitialLoadDone()).not.toThrow();
  });
});
