import React from 'react';
import { useTranslation } from 'react-i18next';
import { ConnectGoogleButton } from './ConnectGoogleButton';

export type ScanAuthStatus = 'checking' | 'unlinked' | 'expired' | 'ready';

interface ScanAuthGateProps {
  status: ScanAuthStatus;
  onTokenCheck: () => void;
  children: React.ReactNode;
}

const LoadingState: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-center py-8 mb-6">
      <span className="size-5 border-2 border-primary/30 border-t-transparent rounded-full animate-spin mr-2" />
      <span className="text-sm text-muted-foreground">{t('common.loading')}</span>
    </div>
  );
};

const NoGoogleLinked: React.FC<{ onTokenCheck: () => void }> = ({ onTokenCheck }) => {
  const { t } = useTranslation();
  return (
    <div className="bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-lg p-6 mb-6">
      <div className="text-center">
        <div className="size-12 mx-auto mb-3 rounded-full bg-primary/10 dark:bg-primary/90 flex items-center justify-center">
          <svg className="size-6 text-primary" viewBox="0 0 24 24" fill="currentColor">
            <path d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27 3.09 0 5.25 1.65 5.25 1.65l1.83-1.8S16.22 2 12.17 2C6.63 2 2 6.44 2 12c0 5.52 4.46 10 10 10 5.14 0 9.35-3.65 9.35-8.77 0-1.15-.14-2.13 0-2.13z" fill="#4285F4"/>
          </svg>
        </div>
        <h4 className="text-sm font-semibold text-primary mb-2">
          {t('settings.emailScan.googleNotLinked')}
        </h4>
        <p className="text-xs text-primary mb-4">
          {t('settings.emailScan.googleNotLinkedDesc')}
        </p>
        <ConnectGoogleButton
          label={t('settings.cloud.linkGoogle')}
          onSuccess={onTokenCheck}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors rounded disabled:opacity-50 disabled:cursor-not-allowed"
        />
      </div>
    </div>
  );
};

const TokenExpired: React.FC<{ onTokenCheck: () => void }> = ({ onTokenCheck }) => {
  const { t } = useTranslation();
  return (
    <div className="bg-earth-50 dark:bg-earth-800/40 border border-earth-200 dark:border-earth-700 rounded-lg p-6 mb-6">
      <div className="text-center">
        <div className="size-12 mx-auto mb-3 rounded-full bg-earth-100 dark:bg-earth-700 flex items-center justify-center">
          <svg className="size-6 text-earth-600 dark:text-earth-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m0-8v4m0 0a9 9 0 110-18 9 9 0 010 18z" />
          </svg>
        </div>
        <h4 className="text-sm font-semibold text-earth-700 dark:text-earth-200 mb-2">
          {t('settings.emailScan.googleSessionExpired')}
        </h4>
        <p className="text-xs text-earth-600 dark:text-earth-400 mb-4">
          {t('settings.emailScan.googleSessionExpiredDesc')}
        </p>
        <ConnectGoogleButton
          label={t('settings.cloud.linkGoogle')}
          onSuccess={onTokenCheck}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-earth-600 hover:bg-earth-700 text-white transition-colors rounded disabled:opacity-50 disabled:cursor-not-allowed"
        />
      </div>
    </div>
  );
};

export const ScanAuthGate: React.FC<ScanAuthGateProps> = ({
  status,
  onTokenCheck,
  children,
}) => {
  switch (status) {
    case 'checking':
      return <LoadingState />;
    case 'unlinked':
      return <NoGoogleLinked onTokenCheck={onTokenCheck} />;
    case 'expired':
      return <TokenExpired onTokenCheck={onTokenCheck} />;
    case 'ready':
      return <>{children}</>;
  }
};

export default ScanAuthGate;
