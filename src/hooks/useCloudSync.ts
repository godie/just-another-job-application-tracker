import { useEffect, useRef } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useApplicationsStore } from '../stores/applicationsStore';
import { useOpportunitiesStore } from '../stores/opportunitiesStore';
import { useMergeStore } from '../stores/mergeStore';
import type { JobApplication } from '../types/applications';
import type { JobOpportunity } from '../types/opportunities';
import type { MergeData } from '../utils/mergeData';

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
  setConflict: (local: MergeData, cloud: MergeData) => void
): Promise<'done' | 'conflict'> {
  try {
    const appRes = await fetch('/api/sync/applications');
    const appData = await appRes.json();
    const cloudApps = (appRes.ok && appData.success) ? appData.applications : [];

    const oppRes = await fetch('/api/sync/opportunities');
    const oppData = await oppRes.json();
    const cloudOpps = (oppRes.ok && oppData.success) ? oppData.opportunities : [];

    const localApps = useApplicationsStore.getState().applications;
    const localOpps = useOpportunitiesStore.getState().opportunities;

    const hasLocalData = localApps.length > 0 || localOpps.length > 0;
    const hasCloudData = cloudApps.length > 0 || cloudOpps.length > 0;

    if (hasLocalData && hasCloudData) {
      setConflict(
        { applications: [...localApps], opportunities: [...localOpps] },
        { applications: cloudApps, opportunities: cloudOpps }
      );
      return 'conflict';
    }

    if (cloudApps.length > 0) setApplications(cloudApps);
    if (cloudOpps.length > 0) setOpportunities(cloudOpps);
    return 'done';
  } catch (err) {
    console.error('Failed to pull data from cloud', err);
    return 'done';
  }
}

async function pushCloudData(
  applications: JobApplication[],
  opportunities: JobOpportunity[]
): Promise<void> {
  try {
    await fetch('/api/sync/applications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(applications),
    });

    await fetch('/api/sync/opportunities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
  const applications = useApplicationsStore((state) => state.applications);
  const opportunities = useOpportunitiesStore((state) => state.opportunities);
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
    if (isAuthenticated && _initialLoadDone && !syncInProgress.current && !isSyncPaused) {
      syncInProgress.current = true;
      const timer = setTimeout(() => {
        void pushCloudData(applications, opportunities).finally(() => {
          syncInProgress.current = false;
        });
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [applications, opportunities, isAuthenticated, isSyncPaused]);

  return { isSyncing: syncInProgress.current };
}
