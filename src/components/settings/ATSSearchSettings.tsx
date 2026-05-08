import React from 'react';
import { useTranslation } from 'react-i18next';
import { type UserPreferences } from '../../utils/localStorage';
import { TagInput } from '../ui/TagInput';

interface ATSSearchSettingsProps {
  atsSearch: UserPreferences['atsSearch'];
  onAtsSearchChange: (key: string, value: string | string[]) => void;
}

const ATSSearchSettings: React.FC<ATSSearchSettingsProps> = ({ atsSearch, onAtsSearchChange }) => {
  const { t } = useTranslation();

  return (
    <div className='space-y-8'>
      <div className='bg-sage-50 dark:bg-sage-900/20 border border-sage-100 dark:border-sage-900/30 rounded p-6'>
        <div className='flex items-start gap-4'>
          <div className='p-3 bg-sage-600 rounded text-white'>
            <svg xmlns='http://www.w3.org/2000/svg' className='h-6 w-6' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' />
            </svg>
          </div>
          <div>
            <h3 className='text-lg font-bold text-earth-900 dark:text-earth-100'>
              {t('opportunities.atsSearch.title')}
            </h3>
            <p className='text-sm text-earth-600 dark:text-earth-400 mt-1'>
              {t('opportunities.atsSearch.subtitle')}
            </p>
          </div>
        </div>
      </div>

      <div className='grid grid-cols-1 sm:grid-cols-2 gap-6'>
        <div className='sm:col-span-2'>
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

        <div>
          <label className='block text-sm font-semibold text-earth-700 dark:text-earth-300 mb-2'>
            {t('opportunities.atsSearch.source')}
          </label>
          <select
            value={atsSearch?.source ?? 'both'}
            onChange={(e) => onAtsSearchChange('source', e.target.value)}
            className='w-full px-4 py-2.5 text-sm border border-earth-200 dark:border-earth-600 bg-white dark:bg-earth-800 text-earth-900 dark:text-earth-100 rounded focus:outline-none focus:ring-2 focus:ring-sage-500 focus:border-transparent transition-colors'
          >
            <option value='both'>{t('opportunities.atsSearch.sourceBoth')}</option>
            <option value='jooble'>{t('opportunities.atsSearch.sourceJooble')}</option>
            <option value='theirstack'>{t('opportunities.atsSearch.sourceTheirstack')}</option>
          </select>
          <p className='text-xs text-earth-500 dark:text-earth-400 mt-1'>
            {t('opportunities.atsSearch.sourceHint')}
          </p>
        </div>

        <div>
          <TagInput
            label={t('opportunities.atsSearch.techStack')}
            tags={atsSearch?.techStack || []}
            onChange={(tags) => onAtsSearchChange('techStack', tags)}
            placeholder={t('opportunities.atsSearch.placeholderTechStack')}
          />
          <p className='text-xs text-earth-500 dark:text-earth-400 mt-1'>
            {t('opportunities.atsSearch.techStackHint')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ATSSearchSettings;