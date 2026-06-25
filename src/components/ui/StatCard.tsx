import * as React from 'react';
import { cn } from '@/lib/utils';

type StatCardVariant = 'default' | 'sage' | 'terracotta' | 'muted';

interface StatCardProps {
  title: string;
  value: string | number;
  variant?: StatCardVariant;
  isLarge?: boolean;
  description?: string;
  className?: string;
}

const variantStyles: Record<StatCardVariant, { text: string; value: string }> = {
  default: {
    text: 'text-muted-foreground',
    value: 'text-foreground',
  },
  sage: {
    text: 'text-primary',
    value: 'text-primary dark:text-primary-foreground',
  },
  terracotta: {
    text: 'text-destructive',
    value: 'text-destructive dark:text-destructive-foreground',
  },
  muted: {
    text: 'text-muted-foreground',
    value: 'text-foreground',
  },
};

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  variant = 'default',
  isLarge = false,
  description,
  className = '',
}) => {
  const styles = variantStyles[variant];

  return (
    <div
      className={cn(
        'group relative',
        isLarge ? 'col-span-2' : '',
        className
      )}
    >
      <p
        className={cn(
          'font-medium tracking-[0.15em] uppercase',
          isLarge ? 'text-xs md:text-sm' : 'text-[11px]',
          styles.text
        )}
      >
        {title}
      </p>
      <p
        className={cn(
          'font-serif font-bold leading-none tracking-tight tabular-nums',
          isLarge
            ? 'text-6xl sm:text-7xl md:text-8xl mt-2'
            : 'text-4xl sm:text-5xl mt-1.5',
          styles.value
        )}
      >
        {value}
      </p>
      {description && (
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  );
};

export { StatCard };
