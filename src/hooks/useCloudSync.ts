import { useEffect, useRef } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useApplicationsStore } from '../stores/applicationsStore';
import { useOpportunitiesStore } from '../stores/opportunitiesStore';
import { useNetworkingStore } from '../stores/networkingStore';
import { useMergeStore } from '../stores/mergeStore';
import type { JobApplication } from '../types/applications';
import type { JobOpportunity } from '../types/opportunities';
import type { MergeData } from '../utils/mergeData';
import type { NetworkingWorkspace } from '../types/networking';
import {
  parseApplicationsSyncResponse,
  parseOpportunitiesSyncResponse,
  safeJson,
} from '../utils/syncSchemas';
import {
  parseNetworkingSyncResponse,
} from '../utils/networkingSyncSchemas';

let _initialLoadDone = false;
export function markInitialLoadDone() {
  _initialLoadDone = true;
}
export function resetInitialLoadDone() {
  _initialLoadDone = false;
}

async function pullCloudData(
  setApplications: (apps: JobApplication[]) => void,
  setOpportunities: (opps: JobOpportunity[]) => void,
  setConflict: (local: MergeData, cloud: MergeData) => void,
  signal?: AbortSignal,
): Promise<'done' | 'conflict'> {
  try {
    // credentials: 'include' is REQUIRED on the pull side so the server can
    // identify the user and return only their data — without it the request is
    // unauthenticated and any session cookie is ignored. The previous version
    // omitted this flag, which was both broken and a tenant-isolation risk.
    const appRes = await fetch('/api/sync/applications', { credentials: 'include', signal });
    const appParsed = appRes.ok
      ? parseApplicationsSyncResponse(await safeJson(appRes))
      : { items: [], dropped: 0, truncated: 0, envelopeError: `http ${appRes.status}` };
    if (appParsed.envelopeError) {
      console.warn('[useCloudSync] applications envelope error:', appParsed.envelopeError);
    }
    if (appParsed.dropped > 0) {
      console.warn(`[useCloudSync] dropped ${appParsed.dropped} application(s) failed validation`);
    }
    if (appParsed.truncated > 0) {
      console.warn(
        `[useCloudSync] truncated ${appParsed.truncated} application(s) beyond the 1000-row DoS cap`,
      );
    }

    const oppRes = await fetch('/api/sync/opportunities', { credentials: 'include', signal });
    const oppParsed = oppRes.ok
      ? parseOpportunitiesSyncResponse(await safeJson(oppRes))
      : { items: [], dropped: 0, truncated: 0, envelopeError: `http ${oppRes.status}` };
    if (oppParsed.envelopeError) {
      console.warn('[useCloudSync] opportunities envelope error:', oppParsed.envelopeError);
    }
    if (oppParsed.dropped > 0) {
      console.warn(`[useCloudSync] dropped ${oppParsed.dropped} opportunit(ies) failed validation`);
    }
    if (oppParsed.truncated > 0) {
      console.warn(
        `[useCloudSync] truncated ${oppParsed.truncated} opportunit(ies) beyond the 1000-row DoS cap`,
      );
    }

    // Networking CRM pull: same trust model as the other legs — the response
    // is attacker-influenced, so it is validated with the same per-entity
    // schemas as the local read path before it touches the store. An
    // empty/invalid envelope must NOT wipe local data: only a valid envelope
    // with at least one row replaces the local workspace.
    try {
      const netRes = await fetch('/api/sync/networking', { credentials: 'include', signal });
      const netParsed = netRes.ok
        ? parseNetworkingSyncResponse(await safeJson(netRes))
        : { workspace: null, envelopeError: `http ${netRes.status}`, dropped: 0 };
      if (netParsed.envelopeError) {
        console.warn('[useCloudSync] networking envelope error:', netParsed.envelopeError);
      }
      if (netParsed.dropped > 0) {
        console.warn(`[useCloudSync] dropped ${netParsed.dropped} networking row(s) failed validation`);
      }
      const net = netParsed.workspace;
      const netHasRows =
        net !== null &&
        (net.contacts.length > 0 ||
          net.interactions.length > 0 ||
          net.followUpTasks.length > 0 ||
          net.contactLinks.length > 0 ||
          net.referrals.length > 0);
      if (net !== null && netHasRows) {
        useNetworkingStore.getState().setWorkspace(net);
      }
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return 'done';
      console.error('Failed to pull networking data from cloud', err);
    }

    const cloudApps = appParsed.items;
    const cloudOpps = oppParsed.items;

    const localApps = useApplicationsStore.getState().applications;
    const localOpps = useOpportunitiesStore.getState().opportunities;

    // Treat each leg as "has cloud data" only when the envelope succeeded AND
    // the array returned at least one row. This avoids false-positive
    // conflicts when one leg has a transient server error (envelopeError set,
    // items: []) but the other leg has valid data.
    const cloudAppsOk = appParsed.envelopeError === null && cloudApps.length > 0;
    const cloudOppsOk = oppParsed.envelopeError === null && cloudOpps.length > 0;

    const hasLocalData = localApps.length > 0 || localOpps.length > 0;
    const hasCloudData = cloudAppsOk || cloudOppsOk;

    if (hasLocalData && hasCloudData) {
      setConflict(
        { applications: [...localApps], opportunities: [...localOpps] },
        { applications: cloudApps, opportunities: cloudOpps },
      );
      return 'conflict';
    }

    if (cloudAppsOk) setApplications(cloudApps);
    if (cloudOppsOk) setOpportunities(cloudOpps);

    // Networking CRM pull: same trust model as the other legs — the response
    // is attacker-influenced, so it is validated before it touches the store.
    // An empty/invalid envelope must NOT wipe local data: only a valid
    // envelope with at least one row replaces the local workspace.
    try {
      const netRes = await fetch('/api/sync/networking', { credentials: 'include', signal });
      const netParsed = netRes.ok
        ? parseNetworkingSyncResponse(await safeJson(netRes))
        : { workspace: null, envelopeError: `http ${netRes.status}`, dropped: 0 };
      if (netParsed.envelopeError) {
        console.warn('[useCloudSync] networking envelope error:', netParsed.envelopeError);
      }
      if (netParsed.dropped > 0) {
        console.warn(`[useCloudSync] dropped ${netParsed.dropped} networking row(s) failed validation`);
      }
      const net = netParsed.workspace;
      const netHasRows =
        net !== null &&
        (net.contacts.length > 0 ||
          net.interactions.length > 0 ||
          net.followUpTasks.length > 0 ||
          net.contactLinks.length > 0 ||
          net.referrals.length > 0);
      if (net !== null && netHasRows) {
        useNetworkingStore.getState().setWorkspace(net);
      }
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return 'done';
      console.error('Failed to pull networking data from cloud', err);
    }

    return 'done';
  } catch (err) {
    if (signal?.aborted) return 'done';
    console.error('Failed to pull data from cloud', err);
    return 'done';
  }
}

async function pushCloudData(
  applications: JobApplication[],
  opportunities: JobOpportunity[],
  networking: NetworkingWorkspace,
  signal?: AbortSignal,
): Promise<void> {
  try {
    await fetch('/api/sync/applications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(applications),
      signal,
    });

    await fetch('/api/sync/opportunities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(opportunities),
      signal,
    });

    // Networking CRM leg: same owner-scoped replace contract as the other
    // sync legs. The backend derives the owner from the session — the body
    // carries only the workspace payload.
    await fetch('/api/sync/networking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(networking),
      signal,
    });
  } catch (err) {
    if (signal?.aborted) return;
    console.error('Failed to push data to cloud', err);
  }
}

export function useCloudSync() {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuthStore();
  const setApplications = useApplicationsStore((state) => state.setApplications);
  const setOpportunities = useOpportunitiesStore((state) => state.setOpportunities);
  const {
    isSyncPaused,
    isConflictDetected,
    setConflict,
  } = useMergeStore();

  const pullTriggered = useRef(false);
  const syncInProgress = useRef(false);

  const wasAuthenticated = useRef(isAuthenticated);
  useEffect(() => {
    if (wasAuthenticated.current && !isAuthenticated) {
      resetInitialLoadDone();
      pullTriggered.current = false;
    }
    wasAuthenticated.current = isAuthenticated;
  }, [isAuthenticated]);

  // react-doctor-disable-next-line no-fetch-in-effect -- canonical rule waiver: one-shot initial sync pull with proper AbortController cleanup, in a project that has not adopted a data-fetching library (react-query/SWR), react-doctor/no-fetch-in-effect
  useEffect(() => {
    if (
      isAuthenticated &&
      !_initialLoadDone &&
      !pullTriggered.current &&
      !isAuthLoading &&
      !isConflictDetected &&
      !isSyncPaused
    ) {
      pullTriggered.current = true;
      const controller = new AbortController();
      void pullCloudData(setApplications, setOpportunities, setConflict, controller.signal).then((result) => {
        // If cleanup aborted this pull (StrictMode double-mount in dev, or a
        // genuine unmount), don't mark the initial load done — release the
        // guard so a future effect run performs the pull instead of silently
        // skipping cloud data.
        if (controller.signal.aborted) {
          pullTriggered.current = false;
          return;
        }
        if (result === 'conflict') {
          pullTriggered.current = false;
        } else {
          _initialLoadDone = true;
        }
      });
      return () => controller.abort();
    }
    return undefined;
  }, [isAuthenticated, isAuthLoading, isConflictDetected, isSyncPaused, setApplications, setOpportunities, setConflict]);

  // react-doctor-disable-next-line no-fetch-in-effect -- canonical rule waiver: debounced event-driven sync push with AbortController cleanup, in a project that has not adopted a data-fetching library (react-query/SWR), react-doctor/no-fetch-in-effect
  useEffect(() => {
    if (!isAuthenticated || isSyncPaused) return;

    // M5-style event-driven push: instead of subscribing to store state
    // (which misses bypass writes that don't go through the Zustand
    // store), we listen to the same CustomEvents the write funnel
    // (`saveApplications` / `saveOpportunities` / `saveNetworkingWorkspace`)
    // dispatches. The 2s debounce is preserved: rapid events reset the timer
    // so only the last one fires the network push (batch imports, form
    // updates). Listeners subscribe unconditionally — the `_initialLoadDone`
    // guard is checked at FIRE time, because that module flag flips
    // asynchronously after the one-shot pull completes and an effect-level
    // guard would never re-run to pick it up.
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const controller = new AbortController();

    const schedulePush = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        if (!_initialLoadDone || syncInProgress.current) return;
        syncInProgress.current = true;
        // Read latest store state at push time (not at effect time) so the
        // push payload reflects any writes that happened during the 2s
        // debounce window, including the event that triggered this push.
        const apps = useApplicationsStore.getState().applications;
        const opps = useOpportunitiesStore.getState().opportunities;
        // Read the networking workspace at push time too — same rationale:
        // the payload must reflect writes that happened during the debounce
        // window, including the `jobNetworkingUpdated` event that may have
        // triggered this push.
        const networking = useNetworkingStore.getState().workspaceSnapshot();
        void pushCloudData(apps, opps, networking, controller.signal).finally(() => {
          syncInProgress.current = false;
        });
      }, 2000);
    };

    window.addEventListener('jobApplicationsUpdated', schedulePush);
    window.addEventListener('jobOpportunitiesUpdated', schedulePush);
    // Networking CRM leg of the M5-style event-driven push: the write funnel
    // (`saveNetworkingWorkspace`) dispatches this same-tab custom event on
    // every workspace write, so bypass writes (extension content scripts,
    // manual localStorage writes) are covered automatically.
    window.addEventListener('jobNetworkingUpdated', schedulePush);

    return () => {
      window.removeEventListener('jobApplicationsUpdated', schedulePush);
      window.removeEventListener('jobOpportunitiesUpdated', schedulePush);
      window.removeEventListener('jobNetworkingUpdated', schedulePush);
      if (debounceTimer) clearTimeout(debounceTimer);
      // Aborting an in-flight push on cleanup (e.g. logout mid-debounce) drops
      // that queued write rather than delivering it — deliberate: the session
      // cookie is already gone, so the server would reject it anyway.
      controller.abort();
    };
  }, [isAuthenticated, isSyncPaused]);

  return { isSyncing: syncInProgress.current };
}
