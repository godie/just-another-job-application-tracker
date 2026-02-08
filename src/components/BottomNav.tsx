// src/components/BottomNav.tsx
import React, { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { FaTable, FaLightbulb, FaCog, FaChartBar, FaInfoCircle, FaHeart } from 'react-icons/fa';
import { type PageType } from '../App';

interface BottomNavProps {
  currentPage: PageType;
  onNavigate: (page: PageType) => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ currentPage, onNavigate }) => {
  const { t } = useTranslation();
  const navItems = [
    { page: 'applications', label: t('nav.applications'), icon: <FaTable size={24} /> },
    { page: 'opportunities', label: t('nav.opportunities'), icon: <FaLightbulb size={24} /> },
    { page: 'settings', label: t('nav.settings'), icon: <FaCog size={24} /> },
    { page: 'insights', label: t('nav.insights'), icon: <FaChartBar size={24} /> },
    { page: 'support', label: t('nav.support'), icon: <FaHeart size={24} /> },
    { page: 'landing', label: t('nav.about'), icon: <FaInfoCircle size={24} /> },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 md:hidden z-50">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => (
          <button
            key={item.page}
            onClick={() => onNavigate(item.page  as PageType)}
            className={`flex flex-col items-center justify-center w-full h-full transition-colors group relative ${
              currentPage === item.page
                ? 'text-indigo-600 dark:text-indigo-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400'
            }`}
            aria-label={item.label}
          >
            {item.icon}
            <span className="text-xs mt-1">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

BottomNav.displayName = 'BottomNav';

export default memo(BottomNav);
