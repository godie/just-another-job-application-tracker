// src/pages/InsightsPage.tsx
import React from 'react';
import { useTranslation } from 'react-i18next';
import StatCard from '../components/StatCard';
import StatusBarChart from '../components/StatusBarChart';
import InterviewBarChart from '../components/InterviewBarChart';
import { useInsightsData } from '../hooks/useInsightsData';

const InsightsPage: React.FC = () => {
  const { t } = useTranslation();
  const {
    totalApplications,
    totalInterviews,
    rejectedApplicationsCount,
    rejectionPercentage,
    statusChartData,
    interviewChartData,
    interviewTypeChartData
  } = useInsightsData();

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
