// src/pages/InsightsPage.tsx
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import StatCard from '../components/StatCard';
import StatusBarChart from '../components/StatusBarChart';
import InterviewBarChart from '../components/InterviewBarChart';
import { useApplicationsStore } from '../stores/applicationsStore';

/**
 * ⚡ Bolt: Use a Set for O(1) lookups instead of an array.
 * This is used frequently during the metrics calculation pass.
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

  // ⚡ Bolt: Consolidate multiple passes over the applications array into a single
  // O(N + E) pass using loop fusion (where N is applications and E is total events).
  // This significantly improves performance for larger datasets and reduces memory
  // allocations from intermediate arrays (flatMap, filter, reduce).
  const {
    totalApplications,
    totalInterviews,
    rejectedApplications,
    statusChartData,
    interviewChartData,
    interviewTypeChartData,
  } = useMemo(() => {
    const statusMap: Record<string, number> = {};
    const interviewStatusMap: Record<string, number> = {};
    const interviewTypeMap: Record<string, number> = {};
    let rejectedCount = 0;
    let interviewsCount = 0;

    applications.forEach((app) => {
      const status = app.status.toLowerCase();

      // 1. Calculate status distribution
      statusMap[status] = (statusMap[status] || 0) + 1;

      // 2. Count rejected applications
      if (status === 'rejected') {
        rejectedCount++;
      }

      // 3. Process timeline events in a single sub-pass
      if (app.timeline && app.timeline.length > 0) {
        let appInterviews = 0;
        app.timeline.forEach((event) => {
          if (INTERVIEW_TYPES.has(event.type)) {
            appInterviews++;
            interviewsCount++;
            // 4. Calculate interview types distribution
            interviewTypeMap[event.type] = (interviewTypeMap[event.type] || 0) + 1;
          }
        });

        // 5. Calculate interviews by application status
        if (appInterviews > 0) {
          interviewStatusMap[status] = (interviewStatusMap[status] || 0) + appInterviews;
        }
      }
    });

    // Transform maps to chart data format
    const statusChartData = Object.keys(statusMap).map(key => ({
      name: key,
      value: statusMap[key],
    }));

    const interviewChartData = Object.keys(interviewStatusMap).map(key => ({
      name: key,
      value: interviewStatusMap[key],
    }));

    const interviewTypeChartData = Object.keys(interviewTypeMap)
      .map(key => ({
        name: t(`insights.interviewTypes.${key}`, key),
        value: interviewTypeMap[key],
      }))
      .sort((a, b) => b.value - a.value);

    return {
      totalApplications: applications.length,
      totalInterviews: interviewsCount,
      rejectedApplications: rejectedCount,
      statusChartData,
      interviewChartData,
      interviewTypeChartData,
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
