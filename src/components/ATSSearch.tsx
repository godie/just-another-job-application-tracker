import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePreferencesStore } from '../stores/preferencesStore';
import { ATS_PLATFORMS } from '../utils/constants';
import { Card, Input, Button } from './ui';

const ATSSearch: React.FC = () => {
  const { t } = useTranslation();
  const preferences = usePreferencesStore((state) => state.preferences);
  const updatePreferences = usePreferencesStore((state) => state.updatePreferences);

  const [isExpanded, setIsExpanded] = useState(false);
  const [localFilters, setLocalFilters] = useState(preferences.atsSearch || {
    roles: '',
    keywords: '',
    location: '',
  });

  const handleFilterChange = (key: keyof typeof localFilters, value: string) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
    updatePreferences({ atsSearch: newFilters });
  };

  const generateGoogleUrl = (atsUrl: string) => {
    const { roles, keywords, location } = localFilters;
    const queryParts = [];

    if (atsUrl) queryParts.push(`site:${atsUrl}`);
    if (roles) queryParts.push(`(${roles})`);
    if (keywords) queryParts.push(`(${keywords})`);
    if (location) queryParts.push(`(${location})`);

    const query = queryParts.join(' ');
    return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
  };

  const handleSearch = (atsUrl: string) => {
    window.open(generateGoogleUrl(atsUrl), '_blank', 'noopener,noreferrer');
  };

  const handleSearchAll = () => {
    ATS_PLATFORMS.forEach((platform, index) => {
      // Small delay to avoid popup blockers if possible, though many browsers will still block
      setTimeout(() => {
        handleSearch(platform.url);
      }, index * 300);
    });
  };

  return (
    <Card className="overflow-hidden mb-6 border-none shadow-md">
      <div
        className="px-6 py-4 flex justify-between items-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg text-indigo-600 dark:text-indigo-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-800 dark:text-white">
              {t('opportunities.atsSearch.title')}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('opportunities.atsSearch.subtitle')}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="text-gray-400">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`h-5 w-5 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </Button>
      </div>

      {isExpanded && (
        <div className="px-6 pb-6 pt-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50/30 dark:bg-gray-800/50">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Input
              label={t('opportunities.atsSearch.roles')}
              type="text"
              value={localFilters.roles}
              onChange={(e) => handleFilterChange('roles', e.target.value)}
              placeholder={t('opportunities.atsSearch.placeholderRoles')}
            />
            <Input
              label={t('opportunities.atsSearch.keywords')}
              type="text"
              value={localFilters.keywords}
              onChange={(e) => handleFilterChange('keywords', e.target.value)}
              placeholder={t('opportunities.atsSearch.placeholderKeywords')}
            />
            <Input
              label={t('opportunities.atsSearch.location')}
              type="text"
              value={localFilters.location}
              onChange={(e) => handleFilterChange('location', e.target.value)}
              placeholder={t('opportunities.atsSearch.placeholderLocation')}
            />
          </div>

          <div className="mb-2">
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
              {t('opportunities.atsSearch.search')}
            </label>
            <div className="flex flex-wrap gap-2">
              {ATS_PLATFORMS.map((platform) => (
                <Button
                  key={platform.id}
                  variant="outline"
                  onClick={() => handleSearch(platform.url)}
                  className="px-4 py-2 h-auto text-sm font-medium transition-all flex items-center gap-2 shadow-sm group"
                >
                  <span className="text-gray-400 group-hover:text-indigo-500 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </span>
                  {platform.name}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex justify-end mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
            <Button
              variant="primary"
              onClick={handleSearchAll}
              className="px-6 py-2.5 shadow-md active:transform active:scale-95"
            >
              {t('opportunities.atsSearch.searchAll')}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
};

export default ATSSearch;
