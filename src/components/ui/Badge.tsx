import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'outline' | 'danger' | 'success' | 'warning' | 'indigo';
}

export const Badge: React.FC<BadgeProps> = ({
  className = '',
  variant = 'default',
  ...props
}) => {
  const baseStyles = 'inline-block px-2 py-1 text-xs font-medium rounded transition-colors';

  const variants = {
    default: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
    secondary: 'bg-gray-200 text-gray-900 dark:bg-gray-600 dark:text-gray-100',
    outline: 'border border-gray-200 text-gray-800 dark:border-gray-700 dark:text-gray-300',
    danger: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    success: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    indigo: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
  };

  const combinedClassName = `${baseStyles} ${variants[variant]} ${className}`;

  return <div className={combinedClassName} {...props} />;
};

Badge.displayName = 'Badge';
