import React, { memo } from 'react';
import { useTranslation } from 'react-i18next';
import BarChartWidget from './BarChartWidget';

interface InterviewBarChartProps {
  data: { name: string; value: number }[];
  title?: string;
}

const InterviewBarChart: React.FC<InterviewBarChartProps> = ({ data, title }) => {
  const { t } = useTranslation();

  const shouldMapStatus = title === t('insights.interviewsByStatus');
  const chartTitle = title || t('insights.interviewsByType');

  const formatName = (name: string) =>
    shouldMapStatus ? t(`statuses.${name.toLowerCase()}`, name) : name;

  return (
    <BarChartWidget
      title={chartTitle}
      data={data}
      accentColor="terracotta"
      barFill="#ec8567"
      tooltipUnit="interviews"
      formatName={formatName}
    />
  );
};

InterviewBarChart.displayName = 'InterviewBarChart';

export default memo(InterviewBarChart);
