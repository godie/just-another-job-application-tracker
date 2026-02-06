// src/pages/InsightsPage.tsx
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import StatCard from '../components/StatCard';
import StatusBarChart from '../components/StatusBarChart';
import InterviewBarChart from '../components/InterviewBarChart';
import { useApplicationsStore } from '../stores/applicationsStore';
import type { InterviewEvent } from '../types/applications';

/**
 * ⚡ Bolt: Use a Set for O(1) interview type lookups.
 * Moving this outside the component prevents it from being recreated on every render.
 */
const INTERVIEW_TYPES = new Set([
  'screener_call',
  'first_contact',
  'technical_interview',
  'code_challenge',
  'live_coding',
  'hiring_manager',
  'system_design',
  'cultural_fit',
  'final_round',
]);

const InsightsPage: React.FC = () => {
  const { t } = useTranslation();
  const applications = useApplicationsStore((state) => state.applications);

  // ⚡ Bolt: Single consolidated pass for metrics using "loop fusion".
  // This reduces computational complexity from O(N * M) to O(N + E), where N is the
  // number of applications and E is the total number of timeline events.
  // We use useMemo to ensure these expensive calculations only run when the
  // `applications` array reference actually changes.
  const {
    allInterviewEvents,
    statusData,
    interviewStatusData,
    interviewTypeData,
    rejectedApplicationsCount
  } = useMemo(() => {
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
      rejectedApplicationsCount: rejectedCount
    };
  }, [applications]);

  const totalInterviews = allInterviewEvents.length;
  const totalApplications = applications.length;
  const rejectionPercentage = totalApplications > 0
    ? ((rejectedApplicationsCount / totalApplications) * 100).toFixed(2) + '%'
    : '0%';

  // ⚡ Bolt: Memoize chart data to prevent unnecessary re-renders of chart components.
  const statusChartData = useMemo(() =>
    Object.keys(statusData).map(key => ({
      name: key,
      value: statusData[key],
    })), [statusData]);

  const interviewChartData = useMemo(() =>
    Object.keys(interviewStatusData).map(key => ({
      name: key,
      value: interviewStatusData[key],
    })), [interviewStatusData]);

  const interviewTypeChartData = useMemo(() =>
    Object.keys(interviewTypeData)
      .map(key => ({
        name: t(`insights.interviewTypes.${key}`, key),
        value: interviewTypeData[key],
      }))
      .sort((a, b) => b.value - a.value), [interviewTypeData, t]);

  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">{t('insights.title')}</h1>
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 mb-8">
        <StatCard title={t('insights.totalApplications')} value={totalApplications} compact />
        <StatCard title={t('insights.totalInterviews')} value={totalInterviews} compact />
        <StatCard title={t('insights.rejectedApplications')} value={rejectedApplicationsCount} compact />
        <StatCard title={t('insights.rejectionPercentage')} value={rejectionPercentage} compact />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <StatusBarChart data={statusChartData} />
        <InterviewBarChart 
          data={interviewChartData} 
          title={t('insights.interviewsByStatus')}
        />
      </div>
      {interviewTypeChartData.length > 0 && (
        <div className="mb-8">
          <InterviewBarChart 
            data={interviewTypeChartData} 
            title={t('insights.interviewsByType')}
          />
        </div>
      )}
    </div>
  );
};

export default InsightsPage;
