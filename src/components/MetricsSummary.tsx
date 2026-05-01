import React, { useMemo, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { type JobApplication } from '../types/applications';

interface MetricsSummaryProps {
  applications: JobApplication[];
}

/**
 * MetricsSummary component displays a summary of job application metrics.
 * Asymmetric layout: Applications is the dominant metric (2-col span),
 * Interviews and Offers are compact secondary metrics.
 */
const MetricsSummary: React.FC<MetricsSummaryProps> = ({ applications }) => {
  const { t } = useTranslation();

  const stats = useMemo(() => {
    return applications.reduce(
      (acc, app) => {
        if (app.interviewDate) {
          acc.interviews++;
        }
        if (app.status === 'Offer') {
          acc.offers++;
        }
        return acc;
      },
      { interviews: 0, offers: 0 }
    );
  }, [applications]);

  const interviews = stats.interviews;
  const offers = stats.offers;

  return (
    <section className='grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10' data-testid='metrics-summary'>
      {/* Dominant metric: Applications — spans 2 columns */}
      <div className='col-span-2 bg-earth-50 dark:bg-earth-800 p-6 border-l-4 border-earth-400 dark:border-earth-500 transition-colors duration-300'>
        <p className='text-sm font-medium text-earth-500 dark:text-earth-400 tracking-wide uppercase'>
          {t('home.metrics.applications')}
        </p>
        <p className='mt-2 font-serif text-5xl sm:text-6xl font-bold text-earth-900 dark:text-earth-50 leading-none'>
          {applications.length}
        </p>
      </div>

      {/* Compact metric: Interviews */}
      <div className='bg-sage-50 dark:bg-sage-900/30 p-5 border-l-4 border-sage-400 dark:border-sage-600 transition-colors duration-300'>
        <p className='text-xs font-medium text-sage-600 dark:text-sage-400 tracking-wide uppercase'>
          {t('home.metrics.interviews')}
        </p>
        <p className='mt-1 font-serif text-3xl font-bold text-sage-800 dark:text-sage-100'>
          {interviews}
        </p>
      </div>

      {/* Compact metric: Offers — using earth-dark to reserve terracotta for CTAs */}
      <div className='bg-earth-100 dark:bg-earth-700/50 p-5 border-l-4 border-earth-500 dark:border-earth-500 transition-colors duration-300'>
        <p className='text-xs font-medium text-earth-600 dark:text-earth-300 tracking-wide uppercase'>
          {t('home.metrics.offers')}
        </p>
        <p className='mt-1 font-serif text-3xl font-bold text-earth-800 dark:text-earth-100'>
          {offers}
        </p>
      </div>
    </section>
  );
};

MetricsSummary.displayName = 'MetricsSummary';

export default memo(MetricsSummary);
