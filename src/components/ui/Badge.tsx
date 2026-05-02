import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'outline' | 'danger' | 'success' | 'warning' | 'sage';
}

export const Badge: React.FC<BadgeProps> = ({
  className = '',
  variant = 'default',
  ...props
}) => {
  const baseStyles = 'inline-block px-2 py-1 text-xs font-semibold rounded transition-colors';

  const variants = {
    default: 'bg-earth-200 text-earth-800 dark:bg-earth-700 dark:text-earth-100',
    secondary: 'bg-earth-100 text-earth-700 dark:bg-earth-600 dark:text-earth-200',
    outline: 'border border-earth-300 text-earth-700 dark:border-earth-600 dark:text-earth-300 bg-transparent',
    danger: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
    success: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
    warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
    sage: 'bg-sage-100 text-sage-800 dark:bg-sage-900/40 dark:text-sage-300',
  };

  const combinedClassName = `${baseStyles} ${variants[variant]} ${className}`;

  return <div className={combinedClassName} {...props} />;
};

Badge.displayName = 'Badge';
