import React from 'react';
import { useTranslation } from 'react-i18next';
import { type UserPreferences } from '../../utils/localStorage';

interface ATSSearchSettingsProps {
  atsSearch: UserPreferences['atsSearch'];
  onAtsSearchChange: (key: keyof NonNullable<UserPreferences['atsSearch']>, value: string) => void;
}

const ATSSearchSettings: React.FC<ATSSearchSettingsProps> = ({ atsSearch, onAtsSearchChange }) => {
  const { t } = useTranslation();

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">{t('opportunities.atsSearch.settings')}</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        {t('opportunities.atsSearch.subtitle')}
      </p>

      <div className="space-y-4">
        <div>
          <label htmlFor="ats-roles" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('opportunities.atsSearch.roles')}
          </label>
          <input
            id="ats-roles"
            type="text"
            value={atsSearch?.roles || ''}
            onChange={(e) => onAtsSearchChange('roles', e.target.value)}
            placeholder={t('opportunities.atsSearch.placeholderRoles')}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
        <div>
          <label htmlFor="ats-keywords" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('opportunities.atsSearch.keywords')}
          </label>
          <input
            id="ats-keywords"
            type="text"
            value={atsSearch?.keywords || ''}
            onChange={(e) => onAtsSearchChange('keywords', e.target.value)}
            placeholder={t('opportunities.atsSearch.placeholderKeywords')}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
        <div>
          <label htmlFor="ats-location" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('opportunities.atsSearch.location')}
          </label>
          <input
            id="ats-location"
            type="text"
            value={atsSearch?.location || ''}
            onChange={(e) => onAtsSearchChange('location', e.target.value)}
            placeholder={t('opportunities.atsSearch.placeholderLocation')}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
      </div>
    </div>
  );
};

export default ATSSearchSettings;
