// src/pages/InsightsPage.tsx
import React from 'react';
import { useTranslation } from 'react-i18next';
import StatCard from '../components/StatCard';
import StatusBarChart from '../components/StatusBarChart';
import InterviewBarChart from '../components/InterviewBarChart';
import { useApplicationsStore } from '../stores/applicationsStore';
import type { InterviewEvent } from '../types/applications';

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

/**
 * Check if an event type is considered an interview event
 */
const isInterviewEvent = (eventType: string): boolean => {
  return INTERVIEW_TYPES.has(eventType);
};

const InsightsPage: React.FC = () => {
  const { t } = useTranslation();
  const applications = useApplicationsStore((state) => state.applications);

  // ⚡ Bolt: Consolidated multiple array traversals into a single loop using useMemo.
  // This reduces the complexity from multiple passes over the applications and their
  // timelines to a single pass, improving performance especially as the list grows.
  const {
    allInterviewEvents,
    rejectedApplications,
    statusData,
    interviewStatusData,
    interviewTypeData
  } = React.useMemo(() => {
    const allEvents: InterviewEvent[] = [];
    let rejectedCount = 0;
    const statusMap: Record<string, number> = {};
    const interviewStatusMap: Record<string, number> = {};
    const interviewTypeMap: Record<string, number> = {};

    applications.forEach(app => {
      const status = app.status.toLowerCase();

      // Count applications by status
      statusMap[status] = (statusMap[status] || 0) + 1;

      // Count rejected applications
      if (status === 'rejected') {
        rejectedCount++;
      }

      // Process interview events
      const interviewEvents = (app.timeline || []).filter(event => isInterviewEvent(event.type));
      if (interviewEvents.length > 0) {
        // Count interviews by application status
        interviewStatusMap[status] = (interviewStatusMap[status] || 0) + interviewEvents.length;

        interviewEvents.forEach(event => {
          allEvents.push(event);
          // Count interviews by type
          interviewTypeMap[event.type] = (interviewTypeMap[event.type] || 0) + 1;
        });
      }
    });

    return {
      allInterviewEvents: allEvents,
      rejectedApplications: rejectedCount,
      statusData: statusMap,
      interviewStatusData: interviewStatusMap,
      interviewTypeData: interviewTypeMap
    };
  }, [applications]);

  const totalInterviews = allInterviewEvents.length;
  const totalApplications = applications.length;
  const rejectionPercentage = totalApplications > 0
    ? ((rejectedApplications / totalApplications) * 100).toFixed(2) + '%'
    : '0%';

  // ⚡ Bolt: Memoized chart data objects to ensure stable prop references.
  // This prevents child components like StatusBarChart and InterviewBarChart
  // from re-rendering unless the underlying data or translation function changes.
  const statusChartData = React.useMemo(() =>
    Object.keys(statusData).map(key => ({
      name: key,
      value: statusData[key],
    })),
    [statusData]
  );

  const interviewChartData = React.useMemo(() =>
    Object.keys(interviewStatusData).map(key => ({
      name: key,
      value: interviewStatusData[key],
    })),
    [interviewStatusData]
  );

  const interviewTypeChartData = React.useMemo(() =>
    Object.keys(interviewTypeData)
      .map(key => ({
        name: t(`insights.interviewTypes.${key}`, key),
        value: interviewTypeData[key],
      }))
      .sort((a, b) => b.value - a.value),
    [interviewTypeData, t]
  );

  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">{t('insights.title')}</h1>
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 mb-8">
        <StatCard title={t('insights.totalApplications')} value={totalApplications} compact />
        <StatCard title={t('insights.totalInterviews')} value={totalInterviews} compact />
        <StatCard title={t('insights.rejectedApplications')} value={rejectedApplications} compact />
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
