// src/pages/InsightsPage.tsx
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import StatCard from '../components/StatCard';
import StatusBarChart from '../components/StatusBarChart';
import InterviewBarChart from '../components/InterviewBarChart';
import { useApplicationsStore } from '../stores/applicationsStore';

/**
 * Interview event types for O(1) lookup
 */
const INTERVIEW_TYPES_SET = new Set([
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

  // ⚡ Bolt: Consolidated multiple passes into a single loop for O(N + E) complexity.
  // By pre-calculating all metrics in a single pass over applications and their timeline events,
  // we avoid redundant iterations (filter, flatMap, reduce) and improve performance,
  // especially as the user's data grows over time.
  const {
    totalApplications,
    totalInterviews,
    rejectedApplications,
    rejectionPercentage,
    statusChartData,
    interviewChartData,
    interviewTypeChartData
  } = useMemo(() => {
    const allEventsCount = { count: 0 };
    const statusMap: Record<string, number> = {};
    const intStatusMap: Record<string, number> = {};
    const intTypeMap: Record<string, number> = {};
    let rejected = 0;

    applications.forEach(app => {
      const status = app.status.toLowerCase();

      // Update status counts
      statusMap[status] = (statusMap[status] || 0) + 1;
      if (status === 'rejected') rejected++;

      // Process interview events in timeline
      const interviewEvents = (app.timeline || []).filter(event => INTERVIEW_TYPES_SET.has(event.type));
      if (interviewEvents.length > 0) {
        allEventsCount.count += interviewEvents.length;
        intStatusMap[status] = (intStatusMap[status] || 0) + interviewEvents.length;

        interviewEvents.forEach(event => {
          intTypeMap[event.type] = (intTypeMap[event.type] || 0) + 1;
        });
      }
    });

    const totalApps = applications.length;

    return {
      totalApplications: totalApps,
      totalInterviews: allEventsCount.count,
      rejectedApplications: rejected,
      rejectionPercentage: totalApps > 0 ? ((rejected / totalApps) * 100).toFixed(2) + '%' : '0%',
      statusChartData: Object.keys(statusMap).map(key => ({
        name: key,
        value: statusMap[key],
      })),
      interviewChartData: Object.keys(intStatusMap).map(key => ({
        name: key,
        value: intStatusMap[key],
      })),
      interviewTypeChartData: Object.keys(intTypeMap)
        .map(key => ({
          name: t(`insights.interviewTypes.${key}`, key),
          value: intTypeMap[key],
        }))
        .sort((a, b) => b.value - a.value)
    };
  }, [applications, t]);

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
