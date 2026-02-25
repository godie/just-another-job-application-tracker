import React from 'react';
import { useTranslation } from 'react-i18next';
import { type PageType } from '../App';
import { EmailScanReview } from '../components/EmailScanReview';

interface GmailScanPageProps {
  onNavigate?: (page: PageType) => void;
}

const GmailScanPage: React.FC<GmailScanPageProps> = ({ onNavigate }) => {
  const { t } = useTranslation();

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="mb-6">
        <button
          onClick={() => onNavigate?.('applications')}
          className="flex items-center text-indigo-600 dark:text-indigo-400 hover:underline mb-4"
        >
          <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {t('common.back')}
        </button>
      </div>
      <EmailScanReview />
    </div>
  );
};

export default GmailScanPage;
