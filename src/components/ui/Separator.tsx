import React from 'react';

export interface SeparatorProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: 'horizontal' | 'vertical';
}

export const Separator: React.FC<SeparatorProps> = ({
  className = '',
  orientation = 'horizontal',
  ...props
}) => {
  return (
    <div
      className={`${
        orientation === 'horizontal' ? 'h-[1px] w-full' : 'h-full w-[1px]'
      } bg-gray-200 dark:bg-gray-700 ${className}`}
      {...props}
    />
  );
};

Separator.displayName = 'Separator';
