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
      <div className='flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between'>
        <div className='flex-1'>
          {category && (
            <div className='mb-5 flex items-center gap-4'>
              <span className='h-px w-14 bg-primary/70' aria-hidden='true' />
              <span className='inline-block text-xs font-semibold tracking-[0.18em] uppercase text-primary'>
                {category}
              </span>
            </div>
          )}
          <h1 className='font-serif text-4xl md:text-5xl lg:text-6xl font-bold text-foreground tracking-tight leading-[0.95]'>
            {title}
          </h1>
          {description && (
            <p className='mt-4 max-w-4xl text-base md:text-lg text-muted-foreground leading-relaxed'>
              {description}
            </p>
          )}
        </div>
        {onAction && actionLabel && (
          <button
            type="button"
            className='group inline-flex self-start items-center gap-2 rounded-md border border-destructive/80 bg-destructive px-6 py-4 text-base font-semibold text-destructive-foreground shadow-sm transition-colors duration-200 hover:bg-destructive/90 lg:mt-4'
            onClick={onAction}
            aria-label={actionLabel}
            data-testid={actionTestId}
          >
            <svg className='size-4 transition-transform duration-200 group-hover:scale-110' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 4v16m8-8H4' />
            </svg>
            {actionLabel.replace(/^(?:\+\s*)+/, '')}
          </button>
        )}
        {children}
      </div>
    </header>
  );
};

PageHeader.displayName = 'PageHeader';
