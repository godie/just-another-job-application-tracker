import React from 'react';
import { useTranslation } from 'react-i18next';
import { FaCoffee, FaHeart } from 'react-icons/fa';
import { Card } from './ui';

const DonationSection: React.FC = () => {
  const { t } = useTranslation();

  return (
    <Card className='p-6'>
      <div className='flex items-center gap-3 mb-4'>
        <div className='p-2 bg-terracotta-100 dark:bg-terracotta-900/40 rounded text-terracotta-600 dark:text-terracotta-400'>
          <FaHeart size={24} />
        </div>
        <h2 className='text-xl font-semibold text-earth-800 dark:text-earth-100'>{t('support.donations')}</h2>
      </div>
      <p className='text-earth-600 dark:text-earth-400 mb-6'>{t('support.donationsDesc')}</p>
      <a
        href={t('support.buyMeACoffeeLink')}
        target='_blank'
        rel='noopener noreferrer'
        className='flex items-center justify-center gap-3 w-full py-4 bg-[#FFDD00] hover:bg-[#FFCC00] text-black font-bold rounded transition-transform hover:scale-105'
      >
        <FaCoffee size={24} />
        <span>{t('support.buyMeACoffee')}</span>
      </a>
      <p className='text-xs text-center text-earth-500 dark:text-earth-400 mt-4'>
        {t('common.anyAport')}
      </p>
    </Card>
  );
};

export default DonationSection;