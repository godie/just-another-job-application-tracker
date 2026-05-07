import React from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useSEO } from '../seo';
import DonationSection from '../components/DonationSection';
import SuggestionForm from '../components/SuggestionForm';
import { type PageType } from '../App';

interface SupportPageProps {
  onNavigate?: (page: PageType) => void;
}

const SupportPage: React.FC<SupportPageProps> = ({ onNavigate }) => {
  const { t } = useTranslation();

  useSEO({
    title: t('seo.support.title'),
    description: t('seo.support.description'),
  });

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 pb-24">
      <header className='mb-8'>
        <h1 className='text-3xl font-bold text-earth-800 dark:text-earth-100 mb-2'>{t('support.title')}</h1>
        <p className='text-earth-600 dark:text-earth-400'>{t('support.subtitle')}</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <DonationSection />
        <SuggestionForm onNavigate={onNavigate} />
      </div>

      <section className='mt-12 bg-sage-50 dark:bg-sage-900/20 rounded p-6 border border-sage-100 dark:border-sage-900/30'>
        <h3 className='text-lg font-bold text-sage-800 dark:text-sage-300 mb-2'>{t('support.howItWorks')}</h3>
        <p className='text-sage-700 dark:text-sage-400 text-sm'>
          <Trans i18nKey="support.howItWorksDesc">
            Las sugerencias se envían a una pequeña cola.
          </Trans>
        </p>
      </section>
    </div>
  );
};

export default SupportPage;
