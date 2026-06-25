import React, { memo } from 'react';

type AccentColor = 'sage' | 'terracotta' | 'earth';

interface ChartContainerProps {
  title: string;
  accentColor?: AccentColor;
  children: React.ReactNode;
}

const accentColorMap: Record<AccentColor, { border: string; title: string; bg: string }> = {
  sage: {
    border: 'border-l-primary',
    title: 'text-primary',
    bg: 'bg-primary/5 dark:bg-primary/10',
  },
  terracotta: {
    border: 'border-l-destructive',
    title: 'text-destructive',
    bg: 'bg-destructive/5 dark:bg-destructive/10',
  },
  earth: {
    border: 'border-l-border',
    title: 'text-foreground',
    bg: 'bg-muted',
  },
};

const ChartContainer: React.FC<ChartContainerProps> = ({ title, accentColor = 'sage', children }) => {
  const colors = accentColorMap[accentColor];

  return (
    <div className={`bg-card border border-border border-l-2 ${colors.border} rounded-lg overflow-hidden`}>
      <div className={`px-6 py-4 ${colors.bg} border-b border-border`}>
        <h3 className={`font-serif text-lg font-semibold ${colors.title}`}>{title}</h3>
      </div>
      <div className='p-6 text-foreground'>
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
    accent: 'text-primary',
    badge: 'bg-primary/5 dark:bg-primary/10 text-primary',
  },
  terracotta: {
    accent: 'text-destructive',
    badge: 'bg-destructive/10 dark:bg-destructive/10 text-destructive',
  },
  earth: {
    accent: 'text-muted-foreground',
    badge: 'bg-muted text-foreground',
  },
};

export const ChartTooltip: React.FC<ChartTooltipProps> = ({ name, value, unit, accentColor = 'sage' }) => {
  const colors = tooltipColorMap[accentColor];

  return (
    <div className='bg-card border border-border rounded-lg px-4 py-3 shadow-lg'>
      <p className={`text-sm font-semibold ${colors.accent}`}>{name}</p>
      <p className='text-lg font-bold text-foreground mt-1'>
        {value}{' '}
        <span className={`text-xs font-medium px-2 py-0.5 rounded ${colors.badge}`}>{unit}</span>
      </p>
    </div>
  );
};

ChartTooltip.displayName = 'ChartTooltip';

export default memo(ChartContainer);
