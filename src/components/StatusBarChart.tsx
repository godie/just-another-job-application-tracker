// src/components/StatusBarChart.tsx
import React, { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';
import ChartContainer, { ChartTooltip } from './ChartContainer';

interface StatusBarChartProps {
  data: { name: string; value: number }[];
}

const StatusBarChart: React.FC<StatusBarChartProps> = ({ data }) => {
  const { t } = useTranslation();
  const chartData = data.map(item => ({
    ...item,
    name: t(`statuses.${item.name.toLowerCase()}`, item.name),
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderTooltip = (props: any) => {
    const { active, payload } = props as { active?: boolean; payload?: ReadonlyArray<{ payload: { name: string; value: number } }> };
    if (active && payload && payload.length) {
      return (
        <ChartTooltip 
          name={payload[0].payload.name} 
          value={payload[0].payload.value} 
          unit='applications'
          accentColor='sage'
        />
      );
    }
    return null;
  };

  return (
    <ChartContainer 
      title={t('insights.applicationsByStatus')}
      accentColor='sage'
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
            fill='#7a947a' // sage-400
            radius={[2, 2, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
};

StatusBarChart.displayName = 'StatusBarChart';

export default memo(StatusBarChart);