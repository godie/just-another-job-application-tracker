import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useApplicationsStore } from '../stores/applicationsStore';
import { INTERVIEW_TYPES } from '../utils/constants';

/**
 * Custom hook to calculate application and interview metrics for the Insights page.
 *
 * ⚡ Bolt: Uses "loop fusion" and centralized formatting to process applications
 * in a single pass and prepare chart data once, minimizing re-renders and
 * redundant computations in child components.
 */
export const useInsightsData = () => {
  const { t } = useTranslation();
  const applications = useApplicationsStore((state) => state.applications);

  const data = useMemo(() => {
    const statusMap: Record<string, number> = {};
    const interviewStatusMap: Record<string, number> = {};
    const interviewTypeMap: Record<string, number> = {};
    let rejectedCount = 0;
    let totalInterviews = 0;

    // ⚡ Bolt: Single pass iteration (Loop Fusion)
    applications.forEach(app => {
      const status = app.status.toLowerCase();

      // 1. Status metrics
      statusMap[status] = (statusMap[status] || 0) + 1;
      if (status === 'rejected') rejectedCount++;

      // 2. Interview metrics from timeline
      if (app.timeline && app.timeline.length > 0) {
        let appInterviewCount = 0;

        app.timeline.forEach(event => {
          if (INTERVIEW_TYPES.has(event.type)) {
            // ⚡ Bolt: Use a counter instead of an array (totalInterviews) to save memory.
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

    // ⚡ Bolt: Pre-formatting chart data here avoids redundant translations and
    // mappings in chart components during every render cycle.
    const statusChartData = Object.keys(statusMap).map(key => ({
      name: t(`statuses.${key.toLowerCase()}`, key),
      value: statusMap[key],
    }));

    const interviewChartData = Object.keys(interviewStatusMap).map(key => ({
      name: t(`statuses.${key.toLowerCase()}`, key),
      value: interviewStatusMap[key],
    }));

    const interviewTypeChartData = Object.keys(interviewTypeMap)
      .map(key => ({
        name: t(`insights.interviewTypes.${key}`, key),
        value: interviewTypeMap[key],
      }))
      .sort((a, b) => b.value - a.value);

    const totalApplications = applications.length;
    const rejectionPercentage = totalApplications > 0
      ? ((rejectedCount / totalApplications) * 100).toFixed(2) + '%'
      : '0%';

    return {
      statusChartData,
      interviewChartData,
      interviewTypeChartData,
      rejectedApplicationsCount: rejectedCount,
      totalApplications,
      totalInterviews,
      rejectionPercentage
    };
  }, [applications, t]);

  return data;
};
