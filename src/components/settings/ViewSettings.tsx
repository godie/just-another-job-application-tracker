import React from 'react';
import { useTranslation } from 'react-i18next';
import { type ViewType } from '../../types/preferences';

interface ViewSettingsProps {
  defaultView: ViewType;
  onDefaultViewChange: (view: ViewType) => void;
}

const VIEW_OPTIONS: ViewType[] = ['table', 'timeline', 'kanban', 'calendar'];

const getViewIcon = (view: ViewType) => {
  switch (view) {
    case 'table': return '📊';
    case 'timeline': return '⏳';
    case 'kanban': return '📋';
    case 'calendar': return '📅';
    default: return '👁️';
  }
};

const ViewSettings: React.FC<ViewSettingsProps> = ({ defaultView, onDefaultViewChange }) => {
  const { t } = useTranslation();

  return (
    <div className='space-y-4'>
      <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
        {VIEW_OPTIONS.map((view) => {
          const isActive = defaultView === view;
          return (
            <button
              type='button'
              key={view}
              onClick={() => onDefaultViewChange(view)}
              className={`flex flex-col p-5 rounded border-2 transition-all text-left group ${
                isActive
                  ? 'border-primary bg-primary/5 dark:bg-primary/10'
                  : 'border-border hover:border-primary/20 dark:hover:border-primary/10 bg-card'
              }`}
            >
              <div className='flex items-center justify-between mb-3'>
                <span className='text-3xl group-hover:scale-110 transition-transform'>{getViewIcon(view)}</span>
                <div className={`size-5 rounded-full border-2 flex items-center justify-center ${isActive ? 'border-primary' : 'border-border'}`}>
                  {isActive && <div className='size-2.5 rounded-full bg-primary' />}
                </div>
              </div>
              <div>
                <div className='font-bold text-foreground capitalize text-lg'>
                  {t(`views.${view}`)}
                </div>
                <div className='text-sm text-muted-foreground mt-1'>
                  {t(`settings.view.${view}`)}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ViewSettings;
