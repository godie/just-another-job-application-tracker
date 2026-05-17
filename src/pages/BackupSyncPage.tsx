// src/pages/BackupSyncPage.tsx
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGoogleLogin } from '@react-oauth/google';
import { useAuthStore } from '../stores/authStore';
import { useApplicationsStore } from '../stores/applicationsStore';
import { useOpportunitiesStore } from '../stores/opportunitiesStore';
import { useMergeStore } from '../stores/mergeStore';
import { setAuthCookieWithCode } from '../utils/api';
import { type PageType } from '../App';
import GoogleSheetsSync from '../components/GoogleSheetsSync';
import Footer from '../components/Footer';
import { PageHeader } from '../components/ui';
import packageJson from '../../package.json';

interface BackupSyncPageProps {
  onNavigate?: (page: PageType) => void;
}

const BackupSyncPage: React.FC<BackupSyncPageProps> = ({ onNavigate }) => {
  const { t } = useTranslation();
  const { currentUser: user, isAuthenticated } = useAuthStore();
  const applications = useApplicationsStore((state) => state.applications);
  const opportunities = useOpportunitiesStore((state) => state.opportunities);
  const { isSyncPaused } = useMergeStore();
  const [activeTab, setActiveTab] = useState<'acrossDevices' | 'googleSheets'>('acrossDevices');
  const [loginError, setLoginError] = useState<string | null>(null);

  const googleLogin = useGoogleLogin({
    flow: 'auth-code',
    onSuccess: async (codeResponse) => {
      try {
        const result = await setAuthCookieWithCode(
          codeResponse.code,
          window.location.origin
        );
if (result.success) {
            await useAuthStore.getState().fetchMe();
          setLoginError(null);
        }
      } catch (err) {
        console.error('Failed to set auth cookie:', err);
        setLoginError('Failed to authenticate. Please try again.');
      }
    },
    onError: () => {
      setLoginError('Google login failed. Please try again.');
    },
  });

  const handleLogout = async () => {
    await useAuthStore.getState().logout();
  };

  const appCount = applications.length;
  const oppCount = opportunities.length;

  // Not logged in view
  if (!isAuthenticated) {
    return (
      <div className='max-w-4xl mx-auto px-6 py-12'>
        <PageHeader
          category="Cloud"
          title={t('backupSync.title')}
          description={t('backupSync.subtitle')}
        />

        <div className='bg-white dark:bg-earth-800 border border-earth-200 dark:border-earth-700 rounded-xl p-8 sm:p-12 text-center'>
          <div className='size-20 bg-sage-50 dark:bg-sage-900/20 rounded-2xl flex items-center justify-center text-4xl mx-auto mb-6'>
            ☁️
          </div>
          <h2 className='font-serif text-2xl font-semibold text-earth-900 dark:text-earth-100 mb-3'>
            {t('backupSync.notLoggedIn.title')}
          </h2>
          <p className='text-earth-600 dark:text-earth-400 mb-8 max-w-md mx-auto'>
            {t('backupSync.notLoggedIn.description')}
          </p>

          <div className='flex flex-col sm:flex-row justify-center gap-4 mb-6'>
            <button
              onClick={() => googleLogin()}
              className='px-6 py-3 text-sm font-semibold bg-white hover:bg-gray-50 border border-gray-300 rounded-lg shadow-sm transition-colors flex items-center gap-3'
              type='button'
            >
              <svg className='size-5' viewBox='0 0 24 24'>
                <path fill='#4285F4' d='M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z' />
                <path fill='#34A853' d='M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z' />
                <path fill='#FBBC05' d='M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z' />
                <path fill='#EA4335' d='M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z' />
              </svg>
              {t('backupSync.notLoggedIn.signInWithGoogle')}
            </button>
            <button
              onClick={() => onNavigate?.('register')}
              className='px-6 py-3 text-sm font-semibold border border-earth-300 dark:border-earth-600 text-earth-700 dark:text-earth-300 hover:bg-earth-50 dark:hover:bg-earth-700 transition-colors rounded'
              type='button'
            >
              {t('backupSync.notLoggedIn.createAccount')}
            </button>
          </div>

          {loginError && (
            <p className='text-sm text-red-600 dark:text-red-400 mt-4'>{loginError}</p>
          )}

          <p className='text-xs text-earth-500 dark:text-earth-400 mt-6 max-w-sm mx-auto'>
            {t('backupSync.notLoggedIn.privacyNote')}
          </p>
        </div>

        <div className='mt-16 border-t border-earth-200 dark:border-earth-700 pt-10'>
          <Footer version={packageJson.version} />
        </div>
      </div>
    );
  }

  // Logged in view
  return (
    <div className='max-w-6xl mx-auto px-6 py-12'>
      <PageHeader
        category="Cloud"
        title={t('backupSync.title')}
        description={t('backupSync.subtitle')}
      />

      {/* User info card */}
      <div className='bg-sage-50 dark:bg-sage-900/20 border border-sage-200 dark:border-sage-700 rounded-xl p-6 sm:p-8 mb-8'>
        <div className='flex flex-col sm:flex-row items-center gap-6'>
          <div className='size-16 bg-sage-600 rounded-xl flex items-center justify-center text-white text-2xl font-bold'>
            {user?.email?.charAt(0).toUpperCase() || '?'}
          </div>
          <div className='flex-1 text-center sm:text-left'>
            <p className='text-sm font-semibold text-sage-600 dark:text-sage-400 uppercase tracking-wider'>
              {t('backupSync.loggedIn.syncedSecure')}
            </p>
            <p className='font-serif text-xl font-bold text-earth-900 dark:text-earth-100 mt-1'>
              {user?.email}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className='px-4 py-2 text-sm font-semibold text-earth-600 dark:text-earth-400 border border-earth-300 dark:border-earth-600 hover:bg-earth-50 dark:hover:bg-earth-700 transition-colors rounded'
            type='button'
          >
            {t('backupSync.loggedIn.logout')}
          </button>
        </div>
      </div>

      {/* Sync paused banner */}
      {isSyncPaused && (
        <div className='bg-terracotta-50 dark:bg-terracotta-900/20 border border-terracotta-200 dark:border-terracotta-700 rounded-lg p-4 mb-8'>
          <div className='flex items-center gap-3'>
            <div className='size-2 rounded-full bg-terracotta-500 animate-pulse' />
            <p className='text-sm font-semibold text-terracotta-700 dark:text-terracotta-400'>
              {t('backupSync.merge.notSyncedBanner')}
            </p>
          </div>
        </div>
      )}

      {/* Tab navigation */}
      <div className='flex border-b border-earth-200 dark:border-earth-700 mb-8'>
        <button
          onClick={() => setActiveTab('acrossDevices')}
          className={`px-6 py-3 text-sm font-semibold transition-colors border-b-2 -mb-px ${
            activeTab === 'acrossDevices'
              ? 'border-sage-600 text-sage-600 dark:text-sage-400'
              : 'border-transparent text-earth-500 dark:text-earth-400 hover:text-earth-700 dark:hover:text-earth-200'
          }`}
          type='button'
        >
          {t('backupSync.tabs.acrossDevices')}
        </button>
        <button
          onClick={() => setActiveTab('googleSheets')}
          className={`px-6 py-3 text-sm font-semibold transition-colors border-b-2 -mb-px ${
            activeTab === 'googleSheets'
              ? 'border-sage-600 text-sage-600 dark:text-sage-400'
              : 'border-transparent text-earth-500 dark:text-earth-400 hover:text-earth-700 dark:hover:text-earth-200'
          }`}
          type='button'
        >
          {t('backupSync.tabs.googleSheets')}
        </button>
      </div>

      {/* Tab content */}
      {activeTab === 'acrossDevices' && (
        <div className='space-y-6'>
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-6'>
            <div className='bg-white dark:bg-earth-800 border border-earth-200 dark:border-earth-700 rounded-xl p-6 text-center'>
              <p className='text-3xl font-bold text-earth-900 dark:text-earth-100'>{appCount}</p>
              <p className='text-sm text-earth-600 dark:text-earth-400 mt-1'>
                {appCount === 1 ? t('backupSync.loggedIn.applications_one', { count: appCount }) : t('backupSync.loggedIn.applications_other', { count: appCount })}
              </p>
            </div>
            <div className='bg-white dark:bg-earth-800 border border-earth-200 dark:border-earth-700 rounded-xl p-6 text-center'>
              <p className='text-3xl font-bold text-earth-900 dark:text-earth-100'>{oppCount}</p>
              <p className='text-sm text-earth-600 dark:text-earth-400 mt-1'>
                {oppCount === 1 ? t('backupSync.loggedIn.opportunities_one', { count: oppCount }) : t('backupSync.loggedIn.opportunities_other', { count: oppCount })}
              </p>
            </div>
          </div>
          <p className='text-sm text-earth-600 dark:text-earth-400'>
            {t('backupSync.loggedIn.autoSyncNote')}
          </p>
        </div>
      )}

      {activeTab === 'googleSheets' && (
        <GoogleSheetsSync applications={applications} />
      )}

      <div className='mt-16 border-t border-earth-200 dark:border-earth-700 pt-10'>
        <Footer version={packageJson.version} />
      </div>
    </div>
  );
};

export default BackupSyncPage;
