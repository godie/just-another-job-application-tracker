import React from 'react';
import { useTranslation } from 'react-i18next';

const OpportunitiesEmptyState: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className='bg-card rounded p-8 text-center border border-border'>
      <p className='text-muted-foreground text-lg mb-2'>{t('opportunities.noOpportunities')}</p>
      <p className='text-muted-foreground text-sm'>
        <a
          href='https://chromewebstore.google.com/detail/job-application-tracker/inlfdhmkpfikjfgjgnininfcgdnlhlcc?pli=1'
          className='text-primary hover:text-primary/80'
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