import React, { memo } from 'react';
import { useTranslation } from 'react-i18next';

export type ViewType = 'table' | 'timeline' | 'kanban' | 'calendar';

interface ViewSwitcherProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
}

const ViewSwitcher: React.FC<ViewSwitcherProps> = ({ currentView, onViewChange }) => {
  const { t } = useTranslation();
  const views = [
    {
      id: 'table' as ViewType,
      label: t('views.table'),
      icon: (
        <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      ),
      description: t('settings.view.table'),
    },
    {
      id: 'timeline' as ViewType,
      label: t('views.timeline'),
      icon: (
        <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      description: t('settings.view.timeline'),
    },
    {
      id: 'kanban' as ViewType,
      label: t('views.kanban'),
      icon: (
        <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
        </svg>
      ),
      description: t('settings.view.kanban'),
    },
    {
      id: 'calendar' as ViewType,
      label: t('views.calendar'),
      icon: (
        <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      description: t('settings.view.calendar'),
    },
  ];

  return (
    <div className='flex items-center gap-1' role='tablist' aria-label='View switcher'>
      {views.map((view) => {
        const isActive = currentView === view.id;

        return (
          <button
            key={view.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onViewChange(view.id)}
            className={`
              relative flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md
              transition-colors duration-150
              ${isActive
                ? 'text-foreground'
                : 'text-muted-foreground hover:text-foreground'}
            `}
            aria-label={view.description}
          >
            {view.icon}
            <span className="hidden sm:inline">{view.label}</span>
            {isActive && (
              <span className='absolute bottom-0 left-2 right-2 h-0.5 bg-destructive/80 dark:bg-destructive/50 rounded-full' />
            )}
          </button>
        );
      })}
    </div>
  );
};

ViewSwitcher.displayName = 'ViewSwitcher';

export default memo(ViewSwitcher);
