// src/components/InterviewBarChart.tsx
import React, { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';
import ChartContainer, { ChartTooltip } from './ChartContainer';

interface InterviewBarChartProps {
  data: { name: string; value: number }[];
  title?: string;
}

const InterviewBarChart: React.FC<InterviewBarChartProps> = ({ data, title }) => {
  const { t } = useTranslation();

  // Only map status names when showing interviews by application status
  // We check against the English keys to determine if we should map
  const shouldMapStatus = title === t('insights.interviewsByStatus');
  
  const chartData = data.map(item => ({
    ...item,
    name: shouldMapStatus ? t(`statuses.${item.name.toLowerCase()}`, item.name) : item.name,
  }));

  const chartTitle = title || t('insights.interviewsByType');
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderTooltip = (props: any) => {
    const { active, payload } = props as { active?: boolean; payload?: ReadonlyArray<{ payload: { name: string; value: number } }> };
    if (active && payload && payload.length) {
      return (
        <ChartTooltip 
          name={payload[0].payload.name} 
          value={payload[0].payload.value} 
          unit='interviews'
          accentColor='terracotta'
        />
      );
    }
    return null;
  };

  return (
    <ChartContainer 
      title={chartTitle}
      accentColor='terracotta'
    >
      <ResponsiveContainer width='100%' height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray='3 3' stroke='currentColor' opacity={0.1} />
          <XAxis 
            dataKey='name' 
            tick={{ fill: 'currentColor', fontSize: 12 }}
            axisLine={{ stroke: 'currentColor', opacity: 0.2 }}
          />
          <YAxis 
            tick={{ fill: 'currentColor', fontSize: 12 }}
            axisLine={{ stroke: 'currentColor', opacity: 0.2 }}
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: '4px',
              fontSize: '12px',
            }}
            content={renderTooltip}
          />
          <Legend wrapperStyle={{ fontSize: '12px' }} />
          <Bar 
            dataKey='value' 
            fill='#ec8567' // terracotta-400
            radius={[2, 2, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
};

InterviewBarChart.displayName = 'InterviewBarChart';

export default memo(InterviewBarChart);