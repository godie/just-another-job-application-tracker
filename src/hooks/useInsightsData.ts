import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useApplicationsStore } from '../stores/applicationsStore';
import { INTERVIEW_TYPES } from '../utils/constants';
import type { InterviewEvent } from '../types/applications';

/**
 * Custom hook to calculate application and interview metrics for the Insights page.
 *
 * Uses "loop fusion" to process applications in a single pass for efficiency.
 * Returns both raw metrics and formatted data for charts.
 */
export const useInsightsData = () => {
  const { t } = useTranslation();
  const applications = useApplicationsStore((state) => state.applications);

  const metrics = useMemo(() => {
    const interviewEvents: InterviewEvent[] = [];
    const statusMap: Record<string, number> = {};
    const interviewStatusMap: Record<string, number> = {};
    const interviewTypeMap: Record<string, number> = {};
    let rejectedCount = 0;

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
            interviewEvents.push(event);
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

    return {
      allInterviewEvents: interviewEvents,
      statusData: statusMap,
      interviewStatusData: interviewStatusMap,
      interviewTypeData: interviewTypeMap,
      rejectedApplicationsCount: rejectedCount,
      totalApplications: applications.length
    };
  }, [applications]);

  // Memoize chart data to prevent unnecessary re-renders of chart components.
  const statusChartData = useMemo(() =>
    Object.keys(metrics.statusData).map(key => ({
      name: key,
      value: metrics.statusData[key],
    })), [metrics.statusData]);

  const interviewChartData = useMemo(() =>
    Object.keys(metrics.interviewStatusData).map(key => ({
      name: key,
      value: metrics.interviewStatusData[key],
    })), [metrics.interviewStatusData]);

  const interviewTypeChartData = useMemo(() =>
    Object.keys(metrics.interviewTypeData)
      .map(key => ({
        name: t(`insights.interviewTypes.${key}`, key),
        value: metrics.interviewTypeData[key],
      }))
      .sort((a, b) => b.value - a.value), [metrics.interviewTypeData, t]);

  const rejectionPercentage = metrics.totalApplications > 0
    ? ((metrics.rejectedApplicationsCount / metrics.totalApplications) * 100).toFixed(2) + '%'
    : '0%';

  return {
    ...metrics,
    statusChartData,
    interviewChartData,
    interviewTypeChartData,
    rejectionPercentage,
    totalInterviews: metrics.allInterviewEvents.length
  };
};
