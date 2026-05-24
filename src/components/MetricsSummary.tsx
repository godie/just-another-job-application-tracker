import React, { useMemo, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { type JobApplication } from '../types/applications';
import { StatCard } from './ui';

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
    <section className='grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-10' data-testid='metrics-summary'>
      <StatCard
        title={t('home.metrics.applications')}
        value={applications.length}
        variant="earth"
        isLarge
      />

      <StatCard
        title={t('home.metrics.interviews')}
        value={interviews}
        variant="sage"
      />

      <StatCard
        title={t('home.metrics.offers')}
        value={offers}
        variant="earth-muted"
      />
    </section>
  );
};

MetricsSummary.displayName = 'MetricsSummary';

export default memo(MetricsSummary);
