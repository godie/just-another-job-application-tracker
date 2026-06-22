import React from 'react';

interface PageHeaderProps {
  category?: string;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  actionTestId?: string;
  className?: string;
  children?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  category,
  title,
  description,
  actionLabel,
  onAction,
  actionTestId,
  className = 'mb-10',
  children,
}) => {
  return (
    <header className={className}>
      <div className='flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6'>
        <div className='flex-1'>
          {category && (
            <div className='flex items-center gap-3 mb-4'>
              <div className='w-10 h-0.5 bg-sage-500'></div>
              <span className='text-sage-600 dark:text-sage-400 text-sm font-medium tracking-wider uppercase'>
                {category}
              </span>
            </div>
          )}
          <h1 className='font-serif text-4xl md:text-5xl font-semibold text-earth-900 dark:text-earth-50'>
            {title}
          </h1>
          {description && (
            <p className='mt-3 text-base text-earth-600 dark:text-earth-300'>
              {description}
            </p>
          )}
        </div>
        {onAction && actionLabel && (
          <button
            type="button"
            className='self-start sm:self-auto bg-terracotta-600 hover:bg-terracotta-700 active:bg-terracotta-800 text-white font-bold py-4 px-8 rounded transition-colors border border-terracotta-700 hover:border-terracotta-800 text-base shadow-sm hover:shadow-md'
            onClick={onAction}
            aria-label={actionLabel}
            data-testid={actionTestId}
          >
            {actionLabel}
          </button>
        )}
        {children}
      </div>
    </header>
  );
};

PageHeader.displayName = 'PageHeader';
