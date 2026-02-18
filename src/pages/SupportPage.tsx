import React from 'react';
import { Trans, useTranslation } from 'react-i18next';
import DonationSection from '../components/DonationSection';
import SuggestionForm from '../components/SuggestionForm';
import { type PageType } from '../App';

interface SupportPageProps {
  onNavigate?: (page: PageType) => void;
}

const SupportPage: React.FC<SupportPageProps> = ({ onNavigate }) => {
  const { t } = useTranslation();

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 pb-24">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">{t('support.title')}</h1>
        <p className="text-gray-600 dark:text-gray-400">{t('support.subtitle')}</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <DonationSection />
        <SuggestionForm onNavigate={onNavigate} />
      </div>

      <section className="mt-12 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl p-6 border border-indigo-100 dark:border-indigo-900/30">
        <h3 className="text-lg font-bold text-indigo-800 dark:text-indigo-300 mb-2">{t('support.howItWorks')}</h3>
        <p className="text-indigo-700 dark:text-indigo-400 text-sm">
          <Trans i18nKey="support.howItWorksDesc">
            Las sugerencias se envían a una pequeña cola.
          </Trans>
        </p>
      </section>
    </div>
  );
};

export default SupportPage;
