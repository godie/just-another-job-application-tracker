import React, { useMemo, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { type JobApplication } from '../types/applications';
import { StatCard } from './ui/StatCard';

interface MetricsSummaryProps {
  applications: JobApplication[];
}

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
    <section className='grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-8 sm:gap-x-10 sm:gap-y-10 mb-14' data-testid='metrics-summary'>
      <StatCard
        title={t('home.metrics.applications')}
        value={applications.length}
        variant="default"
        isLarge
      />

      <StatCard
        title={t('home.metrics.interviews')}
        value={interviews}
        variant="terracotta"
      />

      <StatCard
        title={t('home.metrics.offers')}
        value={offers}
        variant="sage"
      />
    </section>
  );
};

MetricsSummary.displayName = 'MetricsSummary';

export default memo(MetricsSummary);
