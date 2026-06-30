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
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import packageJson from '../../package.json';

interface BackupSyncPageProps {
  onNavigate?: (page: PageType) => void;
}

async function handleLogout(): Promise<void> {
  await useAuthStore.getState().logout();
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

  const appCount = applications.length;
  const oppCount = opportunities.length;

  if (!isAuthenticated) {
    return (
      <div className='max-w-4xl mx-auto px-6 py-12'>
        <PageHeader
          category="Cloud"
          title={t('backupSync.title')}
          description={t('backupSync.subtitle')}
        />

        <div className='bg-card border border-border rounded-xl p-8 sm:p-12 text-center'>
          <div className='size-20 bg-primary/5 dark:bg-primary/10 rounded-2xl flex items-center justify-center text-4xl mx-auto mb-6'>
            ☁️
          </div>
          <h2 className='font-serif text-2xl font-semibold text-foreground mb-3'>
            {t('backupSync.notLoggedIn.title')}
          </h2>
          <p className='text-muted-foreground mb-8 max-w-md mx-auto'>
            {t('backupSync.notLoggedIn.description')}
          </p>

          <div className='flex flex-col sm:flex-row justify-center gap-4 mb-6'>
            <Button
              variant='outline'
              size='md'
              className='gap-3'
              onClick={() => googleLogin()}
            >
              <svg className='size-5' viewBox='0 0 24 24'>
                <path fill='#4285F4' d='M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z' />
                <path fill='#34A853' d='M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z' />
                <path fill='#FBBC05' d='M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z' />
                <path fill='#EA4335' d='M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z' />
              </svg>
              {t('backupSync.notLoggedIn.signInWithGoogle')}
            </Button>
            <Button
              variant='outline'
              size='md'
              onClick={() => onNavigate?.('register')}
            >
              {t('backupSync.notLoggedIn.createAccount')}
            </Button>
          </div>

          {loginError && (
            <p className='text-sm text-destructive mt-4'>{loginError}</p>
          )}

          <p className='text-xs text-muted-foreground mt-6 max-w-sm mx-auto'>
            {t('backupSync.notLoggedIn.privacyNote')}
          </p>
        </div>

        <div className='mt-16 border-t border-border pt-10'>
          <Footer version={packageJson.version} />
        </div>
      </div>
    );
  }

  return (
    <div className='max-w-6xl mx-auto px-6 py-12'>
      <PageHeader
        category="Cloud"
        title={t('backupSync.title')}
        description={t('backupSync.subtitle')}
      />

      {/* User info card */}
      <div className='bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-xl p-6 sm:p-8 mb-8'>
        <div className='flex flex-col sm:flex-row items-center gap-6'>
          <div className='size-16 bg-primary rounded-xl flex items-center justify-center text-primary-foreground text-2xl font-bold'>
            {user?.email?.charAt(0).toUpperCase() || '?'}
          </div>
          <div className='flex-1 text-center sm:text-left'>
            <p className='text-sm font-semibold text-primary uppercase tracking-wider'>
              {t('backupSync.loggedIn.syncedSecure')}
            </p>
            <p className='font-serif text-xl font-bold text-foreground mt-1'>
              {user?.email}
            </p>
          </div>
          <Button
            variant='outline'
            size='sm'
            onClick={handleLogout}
          >
            {t('backupSync.loggedIn.logout')}
          </Button>
        </div>
      </div>

      {/* Sync paused banner */}
      {isSyncPaused && (
        <div className='bg-destructive/5 dark:bg-destructive/10 border border-destructive/30 rounded-lg p-4 mb-8'>
          <div className='flex items-center gap-3'>
            <div className='size-2 rounded-full bg-destructive/80 animate-pulse' />
            <p className='text-sm font-semibold text-destructive'>
              {t('backupSync.merge.notSyncedBanner')}
            </p>
          </div>
        </div>
      )}

      {/* Tab navigation */}
      <div className='flex border-b border-border mb-8'>
        <button
          onClick={() => setActiveTab('acrossDevices')}
          className={`px-6 py-3 text-sm font-semibold transition-colors border-b-2 -mb-px ${
            activeTab === 'acrossDevices'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
          type='button'
        >
          {t('backupSync.tabs.acrossDevices')}
        </button>
        <button
          onClick={() => setActiveTab('googleSheets')}
          className={`px-6 py-3 text-sm font-semibold transition-colors border-b-2 -mb-px ${
            activeTab === 'googleSheets'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
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
            <div className='bg-card border border-border rounded-xl p-6 text-center'>
              <p className='text-3xl font-bold text-foreground'>{appCount}</p>
              <p className='text-sm text-muted-foreground mt-1'>
                {appCount === 1 ? t('backupSync.loggedIn.applications_one', { count: appCount }) : t('backupSync.loggedIn.applications_other', { count: appCount })}
              </p>
            </div>
            <div className='bg-card border border-border rounded-xl p-6 text-center'>
              <p className='text-3xl font-bold text-foreground'>{oppCount}</p>
              <p className='text-sm text-muted-foreground mt-1'>
                {oppCount === 1 ? t('backupSync.loggedIn.opportunities_one', { count: oppCount }) : t('backupSync.loggedIn.opportunities_other', { count: oppCount })}
              </p>
            </div>
          </div>
          <p className='text-sm text-muted-foreground'>
            {t('backupSync.loggedIn.autoSyncNote')}
          </p>
        </div>
      )}

      {activeTab === 'googleSheets' && (
        <GoogleSheetsSync applications={applications} />
      )}

      <div className='mt-16 border-t border-border pt-10'>
        <Footer version={packageJson.version} />
      </div>
    </div>
  );
};

export default BackupSyncPage;
