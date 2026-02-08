// src/components/InterviewBarChart.tsx
import React, { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';

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

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
      <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">{title}</h2>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="value" fill="#82ca9d" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

InterviewBarChart.displayName = 'InterviewBarChart';

export default memo(InterviewBarChart);
