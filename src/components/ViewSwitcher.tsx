// src/components/ViewSwitcher.tsx
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
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      ),
      description: t('settings.view.table'),
    },
    {
      id: 'timeline' as ViewType,
      label: t('views.timeline'),
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      description: t('settings.view.timeline'),
    },
    {
      id: 'kanban' as ViewType,
      label: t('views.kanban'),
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
        </svg>
      ),
      description: t('settings.view.kanban'),
    },
    {
      id: 'calendar' as ViewType,
      label: t('views.calendar'),
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      description: t('settings.view.calendar'),
    },
  ];

  return (
    <div className="flex items-center flex-wrap gap-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-2">
      {views.map((view) => {
        const isActive = currentView === view.id;

        return (
          <button
            key={view.id}
            type="button"
            onClick={() => onViewChange(view.id)}
            className={`
              flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-150 text-sm
              ${isActive
                ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 font-semibold shadow'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'}
            `}
            aria-pressed={isActive}
            aria-label={view.description}
          >
            {view.icon}
            <span className="text-xs sm:text-sm">{view.label}</span>
          </button>
        );
      })}
    </div>
  );
};

ViewSwitcher.displayName = 'ViewSwitcher';

export default memo(ViewSwitcher);
