import React from 'react';
import { useTranslation } from 'react-i18next';
import { ConnectGoogleButton } from '../ConnectGoogleButton';
import { useAuthStore } from '../../stores/authStore';
import type { PageType } from '../../App';

interface CloudAccountSectionProps {
  onNavigate?: (page: PageType) => void;
}

export const CloudAccountSection: React.FC<CloudAccountSectionProps> = ({ onNavigate }) => {
  const { t } = useTranslation();
  const currentUser = useAuthStore((state) => state.currentUser);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return (
    <div className="space-y-8">
      <div className="bg-primary/5 dark:bg-primary/10 border border-primary/20 p-8">
        {isAuthenticated ? (
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="size-16 bg-primary rounded flex items-center justify-center text-white text-2xl font-bold">
              {currentUser?.email?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 text-center sm:text-left">
              <p className="text-sm font-semibold text-primary uppercase tracking-wider">
                {t('settings.categories.account')}
              </p>
              <p className="font-serif text-xl font-bold text-foreground mt-1">
                {currentUser?.email}
              </p>
              <div className="flex items-center justify-center sm:justify-start gap-2 mt-2 text-primary">
                <svg xmlns="http://www.w3.org/2000/svg" className="size-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-sm font-medium">{t('backupSync.loggedIn.syncedSecure')}</span>
              </div>
              {!currentUser?.googleId && (
                <div className="mt-3">
                  <ConnectGoogleButton />
                </div>
              )}
              {currentUser?.googleId && (
                <p className="text-xs text-primary mt-1">Google connected</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => onNavigate?.('backup-sync')}
              className="px-6 py-2.5 bg-primary text-white text-sm font-semibold hover:bg-primary transition-colors"
            >
              {t('nav.backupSync')} →
            </button>
          </div>
        ) : (
          <div className="text-center py-6">
            <div className="size-16 bg-muted rounded flex items-center justify-center text-muted-foreground mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="size-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h4 className="font-serif text-lg font-semibold text-foreground mb-2">
              {t('backupSync.notLoggedIn.title')}
            </h4>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              {t('backupSync.notLoggedIn.description')}
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <button
                type="button"
                onClick={() => onNavigate?.('backup-sync')}
                className="px-6 py-2.5 bg-primary text-white text-sm font-semibold hover:bg-primary transition-colors"
              >
                {t('nav.backupSync')} →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
