// src/pages/InsightsPage.tsx
import React from 'react';
import { useTranslation } from 'react-i18next';
import StatCard from '../components/StatCard';
import StatusBarChart from '../components/StatusBarChart';
import InterviewBarChart from '../components/InterviewBarChart';
import { useApplicationsStore } from '../stores/applicationsStore';

/**
 * Check if an event type is considered an interview event
 */
const isInterviewEvent = (eventType: string): boolean => {
  const interviewTypes = [
    'screener_call',
    'first_contact',
    'technical_interview',
    'code_challenge',
    'live_coding',
    'hiring_manager',
    'system_design',
    'cultural_fit',
    'final_round',
  ];
  return interviewTypes.includes(eventType);
};

const InsightsPage: React.FC = () => {
  const { t } = useTranslation();
  const applications = useApplicationsStore((state) => state.applications);

  // Get all interview events
  const allInterviewEvents = applications.flatMap(app => 
    (app.timeline || []).filter(event => isInterviewEvent(event.type))
  );

  const totalInterviews = allInterviewEvents.length;

  const rejectedApplications = applications.filter(app => app.status.toLowerCase() === 'rejected').length;
  const totalApplications = applications.length;
  const rejectionPercentage = totalApplications > 0 ? ((rejectedApplications / totalApplications) * 100).toFixed(2) + '%' : '0%';

  const statusData = applications.reduce((acc, app) => {
    const status = app.status.toLowerCase();
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const statusChartData = Object.keys(statusData).map(key => ({
    name: key,
    value: statusData[key],
  }));

  // Interviews by application status (the current chart)
  const interviewStatusData = applications.reduce((acc, app) => {
    const interviewEvents = (app.timeline || []).filter(event => isInterviewEvent(event.type));
    if (interviewEvents.length > 0) {
      const status = app.status.toLowerCase();
      acc[status] = (acc[status] || 0) + interviewEvents.length;
    }
    return acc;
  }, {} as Record<string, number>);

  const interviewChartData = Object.keys(interviewStatusData).map(key => ({
    name: key,
    value: interviewStatusData[key],
  }));

  // Interviews by type (new chart - more useful!)
  const interviewTypeData = allInterviewEvents.reduce((acc, event) => {
    const type = event.type;
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const interviewTypeChartData = Object.keys(interviewTypeData)
    .map(key => ({
      name: t(`insights.interviewTypes.${key}`, key),
      value: interviewTypeData[key],
    }))
    .sort((a, b) => b.value - a.value); // Sort by count descending

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
