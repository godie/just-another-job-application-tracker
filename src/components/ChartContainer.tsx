// src/components/ChartContainer.tsx
import React, { memo } from 'react';

type AccentColor = 'sage' | 'terracotta' | 'earth';

interface ChartContainerProps {
  title: string;
  accentColor?: AccentColor;
  children: React.ReactNode;
}

const accentColorMap: Record<AccentColor, { border: string; title: string; bg: string }> = {
  sage: {
    border: 'border-l-sage-500',
    title: 'text-sage-700 dark:text-sage-300',
    bg: 'bg-sage-50 dark:bg-sage-900/20',
  },
  terracotta: {
    border: 'border-l-terracotta-500',
    title: 'text-terracotta-700 dark:text-terracotta-300',
    bg: 'bg-terracotta-50 dark:bg-terracotta-900/20',
  },
  earth: {
    border: 'border-l-earth-500',
    title: 'text-earth-700 dark:text-earth-300',
    bg: 'bg-earth-50 dark:bg-earth-900/20',
  },
};

const ChartContainer: React.FC<ChartContainerProps> = ({ title, accentColor = 'sage', children }) => {
  const colors = accentColorMap[accentColor];

  return (
    <div className={`bg-white dark:bg-earth-800 border border-earth-200 dark:border-earth-700 border-l-2 ${colors.border} rounded-lg overflow-hidden`}>
      <div className={`px-6 py-4 ${colors.bg} border-b border-earth-200 dark:border-earth-700`}>
        <h3 className={`font-serif text-lg font-semibold ${colors.title}`}>{title}</h3>
      </div>
      <div className='p-6 text-earth-700 dark:text-earth-300'>
        {children}
      </div>
    </div>
  );
};

ChartContainer.displayName = 'ChartContainer';

interface ChartTooltipProps {
  name: string;
  value: number;
  unit: string;
  accentColor?: AccentColor;
}

const tooltipColorMap: Record<AccentColor, { accent: string; badge: string }> = {
  sage: {
    accent: 'text-sage-600 dark:text-sage-400',
    badge: 'bg-sage-100 dark:bg-sage-900/40 text-sage-700 dark:text-sage-300',
  },
  terracotta: {
    accent: 'text-terracotta-600 dark:text-terracotta-400',
    badge: 'bg-terracotta-100 dark:bg-terracotta-900/40 text-terracotta-700 dark:text-terracotta-300',
  },
  earth: {
    accent: 'text-earth-600 dark:text-earth-400',
    badge: 'bg-earth-100 dark:bg-earth-900/40 text-earth-700 dark:text-earth-300',
  },
};

export const ChartTooltip: React.FC<ChartTooltipProps> = ({ name, value, unit, accentColor = 'sage' }) => {
  const colors = tooltipColorMap[accentColor];

  return (
    <div className='bg-white dark:bg-earth-800 border border-earth-200 dark:border-earth-700 rounded-lg px-4 py-3 shadow-lg'>
      <p className={`text-sm font-semibold ${colors.accent}`}>{name}</p>
      <p className='text-lg font-bold text-earth-900 dark:text-earth-100 mt-1'>
        {value}{' '}
        <span className={`text-xs font-medium px-2 py-0.5 rounded ${colors.badge}`}>{unit}</span>
      </p>
    </div>
  );
};

ChartTooltip.displayName = 'ChartTooltip';

export default memo(ChartContainer);
