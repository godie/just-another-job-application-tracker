import React from 'react';
import { useTranslation } from 'react-i18next';
import { type ViewType } from '../../types/preferences';

interface ViewSettingsProps {
  defaultView: ViewType;
  onDefaultViewChange: (view: ViewType) => void;
}

const ViewSettings: React.FC<ViewSettingsProps> = ({ defaultView, onDefaultViewChange }) => {
  const { t } = useTranslation();

  const views: ViewType[] = ['table', 'timeline', 'kanban', 'calendar'];

  const getViewIcon = (view: ViewType) => {
    switch (view) {
      case 'table': return '📊';
      case 'timeline': return '⏳';
      case 'kanban': return '📋';
      case 'calendar': return '📅';
      default: return '👁️';
    }
  };

  return (
    <div className='space-y-4'>
      <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
        {views.map((view) => {
          const isActive = defaultView === view;
          return (
            <button
              key={view}
              onClick={() => onDefaultViewChange(view)}
              className={`flex flex-col p-5 rounded border-2 transition-all text-left group ${
                isActive
                  ? 'border-sage-600 bg-sage-50/50 dark:bg-sage-900/20'
                  : 'border-earth-200 dark:border-earth-700 hover:border-sage-200 dark:hover:border-sage-900/30 bg-white dark:bg-earth-800'
              }`}
            >
              <div className='flex items-center justify-between mb-3'>
                <span className='text-3xl group-hover:scale-110 transition-transform'>{getViewIcon(view)}</span>
                <div className={`size-5 rounded-full border-2 flex items-center justify-center ${isActive ? 'border-sage-600' : 'border-earth-300 dark:border-earth-600'}`}>
                  {isActive && <div className='size-2.5 rounded-full bg-sage-600' />}
                </div>
              </div>
              <div>
                <div className='font-bold text-earth-900 dark:text-earth-100 capitalize text-lg'>
                  {t(`views.${view}`)}
                </div>
                <div className='text-sm text-earth-500 dark:text-earth-400 mt-1'>
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