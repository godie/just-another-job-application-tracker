import React from 'react';
import { useTranslation } from 'react-i18next';

interface EmailScanTabsProps {
  activeTab: 'automatic' | 'manual';
  onTabChange: (tab: 'automatic' | 'manual') => void;
}

const EmailScanTabs: React.FC<EmailScanTabsProps> = ({ activeTab, onTabChange }) => {
  const { t } = useTranslation();
  return (
    <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
      <button
        className={`px-4 py-2 font-medium text-sm transition-colors ${
          activeTab === 'automatic'
            ? 'border-b-2 border-indigo-600 text-indigo-600'
            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
        }`}
        onClick={() => onTabChange('automatic')}
      >
        {t('settings.emailScan.tabs.automatic')}
      </button>
      <button
        className={`px-4 py-2 font-medium text-sm transition-colors ${
          activeTab === 'manual'
            ? 'border-b-2 border-indigo-600 text-indigo-600'
            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
        }`}
        onClick={() => onTabChange('manual')}
      >
        {t('settings.emailScan.tabs.manual')}
      </button>
    </div>
  );
};

export default EmailScanTabs;
