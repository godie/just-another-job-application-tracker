import React from 'react';

type StatCardVariant = 'earth' | 'sage' | 'earth-muted';

interface StatCardProps {
  title: string;
  value: string | number;
  variant?: StatCardVariant;
  isLarge?: boolean;
  description?: string;
  className?: string;
}

const variantStyles: Record<StatCardVariant, string> = {
  earth: 'bg-earth-50 dark:bg-earth-800 border-earth-400 dark:border-earth-500',
  sage: 'bg-sage-50 dark:bg-sage-900/30 border-sage-400 dark:border-sage-600',
  'earth-muted': 'bg-earth-100 dark:bg-earth-700/50 border-earth-500 dark:border-earth-500',
};

const titleStyles: Record<StatCardVariant, string> = {
  earth: 'text-earth-500 dark:text-earth-400',
  sage: 'text-sage-600 dark:text-sage-400',
  'earth-muted': 'text-earth-600 dark:text-earth-300',
};

const valueStyles: Record<StatCardVariant, string> = {
  earth: 'text-earth-900 dark:text-earth-50',
  sage: 'text-sage-800 dark:text-sage-100',
  'earth-muted': 'text-earth-800 dark:text-earth-100',
};

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  variant = 'earth',
  isLarge = false,
  description,
  className = '',
}) => {
  return (
    <div
      className={`border-l-2 transition-colors duration-300 ${
        isLarge ? 'col-span-2 p-4 sm:p-6' : 'p-4 sm:p-5'
      } ${variantStyles[variant]} ${className}`}
    >
      <p
        className={`font-medium tracking-wide uppercase ${
          isLarge ? 'text-sm' : 'text-xs'
        } ${titleStyles[variant]}`}
      >
        {title}
      </p>
      <p
        className={`font-serif font-bold leading-none ${
          isLarge ? 'text-5xl sm:text-6xl mt-2' : 'text-3xl mt-1'
        } ${valueStyles[variant]}`}
      >
        {value}
      </p>
      {description && (
        <p className="mt-0.5 text-xs text-earth-500 dark:text-earth-400">
          {description}
        </p>
      )}
    </div>
  );
};
