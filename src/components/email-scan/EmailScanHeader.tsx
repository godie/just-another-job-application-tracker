import React from 'react';
import { useTranslation } from 'react-i18next';

const EmailScanHeader: React.FC = () => {
  const { t } = useTranslation();
  return (
    <>
      <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
        {t('settings.emailScan.title')}
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        {t('settings.emailScan.subtitle')}
      </p>
    </>
  );
};

export default EmailScanHeader;
