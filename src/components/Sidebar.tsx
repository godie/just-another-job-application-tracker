// src/components/Sidebar.tsx
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { type PageType } from '../App';
import { useOpportunitiesStore } from '../stores/opportunitiesStore';

interface SidebarProps {
  currentPage?: PageType;
  onNavigate?: (page: PageType) => void;
  isOpen?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ currentPage = 'applications', onNavigate, isOpen = true }) => {
  const { t } = useTranslation();
  const opportunities = useOpportunitiesStore((state) => state.opportunities);
  const loadOpportunities = useOpportunitiesStore((state) => state.loadOpportunities);
  const refreshOpportunities = useOpportunitiesStore((state) => state.refreshOpportunities);
  const opportunitiesCount = opportunities.length;

  useEffect(() => {
    loadOpportunities();
    
    // Listen for storage changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'jobOpportunities' || e.key === null) {
        refreshOpportunities();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Poll for changes (in case extension uses chrome.storage.local)
    const interval = setInterval(refreshOpportunities, 2000);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [loadOpportunities, refreshOpportunities]);

  const handleNavigation = (page: PageType) => {
    if (onNavigate) {
      onNavigate(page);
    }
  };

  const navItems: { page: PageType; label: string; showBadge?: boolean }[] = [
    { page: 'applications', label: t('nav.applications') },
    { page: 'opportunities', label: t('nav.opportunities'), showBadge: true },
    { page: 'settings', label: t('nav.settings') },
    { page: 'insights', label: t('nav.insights') },
    { page: 'support', label: t('nav.support') },
    { page: 'landing', label: t('nav.about') },
  ];

  return (
    <div
      className={`fixed left-0 top-16 h-[calc(100vh-4rem)] bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 p-4 flex flex-col transition-transform duration-300 ease-in-out z-40 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      } w-64`}
    >
      <nav className="flex-1">
        <ul>
          {navItems.map((item) => (
            <li key={item.page} className="mb-4">
              <button
                onClick={() => handleNavigation(item.page)}
                className={`w-full text-left text-lg font-semibold text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white py-2 px-3 rounded-lg transition-colors relative ${
                  currentPage === item.page
                    ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {item.label}
                {item.showBadge && opportunitiesCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                    {opportunitiesCount > 9 ? '9+' : opportunitiesCount}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
};

export default Sidebar;
