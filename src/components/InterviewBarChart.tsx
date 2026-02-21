// src/components/InterviewBarChart.tsx
import React, { memo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';

interface InterviewBarChartProps {
  data: { name: string; value: number }[];
  title?: string;
}

/**
 * InterviewBarChart renders a bar chart for interview-related metrics.
 * ⚡ Bolt: Simplified by removing internal translation logic and fragile
 * title-based mapping, relying on pre-formatted data from the hook.
 */
const InterviewBarChart: React.FC<InterviewBarChartProps> = ({ data, title }) => {
  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
      {title && <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">{title}</h2>}
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
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
