// src/stores/mergeStore.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useMergeStore } from './mergeStore';
import type { MergeData } from '../utils/mergeData';

const mockMergeData: MergeData = {
  applications: [],
  opportunities: [],
};

describe('mergeStore', () => {
  beforeEach(() => {
    useMergeStore.getState().clearConflict();
  });

  it('should have correct initial state', () => {
    const state = useMergeStore.getState();
    expect(state.isConflictDetected).toBe(false);
    expect(state.isSyncPaused).toBe(false);
    expect(state.localData).toBeNull();
    expect(state.cloudData).toBeNull();
  });

  it('should set conflict and pause sync', () => {
    const localData: MergeData = { applications: [], opportunities: [] };
    const cloudData: MergeData = { applications: [], opportunities: [] };

    useMergeStore.getState().setConflict(localData, cloudData);

    const state = useMergeStore.getState();
    expect(state.isConflictDetected).toBe(true);
    expect(state.isSyncPaused).toBe(true);
    expect(state.localData).toEqual(localData);
    expect(state.cloudData).toEqual(cloudData);
  });

  it('should clear conflict and resume sync', () => {
    useMergeStore.getState().setConflict(mockMergeData, mockMergeData);
    useMergeStore.getState().clearConflict();

    const state = useMergeStore.getState();
    expect(state.isConflictDetected).toBe(false);
    expect(state.isSyncPaused).toBe(false);
    expect(state.localData).toBeNull();
    expect(state.cloudData).toBeNull();
  });

  it('should pause sync independently', () => {
    useMergeStore.getState().pauseSync();
    expect(useMergeStore.getState().isSyncPaused).toBe(true);
  });

  it('should resume sync and clear conflict flag', () => {
    useMergeStore.getState().setConflict(mockMergeData, mockMergeData);
    useMergeStore.getState().resumeSync();

    const state = useMergeStore.getState();
    expect(state.isSyncPaused).toBe(false);
    expect(state.isConflictDetected).toBe(false);
  });
});
