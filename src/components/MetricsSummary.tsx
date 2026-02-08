import React, { useMemo, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { type JobApplication } from '../types/applications';

interface MetricsSummaryProps {
  applications: JobApplication[];
}

/**
 * MetricsSummary component displays a summary of job application metrics.
 * It is memoized to prevent unnecessary re-renders when applications change
 * but the derived metrics remain the same.
 */
const MetricsSummary: React.FC<MetricsSummaryProps> = ({ applications }) => {
  const { t } = useTranslation();

  // ⚡ Bolt: Separated stat calculation from metric array creation.
  // By memoizing the aggregated stats object first, we can use its primitive
  // values (interviews, offers) as dependencies for the final metrics array.
  // This prevents the metrics array from being recalculated when the
  // `applications` array reference changes but the actual numbers haven't,
  // making the memoization more precise and effective.
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

  const metrics = useMemo(() => {
    return [
      { label: t('home.metrics.applications'), value: applications.length, color: 'border-blue-500' },
      { label: t('home.metrics.interviews'), value: stats.interviews, color: 'border-yellow-500' },
      { label: t('home.metrics.offers'), value: stats.offers, color: 'border-green-500' },
    ];
  }, [applications.length, stats.interviews, stats.offers, t]);

  return (
    <section className="grid grid-cols-3 gap-2 sm:gap-4 my-8" data-testid="metrics-summary">
      {metrics.map((metric) => (
        <div
          key={metric.label}
          className={`bg-white dark:bg-gray-800 p-2 sm:p-6 rounded-lg sm:rounded-xl shadow sm:shadow-lg border-l-4 ${metric.color} transition duration-300 hover:shadow-lg sm:hover:shadow-xl`}
        >
          <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">{metric.label}</p>
          <p className="mt-0.5 sm:mt-1 text-xl sm:text-4xl font-extrabold text-gray-900 dark:text-white">{metric.value}</p>
        </div>
      ))}
    </section>
  );
};

MetricsSummary.displayName = 'MetricsSummary';

export default memo(MetricsSummary);
