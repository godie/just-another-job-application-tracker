// src/pages/InsightsPage.tsx
import React, { lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { useSEO } from '../seo';
import { useInsightsData } from '../hooks/useInsightsData';
import { PageHeader, StatCard } from '../components/ui';

import { type PageType } from '../App';

const StatusBarChart = lazy(() => import('../components/StatusBarChart'));
const InterviewBarChart = lazy(() => import('../components/InterviewBarChart'));

interface InsightsPageProps {
  onNavigate?: (page: PageType) => void;
}

const InsightsPage: React.FC<InsightsPageProps> = ({ onNavigate }) => {
  const { t } = useTranslation();

  useSEO({
    title: t('seo.insights.title'),
    description: t('seo.insights.description'),
  });

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
    <div className='max-w-7xl mx-auto px-6 lg:px-8 py-8'>
      {/* ── HERO ZONE ── Header + CTA ── */}
      <PageHeader
        category="Analytics"
        title={t('insights.title')}
        description="Track your job search progress and understand where to focus your energy."
        actionLabel={onNavigate ? t('home.addEntry') : undefined}
        onAction={onNavigate ? () => onNavigate('applications') : undefined}
      />

      {/* ── METRICS ── Asymmetric layout: Total Applications dominant, 3 compact secondary ── */}
      <section aria-labelledby='stats-heading' className='mb-16'>
        <h2 id='stats-heading' className='sr-only'>Application Statistics</h2>
        <div className='grid grid-cols-2 sm:grid-cols-4 gap-4'>
          <StatCard
            title={t('insights.totalApplications')}
            value={totalApplications}
            variant="earth"
            isLarge
          />

          <StatCard
            title={t('insights.totalInterviews')}
            value={totalInterviews}
            variant="sage"
          />

          <StatCard
            title={t('insights.rejectedApplications')}
            value={rejectedApplicationsCount}
            variant="earth-muted"
            description={`${rejectionPercentage} ${t('insights.rejectionRate', 'rate')}`}
          />
        </div>
      </section>

      {/* ── CHARTS ── Lazy-loaded visualization ── */}
      <Suspense fallback={
        <div className='h-[300px] flex items-center justify-center bg-earth-100 dark:bg-earth-800 border border-earth-200 dark:border-earth-700'>
          <div className='flex items-center gap-3 text-earth-500 dark:text-earth-400'>
            <svg className='animate-spin size-5 text-earth-500 dark:text-earth-400' viewBox='0 0 24 24' fill='none'>
              <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4' />
              <path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z' />
            </svg>
            <span>{t('common.loading')}</span>
          </div>
        </div>
      }>
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12'>
          <StatusBarChart data={statusChartData} />
          <InterviewBarChart 
            data={interviewChartData}
            title={t('insights.interviewsByStatus')}
          />
        </div>

        {interviewTypeChartData.length > 0 && (
          <div className='mb-12'>
            <InterviewBarChart
              data={interviewTypeChartData}
              title={t('insights.interviewsByType')}
            />
          </div>
        )}
      </Suspense>

      {/* ── FOOTER ── Organic message ── */}
      <footer className='pt-8 border-t border-earth-200 dark:border-earth-700'>
        <div className='flex items-center gap-4 text-earth-500 dark:text-earth-400'>
          <div className='size-8 bg-sage-100 dark:bg-sage-900 rounded flex items-center justify-center'>
            <svg className='size-4 text-sage-600 dark:text-sage-300' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={1.5} d='M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' />
            </svg>
          </div>
          <p className='text-sm'>
            Every application is a step forward. Keep tracking, keep improving.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default InsightsPage;
