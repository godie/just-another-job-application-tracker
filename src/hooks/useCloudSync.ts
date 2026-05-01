import { useEffect, useRef } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useApplicationsStore } from '../stores/applicationsStore';
import { useOpportunitiesStore } from '../stores/opportunitiesStore';
import { useMergeStore } from '../stores/mergeStore';
import type { MergeData } from '../utils/mergeData';

/**
 * Flag to mark that initial cloud pull is done after merge resolution.
 * Accessed by MergePromptHandler after resolving a conflict.
 */
let _initialLoadDone = false;
export function markInitialLoadDone() {
  _initialLoadDone = true;
}
export function resetInitialLoadDone() {
  _initialLoadDone = false;
}

export function useCloudSync() {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuthStore();
  const setApplications = useApplicationsStore((state) => state.setApplications);
  const setOpportunities = useOpportunitiesStore((state) => state.setOpportunities);
  // Subscribe to data for push reactivity
  const applications = useApplicationsStore((state) => state.applications);
  const opportunities = useOpportunitiesStore((state) => state.opportunities);
  const {
    isSyncPaused,
    isConflictDetected,
    setConflict,
  } = useMergeStore();

  const pullTriggered = useRef(false);
  const syncInProgress = useRef(false);

  // Reset initial load state on logout so pull can fire again on re-login
  const wasAuthenticated = useRef(isAuthenticated);
  useEffect(() => {
    if (wasAuthenticated.current && !isAuthenticated) {
      resetInitialLoadDone();
      pullTriggered.current = false;
    }
    wasAuthenticated.current = isAuthenticated;
  }, [isAuthenticated]);

  // Pull data from cloud on login — detect conflict if local data exists
  useEffect(() => {
    if (isAuthenticated && !_initialLoadDone && !pullTriggered.current && !isAuthLoading && !isConflictDetected && !isSyncPaused) {
      pullTriggered.current = true;
      const pullData = async () => {
        try {
          // Fetch cloud data
          const appRes = await fetch('/api/sync/applications');
          const appData = await appRes.json();
          const cloudApps = (appRes.ok && appData.success) ? appData.applications : [];

          const oppRes = await fetch('/api/sync/opportunities');
          const oppData = await oppRes.json();
          const cloudOpps = (oppRes.ok && oppData.success) ? oppData.opportunities : [];

          // Read current local data from store (not from hook subscription)
          const localApps = useApplicationsStore.getState().applications;
          const localOpps = useOpportunitiesStore.getState().opportunities;

          // Check for conflict: local has data AND cloud has data
          const hasLocalData = localApps.length > 0 || localOpps.length > 0;
          const hasCloudData = cloudApps.length > 0 || cloudOpps.length > 0;

          if (hasLocalData && hasCloudData) {
            // Conflict detected — trigger merge prompt
            const localSnapshot: MergeData = {
              applications: [...localApps],
              opportunities: [...localOpps],
            };
            const cloudSnapshot: MergeData = {
              applications: cloudApps,
              opportunities: cloudOpps,
            };
            setConflict(localSnapshot, cloudSnapshot);
            // Reset pullTriggered so it can re-run after merge is resolved
            pullTriggered.current = false;
            return;
          }

          // No conflict: apply cloud data (or empty) as before
          if (cloudApps.length > 0) {
            setApplications(cloudApps);
          }
          if (cloudOpps.length > 0) {
            setOpportunities(cloudOpps);
          }

          _initialLoadDone = true;
        } catch (err) {
          console.error('Failed to pull data from cloud', err);
          _initialLoadDone = true; // Allow push to work later
        }
      };
      pullData();
    }
  }, [isAuthenticated, isAuthLoading, isConflictDetected, isSyncPaused, setApplications, setOpportunities, setConflict]);

  // Push data to cloud on changes (only if sync is not paused)
  useEffect(() => {
    if (isAuthenticated && _initialLoadDone && !syncInProgress.current && !isSyncPaused) {
      const pushData = async () => {
        syncInProgress.current = true;
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
        } finally {
          syncInProgress.current = false;
        }
      };

      // Debounce push
      const timer = setTimeout(pushData, 2000);
      return () => clearTimeout(timer);
    }
  }, [applications, opportunities, isAuthenticated, isSyncPaused]);

  return { isSyncing: syncInProgress.current };
}
