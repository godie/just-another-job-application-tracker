import React from 'react';
import { useTranslation } from 'react-i18next';

const SettingsHeader: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div className="mb-6">
      <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">{t('settings.title')}</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        {t('settings.subtitle')}
      </p>
    </div>
  );
};

export default SettingsHeader;
