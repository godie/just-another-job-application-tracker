// src/components/Header.tsx
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthModals } from './AuthModals';
import { clearAuthCookie } from '../utils/api';
import { useAlert } from './AlertProvider';
import { Button } from './ui/Button';
import { useIsLoggedIn } from '../hooks/useIsLoggedIn';
import { useAuthStore } from '../stores/authStore';
import { type PageType } from '../App';

interface HeaderProps {
  onToggleSidebar: () => void;
  onNavigate?: (page: PageType) => void;
}

const Header: React.FC<HeaderProps> = ({ onToggleSidebar, onNavigate }) => {
  const { t, i18n } = useTranslation();
  const isLoggedIn = useIsLoggedIn();
  const { showSuccess, showError } = useAlert();
  const { currentUser, logout } = useAuthStore();
  const { isOpen: isAuthOpen, initialMode, openLogin, closeModal, AuthModal } = useAuthModals();
  const [isLoading, setIsLoading] = useState(false);
const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
      return savedTheme || 'light';
    }
    return 'light';
  });
  // Apply theme when it changes
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    
    // Force immediate update
    const root = document.documentElement;
    if (newTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', newTheme);
  };

  const handleAuth = async () => {
    if (isLoggedIn) {
      setIsLoading(true);
      try {
        await clearAuthCookie();
        logout();
        showSuccess(t('common.logoutSuccess'));
      } catch (error) {
        console.error(t('common.logoutError'), error);
        showError(t('common.logoutPartial'));
      } finally {
        setIsLoading(false);
      }
    } else {
      openLogin();
    }
  };

  return (
    <header className='flex items-center justify-between p-4 border-b border-earth-200 dark:border-earth-700 bg-white dark:bg-earth-800 fixed top-0 left-0 right-0 z-50 h-16'>
      <div className='flex items-center gap-4'>
        {/* Hamburger menu button - Hidden on mobile, visible on desktop */}
        <Button
          variant='ghost'
          size='icon'
          onClick={onToggleSidebar}
          className='!hidden md:!flex'
          aria-label='Toggle sidebar'
          data-testid='sidebar-toggle'
        >
          <svg
            className='size-6 text-earth-700 dark:text-earth-300'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'
            xmlns='http://www.w3.org/2000/svg'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M4 6h16M4 12h16M4 18h16'
            />
          </svg>
        </Button>
        {/* Logo/Icon for mobile (< 768px) */}
        <img
          src='/jajat-logo.png'
          alt='Just Another Job Application Tracker - Home'
          className='size-10 md:hidden'
          data-testid='app-logo-mobile'
        />
        {/* Title: JAJAT for tablets (768px - 1023px) */}
        <div className='hidden md:block lg:hidden font-serif text-2xl font-bold text-sage-700 dark:text-sage-400' data-testid='app-title-tablet'>
          JAJAT
        </div>
        {/* Title: Full text for desktop (>= 1024px) */}
        <div className='hidden lg:block font-serif text-2xl sm:text-3xl font-bold text-sage-700 dark:text-sage-400' data-testid='app-title'>
          Just Another Job Application Tracker
        </div>
      </div>
      <div className='flex items-center gap-4'>
        {/* Language Switcher */}
        <div className='flex items-center gap-1 mr-2'>
          <Button
            variant={i18n.language.startsWith('en') ? 'primary' : 'ghost'}
            size='sm'
            onClick={() => i18n.changeLanguage('en')}
            className='px-1.5 py-0.5 h-auto text-xs font-bold'
          >
            EN
          </Button>
          <Button
            variant={i18n.language.startsWith('es') ? 'primary' : 'ghost'}
            size='sm'
            onClick={() => i18n.changeLanguage('es')}
            className='px-1.5 py-0.5 h-auto text-xs font-bold'
          >
            ES
          </Button>
        </div>
        {/* Theme Toggle */}
        <div className='flex items-center gap-3'>
          {/* Sun Icon (Light Mode) */}
          <svg
            className={`size-5 transition-colors ${
              theme === 'light' ? 'text-yellow-500' : 'text-earth-400'
            }`}
            fill='currentColor'
            viewBox='0 0 20 20'
            xmlns='http://www.w3.org/2000/svg'
          >
            <path
              fillRule='evenodd'
              d='M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z'
              clipRule='evenodd'
            />
          </svg>

          {/* Toggle Switch */}
          <button
            onClick={toggleTheme}
            type='button'
            className={`relative inline-flex h-6 w-11 items-center rounded transition-colors focus:outline-none focus:ring-2 focus:ring-sage-500 focus:ring-offset-2 ${
              theme === 'dark' ? 'bg-sage-600' : 'bg-earth-300'
            }`}
            role='switch'
            aria-checked={theme === 'dark'}
            aria-label='Toggle theme'
            data-testid='theme-toggle'
            suppressHydrationWarning
          >
            <span
              className={`inline-block size-4 transform rounded-full bg-white transition-transform ${
                theme === 'dark' ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>

          {/* Moon Icon (Dark Mode) */}
          <svg
            className={`size-5 transition-colors ${
              theme === 'dark' ? 'text-sage-400' : 'text-earth-400'
            }`}
            fill='currentColor'
            viewBox='0 0 20 20'
            xmlns='http://www.w3.org/2000/svg'
          >
            <path d='M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z' />
          </svg>
        </div>
        {/* Login/Account Button */}
        {isLoggedIn ? (
          <button
            type='button'
            onClick={() => onNavigate?.('backup-sync')}
            className='flex items-center gap-2 px-2 md:px-3 py-1.5 rounded-full border border-sage-200 dark:border-sage-700 bg-sage-50 dark:bg-sage-900/20 hover:bg-sage-100 dark:hover:bg-sage-900/40 transition-colors'
            data-testid='user-avatar-button'
            aria-label={t('nav.backupSync')}
          >
            <span className='size-7 bg-sage-600 rounded-full flex items-center justify-center text-white text-sm font-bold'>
              {currentUser?.email?.charAt(0).toUpperCase() ?? '?'}
            </span>
            <span className='hidden md:inline text-sm font-medium text-sage-700 dark:text-sage-300 max-w-[140px] truncate'>
              {currentUser?.email}
            </span>
          </button>
        ) : (
          <Button
            variant='primary'
            className='font-medium py-2 px-2 md:px-5 transition duration-150 hover:scale-[1.02]'
            onClick={handleAuth}
            data-testid='login-button'
            aria-label={t('common.signIn')}
            disabled={isLoading}
          >
            {isLoading ? (
              <span className='hidden md:inline'>{t('common.loading')}</span>
            ) : (
              <>
                <span className='hidden md:inline'>{t('common.signIn')}</span>
                {/* User icon for mobile */}
                <svg
                  className='md:hidden size-5'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                  xmlns='http://www.w3.org/2000/svg'
                  aria-hidden='true'
                >
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' />
                </svg>
              </>
            )}
          </Button>
        )}
      </div>
      <AuthModal
        isOpen={isAuthOpen}
        onClose={closeModal}
        initialMode={initialMode}
      />
    </header>
  );
};

export default Header;