import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { fireEvent } from '@testing-library/dom';
import { useAuthStore } from '../stores/authStore';
import { useNetworkingStore } from '../stores/networkingStore';
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

  describe('networking sync leg', () => {
    // Regression guards for the networking leg of the event-driven push:
    // the write funnel (`saveNetworkingWorkspace`) dispatches the same-tab
    // `jobNetworkingUpdated` custom event; the push effect must subscribe to
    // it and read the workspace at push time (same 2s debounce). The pull
    // side must never wipe local data on an empty/invalid envelope.
    const auth = useAuthStore.getState();

    beforeEach(() => {
      // Fresh stores per test: networking state leaks through the module-level
      // Zustand singletons, and the pull guard keys off `_initialLoadDone`.
      resetInitialLoadDone();
      useNetworkingStore.setState({
        contacts: [],
        interactions: [],
        followUpTasks: [],
        contactLinks: [],
        referrals: [],
      });
    });

    afterEach(() => {
      vi.useRealTimers();
      vi.restoreAllMocks();
      auth.setLoading(false);
    });

    const authenticate = () => {
      useAuthStore.setState({
        isAuthenticated: true,
        isLoading: false,
        currentUser: { id: 'u1', email: 'u1@test.dev', name: 'U1' },
      } as never);
    };

    // POST /api/sync/networking calls only — the pull legs also hit fetch.
    const postNetworkingCalls = (spy: ReturnType<typeof vi.spyOn>) =>
      spy.mock.calls.filter(
        ([url, init]) =>
          String(url).includes('/api/sync/networking') &&
          (init as RequestInit | undefined)?.method === 'POST',
      );

    it('schedules a push when the jobNetworkingUpdated event fires (2s debounce)', async () => {
      vi.useFakeTimers();
      authenticate();

      // Only POST pushes are interesting here; pull legs return empty
      // envelopes (the pull effect fires on mount).
      const pushSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
        const url = String(input);
        if ((init as RequestInit)?.method === 'POST' && url.includes('/api/sync/networking')) {
          return new Response(JSON.stringify({ success: true }), { status: 200 });
        }
        if (url.includes('/api/sync/applications') || url.includes('/api/sync/opportunities')) {
          return new Response(JSON.stringify({ success: true, items: [] }), { status: 200 });
        }
        // GET /api/sync/networking → empty workspace envelope.
        return new Response(JSON.stringify({
          success: true,
          schemaVersion: 1,
          contacts: [], interactions: [], followUpTasks: [], contactLinks: [], referrals: [],
        }), { status: 200 });
      });

      renderHook(() => useCloudSync());

      fireEvent(window, new Event('jobNetworkingUpdated'));

      // Debounce: no networking PUSH before 2s (pulls may have fired).
      await vi.advanceTimersByTimeAsync(1999);
      expect(postNetworkingCalls(pushSpy)).toHaveLength(0);

      await vi.advanceTimersByTimeAsync(1);
      await vi.waitFor(() => expect(postNetworkingCalls(pushSpy)).toHaveLength(1));

      const [, init] = postNetworkingCalls(pushSpy)[0]!;
      expect((init as RequestInit).method).toBe('POST');
      expect((init as RequestInit).credentials).toBe('include');
    });

    it('push payload includes the current networking workspace', async () => {
      vi.useFakeTimers();
      authenticate();

      useNetworkingStore.setState({
        contacts: [{
          id: 'c1',
          name: 'Grace',
          relationshipType: 'mentor',
          tags: [],
          notes: '',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        }],
      });

      const pushSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
        const url = String(input);
        if ((init as RequestInit)?.method === 'POST' && url.includes('/api/sync/networking')) {
          return new Response(JSON.stringify({ success: true }), { status: 200 });
        }
        if (url.includes('/api/sync/applications') || url.includes('/api/sync/opportunities')) {
          return new Response(JSON.stringify({ success: true, items: [] }), { status: 200 });
        }
        return new Response(JSON.stringify({
          success: true,
          schemaVersion: 1,
          contacts: [], interactions: [], followUpTasks: [], contactLinks: [], referrals: [],
        }), { status: 200 });
      });

      renderHook(() => useCloudSync());
      fireEvent(window, new Event('jobNetworkingUpdated'));

      await vi.advanceTimersByTimeAsync(2000);
      await vi.waitFor(() => expect(postNetworkingCalls(pushSpy)).toHaveLength(1));

      const [, init] = postNetworkingCalls(pushSpy)[0]!;
      const body = JSON.parse((init as RequestInit).body as string);
      expect(body.schemaVersion).toBe(1);
      expect(body.contacts).toHaveLength(1);
      expect(body.contacts[0]).toMatchObject({ id: 'c1', name: 'Grace' });
    });

    it('pull replaces the local workspace only from a valid envelope with rows', async () => {
      authenticate();

      vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
        const url = String(input);
        if (url.includes('/api/sync/applications')) {
          return new Response(JSON.stringify({ success: true, items: [] }), { status: 200 });
        }
        if (url.includes('/api/sync/opportunities')) {
          return new Response(JSON.stringify({ success: true, items: [] }), { status: 200 });
        }
        // Networking envelope with one valid row.
        return new Response(JSON.stringify({
          success: true,
          schemaVersion: 1,
          contacts: [{
            id: 'cloud-c1',
            name: 'Cloud Contact',
            relationshipType: 'mentor',
            tags: [],
            notes: '',
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          }],
          interactions: [],
          followUpTasks: [],
          contactLinks: [],
          referrals: [],
        }), { status: 200 });
      });

      renderHook(() => useCloudSync());

      await vi.waitFor(() => {
        expect(useNetworkingStore.getState().contacts).toHaveLength(1);
      });
      expect(useNetworkingStore.getState().contacts[0]).toMatchObject({
        id: 'cloud-c1',
        name: 'Cloud Contact',
      });
    });

    it('pull never wipes local data on an empty or invalid envelope', async () => {
      useNetworkingStore.setState({
        contacts: [{
          id: 'local-c1',
          name: 'Local',
          relationshipType: 'peer',
          tags: [],
          notes: '',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        }],
      });
      authenticate();

      vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
        const url = String(input);
        if (url.includes('/api/sync/applications')) {
          return new Response(JSON.stringify({ success: true, items: [] }), { status: 200 });
        }
        if (url.includes('/api/sync/opportunities')) {
          return new Response(JSON.stringify({ success: true, items: [] }), { status: 200 });
        }
        // Invalid envelope: success true but missing required keys.
        return new Response(JSON.stringify({ success: true }), { status: 200 });
      });

      renderHook(() => useCloudSync());

      await vi.waitFor(() => {
        expect(useNetworkingStore.getState().contacts[0]?.id).toBe('local-c1');
      });
      // Local workspace survived the invalid envelope.
      expect(useNetworkingStore.getState().contacts[0]?.name).toBe('Local');
    });
  });
});
