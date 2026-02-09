// src/components/StatCard.tsx
import React, { memo } from 'react';
import { Card } from './ui';

interface StatCardProps {
  title: string;
  value: string | number;
  compact?: boolean; // For mobile-friendly compact version
}

const StatCard: React.FC<StatCardProps> = ({ title, value, compact = false }) => {
  if (compact) {
    return (
      <Card className="p-2 sm:p-4 shadow-none sm:shadow-md">
        <h2 className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 truncate">{title}</h2>
        <p className="mt-0.5 sm:mt-1 text-xl sm:text-3xl font-semibold text-gray-900 dark:text-white">{value}</p>
      </Card>
    );
  }

  return (
    <Card className="p-4 shadow-md">
      <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">{title}</h2>
      <p className="mt-1 text-3xl font-semibold text-gray-900 dark:text-white">{value}</p>
    </Card>
  );
};

StatCard.displayName = 'StatCard';

export default memo(StatCard);
