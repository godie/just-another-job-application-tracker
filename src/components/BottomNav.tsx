// src/components/BottomNav.tsx
import React, { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { FaTable, FaLightbulb, FaCog, FaChartBar, FaHeart } from 'react-icons/fa';
import { type PageType } from '../App';
import { useIsLoggedIn } from '../hooks/useIsLoggedIn';
import SyncNavIcon from './sync/SyncNavIcon';


interface BottomNavProps {
  currentPage: PageType;
  onNavigate: (page: PageType) => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ currentPage, onNavigate }) => {
  const { t } = useTranslation();
  const isLoggedIn = useIsLoggedIn();
  const navItems = [
    { page: 'applications' as PageType, label: t('nav.applications'), icon: <FaTable size={20} /> },
    { page: 'opportunities' as PageType, label: t('nav.opportunities'), icon: <FaLightbulb size={20} /> },
    { page: 'backup-sync' as PageType, label: t('nav.backupSync'), icon: <SyncNavIcon isLoggedIn={isLoggedIn} className="size-5" /> },
    { page: 'insights' as PageType, label: t('nav.insights'), icon: <FaChartBar size={20} /> },
    { page: 'settings' as PageType, label: t('nav.settings'), icon: <FaCog size={20} /> },
    { page: 'support' as PageType, label: t('nav.support'), icon: <FaHeart size={20} /> },
  ];

  return (
    <nav
      aria-label='Bottom navigation'
      className='fixed bottom-0 left-0 right-0 bg-earth-50 dark:bg-earth-800 border-t border-earth-200 dark:border-earth-700 md:hidden z-50'
    >
      <div className='flex justify-around items-center h-16'>
        {navItems.map((item) => (
          <button
            key={item.page}
            onClick={() => onNavigate(item.page  as PageType)}
            className={`flex flex-col items-center justify-center w-full h-full transition-colors group relative ${
              currentPage === item.page
                ? 'text-sage-600 dark:text-sage-400'
                : 'text-earth-500 dark:text-earth-400 hover:text-sage-600 dark:hover:text-sage-400'
            }`}
            aria-label={item.label}
            aria-current={currentPage === item.page ? 'page' : undefined}
          >
            {item.icon}
            <span className='text-xs mt-1'>{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
};

BottomNav.displayName = 'BottomNav';

export default memo(BottomNav);