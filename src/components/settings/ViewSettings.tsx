import React from 'react';
import { useTranslation } from 'react-i18next';
import { type ViewType } from '../../utils/localStorage';

interface ViewSettingsProps {
  defaultView: ViewType;
  onDefaultViewChange: (view: ViewType) => void;
}

const ViewSettings: React.FC<ViewSettingsProps> = ({ defaultView, onDefaultViewChange }) => {
  const { t } = useTranslation();

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">{t('settings.view.title')}</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        {t('settings.view.desc')}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {(['table', 'timeline', 'kanban', 'calendar'] as ViewType[]).map((view) => (
          <button
            key={view}
            type="button"
            onClick={() => onDefaultViewChange(view)}
            className={`p-4 rounded-lg border-2 transition ${
              defaultView === view
                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'
            }`}
          >
            <div className="text-left">
              <div className="font-semibold text-gray-800 dark:text-white capitalize mb-1">{t(`views.${view}`)}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {t(`settings.view.${view}`)}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ViewSettings;
