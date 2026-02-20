import React from 'react';
import { useTranslation } from 'react-i18next';
import { FaCoffee, FaHeart } from 'react-icons/fa';
import { Card } from './ui';

const DonationSection: React.FC = () => {
  const { t } = useTranslation();

  return (
    <Card className="p-6 border-none shadow-md">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-pink-100 dark:bg-pink-900 rounded-lg text-pink-600 dark:text-pink-300">
          <FaHeart size={24} />
        </div>
        <h2 className="text-xl font-bold text-gray-800 dark:text-white">{t('support.donations')}</h2>
      </div>
      <p className="text-gray-600 dark:text-gray-400 mb-6">{t('support.donationsDesc')}</p>
      <a
        href="https://buymeacoffee.com/godieboy"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-3 w-full py-4 bg-[#FFDD00] hover:bg-[#FFCC00] text-black font-bold rounded-xl transition-transform hover:scale-105 shadow-lg"
      >
        <FaCoffee size={24} />
        <span>{t('support.buyMeACoffee')}</span>
      </a>
      <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-4">
        {t('common.anyAport')}
      </p>
    </Card>
  );
};

export default DonationSection;
