// src/components/StatusBarChart.tsx
import React, { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';

interface StatusBarChartProps {
  data: { name: string; value: number }[];
}

/**
 * ⚡ Bolt: Simplified Presenter Component.
 * - Removed redundant data mapping and translations as they are now pre-calculated in useInsightsData.
 * - This reduces CPU cycles during re-renders and keeps the component focused on presentation.
 */
const StatusBarChart: React.FC<StatusBarChartProps> = ({ data }) => {
  const { t } = useTranslation();

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
      <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">{t('insights.applicationsByStatus')}</h2>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
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
