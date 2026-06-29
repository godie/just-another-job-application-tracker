import React, { useMemo, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { type JobApplication } from '../types/applications';

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
    <section className='mb-14 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]' data-testid='metrics-summary'>
      <div className='bg-card border-l-2 border-earth-300 px-8 py-7'>
        <p className='text-sm font-semibold uppercase tracking-[0.12em] text-earth-500'>
          {t('home.metrics.applications')}
        </p>
        <p className='mt-4 font-serif text-7xl font-bold leading-none text-foreground sm:text-8xl'>
          {applications.length}
        </p>
      </div>

      <div className='bg-sage-50 border-l-2 border-primary/50 px-7 py-7'>
        <p className='text-sm font-semibold uppercase tracking-[0.12em] text-primary'>
          {t('home.metrics.interviews')}
        </p>
        <p className='mt-4 font-serif text-5xl font-bold leading-none text-primary sm:text-6xl'>
          {interviews}
        </p>
      </div>

      <div className='bg-card border-l-2 border-earth-300 px-7 py-7'>
        <p className='text-sm font-semibold uppercase tracking-[0.12em] text-earth-500'>
          {t('home.metrics.offers')}
        </p>
        <p className='mt-4 font-serif text-5xl font-bold leading-none text-foreground sm:text-6xl'>
          {offers}
        </p>
      </div>
    </section>
  );
};

MetricsSummary.displayName = 'MetricsSummary';

export default memo(MetricsSummary);
