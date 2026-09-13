import React, { memo } from 'react';
import { useTranslation } from 'react-i18next';

interface InsightsMetricsSummaryProps {
  totalApplications: number;
  totalInterviews: number;
  rejectedApplicationsCount: number;
  rejectionPercentage: string;
}

export const InsightsMetricsSummary: React.FC<InsightsMetricsSummaryProps> = memo(({
  totalApplications,
  totalInterviews,
  rejectedApplicationsCount,
  rejectionPercentage,
}) => {
  const { t } = useTranslation();

  return (
    <section aria-labelledby='stats-heading' className='mb-16'>
      <h2 id='stats-heading' className='sr-only'>Application Statistics</h2>
      <div className='grid grid-cols-2 sm:grid-cols-4 gap-4'>
        {/* Dominant metric: Total Applications — spans 2 columns */}
        <div className='col-span-2 bg-muted p-6 border-l-2 border-border transition-colors duration-300'>
          <p className='text-sm font-medium text-muted-foreground tracking-wide uppercase'>
            {t('insights.totalApplications')}
          </p>
          <p className='mt-2 font-serif text-5xl sm:text-6xl font-bold text-foreground leading-none'>
            {totalApplications}
          </p>
        </div>

        {/* Compact metric: Total Interviews */}
        <div className='bg-primary/5 dark:bg-primary/10 p-5 border-l-2 border-primary/30 dark:border-primary transition-colors duration-300'>
          <p className='text-xs font-medium text-primary tracking-wide uppercase'>
            {t('insights.totalInterviews')}
          </p>
          <p className='mt-1 font-serif text-3xl font-bold text-primary dark:text-primary-foreground'>
            {totalInterviews}
          </p>
        </div>

        {/* Compact metric: Rejected */}
        <div className='bg-muted p-5 border-l-2 border-border transition-colors duration-300'>
          <p className='text-xs font-medium text-muted-foreground tracking-wide uppercase'>
            {t('insights.rejectedApplications')}
          </p>
          <p className='mt-1 font-serif text-3xl font-bold text-foreground'>
            {rejectedApplicationsCount}
          </p>
          <p className='mt-0.5 text-xs text-muted-foreground'>
            {rejectionPercentage} {t('insights.rejectionRate', 'rate')}
          </p>
        </div>
      </div>
    </section>
  );
});

InsightsMetricsSummary.displayName = 'InsightsMetricsSummary';
