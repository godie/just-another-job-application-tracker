// src/components/StatusBarChart.tsx
import React, { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';

interface StatusBarChartProps {
  data: { name: string; value: number }[];
}

const StatusBarChart: React.FC<StatusBarChartProps> = ({ data }) => {
  const { t } = useTranslation();
  const chartData = data.map(item => ({
    ...item,
    name: t(`statuses.${item.name.toLowerCase()}`, item.name),
  }));

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
      <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">{t('insights.applicationsByStatus')}</h2>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="value" fill="#8884d8" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

StatusBarChart.displayName = 'StatusBarChart';

export default memo(StatusBarChart);
