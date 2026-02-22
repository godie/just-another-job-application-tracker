import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useApplicationsStore } from '../stores/applicationsStore';
import { INTERVIEW_TYPES } from '../utils/constants';

/**
 * Custom hook to calculate application and interview metrics for the Insights page.
 *
 * ⚡ Bolt: Optimized with Loop Fusion and Memory Efficiency.
 * - Processes all metrics and chart data in a single pass over the applications list.
 * - Replaces large arrays with simple counters to minimize memory footprint.
 * - Pre-calculates and translates chart data labels to simplify UI components.
 */
export const useInsightsData = () => {
  const { t } = useTranslation();
  const applications = useApplicationsStore((state) => state.applications);

  return useMemo(() => {
    let totalInterviews = 0;
    let rejectedApplicationsCount = 0;
    const statusMap: Record<string, number> = {};
    const interviewStatusMap: Record<string, number> = {};
    const interviewTypeMap: Record<string, number> = {};

    applications.forEach(app => {
      // ⚡ Bolt: Normalize status to lowercase for consistent map keys
      const status = app.status.toLowerCase();

      // 1. Status metrics
      statusMap[status] = (statusMap[status] || 0) + 1;
      if (status === 'rejected') rejectedApplicationsCount++;

      // 2. Interview metrics from timeline
      if (app.timeline && app.timeline.length > 0) {
        let appInterviewCount = 0;

        app.timeline.forEach(event => {
          if (INTERVIEW_TYPES.has(event.type)) {
            // ⚡ Bolt: Using a counter instead of an array (totalInterviews) saves memory
            totalInterviews++;
            appInterviewCount++;

            // Track interview type frequency
            interviewTypeMap[event.type] = (interviewTypeMap[event.type] || 0) + 1;
          }
        });

        if (appInterviewCount > 0) {
          // Track total interview events by application status
          interviewStatusMap[status] = (interviewStatusMap[status] || 0) + appInterviewCount;
        }
      }
    });

    const totalApplications = applications.length;

    // ⚡ Bolt: Pre-calculate chart data with translations to avoid extra loops/logic in components.
    const statusChartData = Object.entries(statusMap).map(([key, value]) => ({
      name: t(`statuses.${key}`, key),
      value,
    }));

    const interviewChartData = Object.entries(interviewStatusMap).map(([key, value]) => ({
      name: t(`statuses.${key}`, key),
      value,
    }));

    const interviewTypeChartData = Object.entries(interviewTypeMap)
      .map(([key, value]) => ({
        name: t(`insights.interviewTypes.${key}`, key),
        value,
      }))
      .sort((a, b) => b.value - a.value);

    const rejectionPercentage = totalApplications > 0
      ? ((rejectedApplicationsCount / totalApplications) * 100).toFixed(2) + '%'
      : '0%';

    return {
      totalApplications,
      totalInterviews,
      rejectedApplicationsCount,
      rejectionPercentage,
      statusChartData,
      interviewChartData,
      interviewTypeChartData
    };
  }, [applications, t]);
};
