import React from 'react';
import { useTranslation } from 'react-i18next';
import { type UserPreferences } from '../../utils/localStorage';

interface ATSSearchSettingsProps {
  atsSearch: UserPreferences['atsSearch'];
  onAtsSearchChange: (key: string, value: string) => void;
}

const ATSSearchSettings: React.FC<ATSSearchSettingsProps> = ({ atsSearch, onAtsSearchChange }) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-8">
      <div className="bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/30 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-indigo-600 rounded-lg text-white shadow-lg">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              {t('opportunities.atsSearch.title')}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {t('opportunities.atsSearch.subtitle')}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="sm:col-span-2">
          <label htmlFor="ats-roles" className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
            {t('opportunities.atsSearch.roles')}
          </label>
          <input
            id="ats-roles"
            type="text"
            value={atsSearch?.roles || ''}
            onChange={(e) => onAtsSearchChange('roles', e.target.value)}
            placeholder={t('opportunities.atsSearch.placeholderRoles')}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-all shadow-sm"
          />
        </div>
        <div>
          <label htmlFor="ats-keywords" className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
            {t('opportunities.atsSearch.keywords')}
          </label>
          <input
            id="ats-keywords"
            type="text"
            value={atsSearch?.keywords || ''}
            onChange={(e) => onAtsSearchChange('keywords', e.target.value)}
            placeholder={t('opportunities.atsSearch.placeholderKeywords')}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-all shadow-sm"
          />
        </div>
        <div>
          <label htmlFor="ats-location" className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
            {t('opportunities.atsSearch.location')}
          </label>
          <input
            id="ats-location"
            type="text"
            value={atsSearch?.location || ''}
            onChange={(e) => onAtsSearchChange('location', e.target.value)}
            placeholder={t('opportunities.atsSearch.placeholderLocation')}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-all shadow-sm"
          />
        </div>
      </div>
    </div>
  );
};

export default ATSSearchSettings;
