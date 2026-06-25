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
  className = 'mb-12',
  children,
}) => {
  return (
    <header className={className}>
      <div className='flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6'>
        <div className='flex-1'>
          {category && (
            <span className='inline-block text-xs font-medium tracking-[0.2em] uppercase text-destructive mb-4'>
              {category}
            </span>
          )}
          <h1 className='font-serif text-4xl md:text-5xl lg:text-6xl font-bold text-foreground tracking-tight leading-none'>
            {title}
          </h1>
          {description && (
            <p className='mt-4 text-base md:text-lg text-muted-foreground max-w-prose leading-relaxed'>
              {description}
            </p>
          )}
        </div>
        {onAction && actionLabel && (
          <button
            type="button"
            className='group self-start sm:self-end inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-destructive bg-destructive/5 dark:bg-destructive/10 border border-destructive/30 rounded-lg hover:bg-destructive/10 dark:hover:bg-destructive/10 hover:border-destructive/50 transition-all duration-200'
            onClick={onAction}
            aria-label={actionLabel}
            data-testid={actionTestId}
          >
            <svg className='size-4 transition-transform duration-200 group-hover:scale-110' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 4v16m8-8H4' />
            </svg>
            {actionLabel.replace(/^\+\s*/, '')}
          </button>
        )}
        {children}
      </div>
      <div className='mt-8 h-px bg-gradient-to-r from-border dark:from-border via-muted-foreground/20 dark:via-muted-foreground/20 to-transparent' />
    </header>
  );
};

PageHeader.displayName = 'PageHeader';
