import React from 'react';
import { useTranslation } from 'react-i18next';

const OpportunitiesEmptyState: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center">
      <p className="text-gray-500 dark:text-gray-400 text-lg mb-2">{t('opportunities.noOpportunities')}</p>
      <p className="text-gray-400 dark:text-gray-500 text-sm">
        <a
          href="https://chromewebstore.google.com/detail/job-application-tracker/inlfdhmkpfikjfgjgnininfcgdnlhlcc?pli=1"
          className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          target="_blank"
          rel="noopener noreferrer"
        >
          {t('opportunities.noOpportunitiesDesc')}
        </a>
      </p>
    </div>
  );
};

export default OpportunitiesEmptyState;
