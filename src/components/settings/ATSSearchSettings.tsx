import React from 'react';
import { useTranslation } from 'react-i18next';
import { type UserPreferences } from '../../utils/localStorage';
import { TagInput } from '../ui/TagInput';

interface ATSSearchSettingsProps {
  atsSearch: UserPreferences['atsSearch'];
  onAtsSearchChange: (key: string, value: string[]) => void;
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
          <TagInput
            label={t('opportunities.atsSearch.roles')}
            tags={atsSearch?.roles || []}
            onChange={(tags) => onAtsSearchChange('roles', tags)}
            placeholder={t('opportunities.atsSearch.placeholderRoles')}
          />
        </div>
        <div>
          <TagInput
            label={t('opportunities.atsSearch.keywords')}
            tags={atsSearch?.keywords || []}
            onChange={(tags) => onAtsSearchChange('keywords', tags)}
            placeholder={t('opportunities.atsSearch.placeholderKeywords')}
          />
        </div>
        <div>
          <TagInput
            label={t('opportunities.atsSearch.location')}
            tags={atsSearch?.location || []}
            onChange={(tags) => onAtsSearchChange('location', tags)}
            placeholder={t('opportunities.atsSearch.placeholderLocation')}
          />
        </div>
      </div>
    </div>
  );
};

export default ATSSearchSettings;
