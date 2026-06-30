import React from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useSEO } from '../seo/useSEO';
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
        <h1 className='text-3xl font-semibold text-foreground mb-2'>{t('support.title')}</h1>
        <p className='text-muted-foreground'>{t('support.subtitle')}</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <DonationSection />
        <SuggestionForm onNavigate={onNavigate} />
      </div>

      <section className='mt-12 bg-primary/5 dark:bg-primary/10 rounded p-6 border border-primary/10 dark:border-primary/10'>
        <h3 className='text-lg font-semibold text-primary dark:text-primary mb-2'>{t('support.howItWorks')}</h3>
        <p className='text-primary dark:text-primary text-sm'>
          <Trans i18nKey="support.howItWorksDesc">
            Las sugerencias se envían a una pequeña cola.
          </Trans>
        </p>
      </section>
    </div>
  );
};

export default SupportPage;
