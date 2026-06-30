import React, { memo } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { getCurrentYear } from '../utils/dateHelpers';

interface FooterProps {
  version: string;
}

const currentYear = String(getCurrentYear());

const Footer: React.FC<FooterProps> = ({ version }) => {
  const { t } = useTranslation();

  return (
    <footer className='bg-background dark:bg-muted border-t border-border py-4 mt-8'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        <p className='text-center text-sm text-muted-foreground'>
            <Trans
              i18nKey='common.footer.vibecoded'
              values={{ version, year: currentYear }}
              components={{
                link: <a className='text-primary hover:text-primary dark:hover:text-primary font-medium' href='https://github.com/godie' target='_blank' rel='noopener noreferrer' aria-label='Github godie' />
              }}
            />
        </p>
        <p className='text-center text-xs text-muted-foreground dark:text-muted-foreground mt-2'>
          <a className='text-muted-foreground hover:text-foreground' href='/terms.html' target='_blank' rel='noopener noreferrer'>{t('common.footer.termsOfUse')}</a>
          {' | '}
          <a className='text-muted-foreground hover:text-foreground' href='/privacy.html' target='_blank' rel='noopener noreferrer'>{t('common.footer.privacyPolicy')}</a>
          {' | '}
          <a className='text-muted-foreground hover:text-foreground' href='/?page=landing'>{t('nav.about')}</a>
        </p>
      </div>
    </footer>
  );
};

Footer.displayName = 'Footer';

export default memo(Footer);