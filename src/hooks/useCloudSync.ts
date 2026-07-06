import { useEffect, useRef } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useApplicationsStore } from '../stores/applicationsStore';
import { useOpportunitiesStore } from '../stores/opportunitiesStore';
import { useMergeStore } from '../stores/mergeStore';
import type { JobApplication } from '../types/applications';
import type { JobOpportunity } from '../types/opportunities';
import type { MergeData } from '../utils/mergeData';
import {
  parseApplicationsSyncResponse,
  parseOpportunitiesSyncResponse,
  safeJson,
} from '../utils/syncSchemas';

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
): Promise<'done' | 'conflict'> {
  try {
    // credentials: 'include' is REQUIRED on the pull side so the server can
    // identify the user and return only their data — without it the request is
    // unauthenticated and any session cookie is ignored. The previous version
    // omitted this flag, which was both broken and a tenant-isolation risk.
    const appRes = await fetch('/api/sync/applications', { credentials: 'include' });
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

    const oppRes = await fetch('/api/sync/opportunities', { credentials: 'include' });
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
    return 'done';
  } catch (err) {
    console.error('Failed to pull data from cloud', err);
    return 'done';
  }
}

async function pushCloudData(
  applications: JobApplication[],
  opportunities: JobOpportunity[],
): Promise<void> {
  try {
    await fetch('/api/sync/applications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(applications),
    });

    await fetch('/api/sync/opportunities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(opportunities),
    });
  } catch (err) {
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
      void pullCloudData(setApplications, setOpportunities, setConflict).then((result) => {
        if (result === 'conflict') {
          pullTriggered.current = false;
        } else {
          _initialLoadDone = true;
        }
      });
    }
  }, [isAuthenticated, isAuthLoading, isConflictDetected, isSyncPaused, setApplications, setOpportunities, setConflict]);

  useEffect(() => {
    if (!isAuthenticated || !_initialLoadDone || isSyncPaused) return;

    // M5-style event-driven push: instead of subscribing to store state
    // (which misses bypass writes that don't go through the Zustand
    // store), we listen to the same CustomEvents the write funnel
    // (`saveApplications` / `saveOpportunities`) dispatches. The 2s
    // debounce is preserved: rapid events reset the timer so only the
    // last one fires the network push (batch imports, form updates).
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const schedulePush = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        if (syncInProgress.current) return;
        syncInProgress.current = true;
        // Read latest store state at push time (not at effect time) so the
        // push payload reflects any writes that happened during the 2s
        // debounce window, including the event that triggered this push.
        const apps = useApplicationsStore.getState().applications;
        const opps = useOpportunitiesStore.getState().opportunities;
        void pushCloudData(apps, opps).finally(() => {
          syncInProgress.current = false;
        });
      }, 2000);
    };

    window.addEventListener('jobApplicationsUpdated', schedulePush);
    window.addEventListener('jobOpportunitiesUpdated', schedulePush);

    return () => {
      window.removeEventListener('jobApplicationsUpdated', schedulePush);
      window.removeEventListener('jobOpportunitiesUpdated', schedulePush);
      if (debounceTimer) clearTimeout(debounceTimer);
    };
  }, [isAuthenticated, isSyncPaused]);

  return { isSyncing: syncInProgress.current };
}
