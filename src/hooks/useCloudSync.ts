import { useEffect, useRef } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useApplicationsStore } from '../stores/applicationsStore';
import { useOpportunitiesStore } from '../stores/opportunitiesStore';

export function useCloudSync() {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuthStore();
  const { applications, setApplications } = useApplicationsStore();
  const { opportunities, setOpportunities } = useOpportunitiesStore();

  const initialLoadDone = useRef(false);
  const syncInProgress = useRef(false);

  // Pull data from cloud on login
  useEffect(() => {
    if (isAuthenticated && !initialLoadDone.current && !isAuthLoading) {
      const pullData = async () => {
        try {
          // Pull applications
          const appRes = await fetch('/api/sync/applications');
          const appData = await appRes.json();
          if (appRes.ok && appData.success && appData.applications.length > 0) {
            setApplications(appData.applications);
          }

          // Pull opportunities
          const oppRes = await fetch('/api/sync/opportunities');
          const oppData = await oppRes.json();
          if (oppRes.ok && oppData.success && oppData.opportunities.length > 0) {
            setOpportunities(oppData.opportunities);
          }

          initialLoadDone.current = true;
        } catch (err) {
          console.error('Failed to pull data from cloud', err);
        }
      };
      pullData();
    }
  }, [isAuthenticated, isAuthLoading, setApplications, setOpportunities]);

  // Push data to cloud on changes
  useEffect(() => {
    if (isAuthenticated && initialLoadDone.current && !syncInProgress.current) {
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
  }, [applications, opportunities, isAuthenticated]);

  return { isSyncing: syncInProgress.current };
}
