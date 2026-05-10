import React, { memo, useState, useEffect } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { getCurrentYear } from '../utils/dateHelpers';

interface FooterProps {
  version: string;
}

const Footer: React.FC<FooterProps> = ({ version }) => {
  const { t } = useTranslation();
  const [currentYear, setCurrentYear] = useState('');

  useEffect(() => {
    setCurrentYear(String(getCurrentYear()));
  }, []);

  return (
    <footer className='bg-earth-50 dark:bg-earth-900 border-t border-earth-200 dark:border-earth-700 py-4 mt-8'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        <p className='text-center text-sm text-earth-600 dark:text-earth-400'>
            <Trans
              i18nKey='common.footer.vibecoded'
              values={{ version, year: currentYear }}
              components={{
                link: <a className='text-sage-600 dark:text-sage-400 hover:text-sage-700 dark:hover:text-sage-300 font-medium' href='https://github.com/godie' target='_blank' rel='noopener noreferrer' aria-label='Github godie' />
              }}
            />
        </p>
        <p className='text-center text-xs text-earth-500 dark:text-earth-500 mt-2'>
          <a className='text-earth-600 dark:text-earth-400 hover:text-earth-800 dark:hover:text-earth-200' href='/terms.html' target='_blank' rel='noopener noreferrer'>{t('common.footer.termsOfUse')}</a>
          {' | '}
          <a className='text-earth-600 dark:text-earth-400 hover:text-earth-800 dark:hover:text-earth-200' href='/privacy.html' target='_blank' rel='noopener noreferrer'>{t('common.footer.privacyPolicy')}</a>
          {' | '}
          <a className='text-earth-600 dark:text-earth-400 hover:text-earth-800 dark:hover:text-earth-200' href='/?page=landing'>{t('nav.about')}</a>
        </p>
      </div>
    </footer>
  );
};

Footer.displayName = 'Footer';

export default memo(Footer);