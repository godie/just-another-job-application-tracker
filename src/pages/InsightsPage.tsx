// src/pages/InsightsPage.tsx
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import StatCard from '../components/StatCard';
import StatusBarChart from '../components/StatusBarChart';
import InterviewBarChart from '../components/InterviewBarChart';
import { useApplicationsStore } from '../stores/applicationsStore';

// ⚡ Bolt: Moved interview types to a Set outside the component.
// Using a Set provides O(1) lookup time compared to O(N) with an array's `includes`.
// Defining it outside the component ensures it's only created once.
const INTERVIEW_EVENT_TYPES = new Set([
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

  // ⚡ Bolt: Consolidated multiple array passes into a single loop using useMemo.
  // This refactoring reduces the computational complexity from multiple O(N) passes
  // (flatMap, filter, reduce) to a single O(N + E) pass, where N is applications
  // and E is the total number of timeline events. Memoizing the result also
  // prevents these expensive calculations from re-running on every render.
  const {
    totalApplications,
    totalInterviews,
    rejectedApplications,
    statusChartData,
    interviewChartData,
    interviewTypeChartData
  } = useMemo(() => {
    const statusData: Record<string, number> = {};
    const interviewStatusData: Record<string, number> = {};
    const interviewTypeData: Record<string, number> = {};
    let rejectedCount = 0;
    let interviewCount = 0;

    applications.forEach(app => {
      const status = app.status.toLowerCase();

      // Calculate status distribution
      statusData[status] = (statusData[status] || 0) + 1;

      if (status === 'rejected') {
        rejectedCount++;
      }

      // Calculate interview metrics in the same pass
      const interviewEvents = (app.timeline || []).filter(event => INTERVIEW_EVENT_TYPES.has(event.type));

      if (interviewEvents.length > 0) {
        interviewCount += interviewEvents.length;
        interviewStatusData[status] = (interviewStatusData[status] || 0) + interviewEvents.length;

        interviewEvents.forEach(event => {
          interviewTypeData[event.type] = (interviewTypeData[event.type] || 0) + 1;
        });
      }
    });

    // Format data for charts
    const sChartData = Object.entries(statusData).map(([name, value]) => ({ name, value }));
    const iChartData = Object.entries(interviewStatusData).map(([name, value]) => ({ name, value }));
    const tChartData = Object.entries(interviewTypeData)
      .map(([key, value]) => ({
        name: t(`insights.interviewTypes.${key}`, key),
        value,
      }))
      .sort((a, b) => b.value - a.value);

    return {
      totalApplications: applications.length,
      totalInterviews: interviewCount,
      rejectedApplications: rejectedCount,
      statusChartData: sChartData,
      interviewChartData: iChartData,
      interviewTypeChartData: tChartData
    };
  }, [applications, t]);

  const rejectionPercentage = totalApplications > 0
    ? ((rejectedApplications / totalApplications) * 100).toFixed(2) + '%'
    : '0%';

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
