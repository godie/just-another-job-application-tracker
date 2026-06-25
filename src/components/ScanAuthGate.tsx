import React from 'react';
import { useTranslation } from 'react-i18next';
import { GoogleAuthCard } from './GoogleAuthCard';
import { LoadingSpinner } from './LoadingSpinner';

export type ScanAuthStatus = 'checking' | 'unlinked' | 'expired' | 'ready';

interface ScanAuthGateProps {
  status: ScanAuthStatus;
  onTokenCheck: () => void;
  children: React.ReactNode;
}

export const ScanAuthGate: React.FC<ScanAuthGateProps> = ({
  status,
  onTokenCheck,
  children,
}) => {
  const { t } = useTranslation();

  switch (status) {
    case 'checking':
      return <LoadingSpinner className="py-8 mb-6" />;
    case 'unlinked':
      return (
        <GoogleAuthCard
          title={t('settings.emailScan.googleNotLinked')}
          description={t('settings.emailScan.googleNotLinkedDesc')}
          buttonLabel={t('settings.cloud.linkGoogle')}
          onAction={onTokenCheck}
          variant="primary"
          className="mb-6"
        />
      );
    case 'expired':
      return (
        <GoogleAuthCard
          title={t('settings.emailScan.googleSessionExpired')}
          description={t('settings.emailScan.googleSessionExpiredDesc')}
          buttonLabel={t('settings.cloud.linkGoogle')}
          onAction={onTokenCheck}
          variant="warning"
          className="mb-6"
        />
      );
    case 'ready':
      return <>{children}</>;
  }
};

export default ScanAuthGate;
