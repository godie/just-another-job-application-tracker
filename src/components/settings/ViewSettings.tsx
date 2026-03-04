import React from 'react';
import { useTranslation } from 'react-i18next';
import { type ViewType } from '../../utils/localStorage';

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
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {views.map((view) => {
          const isActive = defaultView === view;
          return (
            <button
              key={view}
              onClick={() => onDefaultViewChange(view)}
              className={`flex flex-col p-5 rounded-xl border-2 transition-all text-left group ${
                isActive
                  ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/20'
                  : 'border-gray-100 dark:border-gray-700 hover:border-indigo-200 dark:hover:border-indigo-900/30 bg-white dark:bg-gray-800'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-3xl group-hover:scale-110 transition-transform">{getViewIcon(view)}</span>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isActive ? 'border-indigo-600' : 'border-gray-300 dark:border-gray-600'}`}>
                  {isActive && <div className="w-2.5 h-2.5 rounded-full bg-indigo-600" />}
                </div>
              </div>
              <div>
                <div className="font-bold text-gray-900 dark:text-white capitalize text-lg">
                  {t(`views.${view}`)}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
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
