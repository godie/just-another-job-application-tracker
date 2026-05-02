// src/pages/InsightsPage.tsx
import React, { lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { useInsightsData } from '../hooks/useInsightsData';

import { type PageType } from '../App';

const StatusBarChart = lazy(() => import('../components/StatusBarChart'));
const InterviewBarChart = lazy(() => import('../components/InterviewBarChart'));

interface InsightsPageProps {
  onNavigate?: (page: PageType) => void;
}

const InsightsPage: React.FC<InsightsPageProps> = ({ onNavigate }) => {
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
    <div className='max-w-7xl mx-auto px-6 lg:px-8 py-8'>
      {/* ── HERO ZONE ── Header + CTA ── */}
      <header className='mb-10'>
        <div className='flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6'>
          <div className='flex-1'>
            <div className='flex items-center gap-3 mb-4'>
              <div className='w-10 h-0.5 bg-sage-500'></div>
              <span className='text-sage-600 dark:text-sage-400 text-sm font-medium tracking-wider uppercase'>
                Analytics
              </span>
            </div>
            <h1 className='font-serif text-4xl md:text-5xl font-bold text-earth-900 dark:text-earth-50'>
              {t('insights.title')}
            </h1>
            <p className='mt-3 text-base text-earth-600 dark:text-earth-300 max-w-2xl'>
              Track your job search progress and understand where to focus your energy.
            </p>
          </div>
          {onNavigate && (
            <button 
              className='self-start sm:self-auto bg-terracotta-600 hover:bg-terracotta-700 active:bg-terracotta-800 text-white font-bold py-4 px-8 rounded transition-colors border border-terracotta-700 hover:border-terracotta-800 text-base shadow-sm hover:shadow-md'
              onClick={() => onNavigate('applications')}
            >
              {t('home.addEntry')}
            </button>
          )}
        </div>
      </header>

      {/* ── METRICS ── Asymmetric layout: Total Applications dominant, 3 compact secondary ── */}
      <section aria-labelledby='stats-heading' className='mb-16'>
        <h2 id='stats-heading' className='sr-only'>Application Statistics</h2>
        <div className='grid grid-cols-2 sm:grid-cols-4 gap-4'>
          {/* Dominant metric: Total Applications — spans 2 columns */}
          <div className='col-span-2 bg-earth-50 dark:bg-earth-800 p-6 border-l-4 border-earth-400 dark:border-earth-500 transition-colors duration-300'>
            <p className='text-sm font-medium text-earth-500 dark:text-earth-400 tracking-wide uppercase'>
              {t('insights.totalApplications')}
            </p>
            <p className='mt-2 font-serif text-5xl sm:text-6xl font-bold text-earth-900 dark:text-earth-50 leading-none'>
              {totalApplications}
            </p>
          </div>

          {/* Compact metric: Total Interviews */}
          <div className='bg-sage-50 dark:bg-sage-900/30 p-5 border-l-4 border-sage-400 dark:border-sage-600 transition-colors duration-300'>
            <p className='text-xs font-medium text-sage-600 dark:text-sage-400 tracking-wide uppercase'>
              {t('insights.totalInterviews')}
            </p>
            <p className='mt-1 font-serif text-3xl font-bold text-sage-800 dark:text-sage-100'>
              {totalInterviews}
            </p>
          </div>

          {/* Compact metric: Rejected — earth-dark to reserve terracotta for CTAs */}
          <div className='bg-earth-100 dark:bg-earth-700/50 p-5 border-l-4 border-earth-500 dark:border-earth-500 transition-colors duration-300'>
            <p className='text-xs font-medium text-earth-600 dark:text-earth-300 tracking-wide uppercase'>
              {t('insights.rejectedApplications')}
            </p>
            <p className='mt-1 font-serif text-3xl font-bold text-earth-800 dark:text-earth-100'>
              {rejectedApplicationsCount}
            </p>
            <p className='mt-0.5 text-xs text-earth-500 dark:text-earth-400'>
              {rejectionPercentage} {t('insights.rejectionRate', 'rate')}
            </p>
          </div>
        </div>
      </section>

      {/* ── CHARTS ── Lazy-loaded visualization ── */}
      <Suspense fallback={
        <div className='h-[300px] flex items-center justify-center bg-earth-100 dark:bg-earth-800 border border-earth-200 dark:border-earth-700'>
          <div className='flex items-center gap-3 text-earth-500 dark:text-earth-400'>
            <svg className='animate-spin h-5 w-5 text-earth-500 dark:text-earth-400' viewBox='0 0 24 24' fill='none'>
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
          <div className='w-8 h-8 bg-sage-100 dark:bg-sage-900 rounded flex items-center justify-center'>
            <svg className='w-4 h-4 text-sage-600 dark:text-sage-300' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
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
