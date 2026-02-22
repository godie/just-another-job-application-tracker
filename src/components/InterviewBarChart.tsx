// src/components/InterviewBarChart.tsx
import React, { memo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';

interface InterviewBarChartProps {
  data: { name: string; value: number }[];
  title?: string;
}

/**
 * ⚡ Bolt: Simplified Presenter Component.
 * - Removed redundant data mapping, translations, and complex title-based conditional logic.
 * - Data labels are now pre-calculated in the useInsightsData hook for better performance.
 */
const InterviewBarChart: React.FC<InterviewBarChartProps> = ({ data, title }) => {
  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
      <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">{title}</h2>
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
