import React from 'react';
import { useTranslation } from 'react-i18next';

interface SettingsActionsProps {
  hasChanges: boolean;
  onSave: () => void;
  onReset: () => void;
}

const SettingsActions: React.FC<SettingsActionsProps> = ({ hasChanges, onSave, onReset }) => {
  const { t } = useTranslation();
  return (
    <div className="mb-6 flex justify-between items-center bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onSave}
          disabled={!hasChanges}
          className={`px-4 py-2 rounded-full text-sm font-semibold shadow-sm transition ${
            hasChanges
              ? 'bg-indigo-600 text-white hover:bg-indigo-700'
              : 'bg-gray-200 text-gray-500 dark:text-gray-400 cursor-not-allowed'
          }`}
        >
          {t('settings.saveChanges')}
        </button>
        <button
          type="button"
          onClick={onReset}
          className="px-4 py-2 rounded-full text-sm font-semibold border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-700 transition"
        >
          {t('settings.resetDefault')}
        </button>
      </div>
      {hasChanges && (
        <span className="text-xs text-amber-600 font-medium">
          {t('settings.unsavedChanges')}
        </span>
      )}
    </div>
  );
};

export default SettingsActions;
