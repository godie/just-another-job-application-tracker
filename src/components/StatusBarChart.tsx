import React, { memo } from 'react';
import { useTranslation } from 'react-i18next';
import BarChartWidget from './BarChartWidget';

interface StatusBarChartProps {
  data: { name: string; value: number }[];
}

const StatusBarChart: React.FC<StatusBarChartProps> = ({ data }) => {
  const { t } = useTranslation();

  const formatName = (name: string) => t(`statuses.${name.toLowerCase()}`, name);

  return (
    <BarChartWidget
      title={t('insights.applicationsByStatus')}
      data={data}
      accentColor="sage"
      barFill="#7a947a"
      tooltipUnit="applications"
      formatName={formatName}
    />
  );
};

StatusBarChart.displayName = 'StatusBarChart';

export default memo(StatusBarChart);
