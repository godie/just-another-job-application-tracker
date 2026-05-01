import React from 'react';
import { useTranslation } from 'react-i18next';

const OpportunitiesEmptyState: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className='bg-white dark:bg-earth-800 rounded p-8 text-center border border-earth-200 dark:border-earth-700'>
      <p className='text-earth-500 dark:text-earth-400 text-lg mb-2'>{t('opportunities.noOpportunities')}</p>
      <p className='text-earth-400 dark:text-earth-500 text-sm'>
        <a
          href='https://chromewebstore.google.com/detail/job-application-tracker/inlfdhmkpfikjfgjgnininfcgdnlhlcc?pli=1'
          className='text-sage-600 dark:text-sage-400 hover:text-sage-700 dark:hover:text-sage-300'
          target='_blank'
          rel='noopener noreferrer'
        >
          {t('opportunities.noOpportunitiesDesc')}
        </a>
      </p>
    </div>
  );
};

export default OpportunitiesEmptyState;