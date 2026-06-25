import React from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { GoogleAuthCard } from './GoogleAuthCard';
import { LoadingSpinner } from './LoadingSpinner';

export type SheetsAuthStatus = 'unauthenticated' | 'unlinked' | 'checking' | 'expired' | 'ready';

interface SheetsAuthGateProps {
  status: SheetsAuthStatus;
  onTokenCheck: () => void;
  children: React.ReactNode;
}

const NotAuthenticated: React.FC = () => {
  return (
    <div className="bg-muted border border-border rounded-lg p-4 mb-4">
      <p className="text-sm text-foreground">
        <Trans i18nKey="sheets.loginRequired">
          <strong>Google Sheets Sync:</strong> Please log in with Google to enable spreadsheet synchronization.
        </Trans>
      </p>
    </div>
  );
};

export const SheetsAuthGate: React.FC<SheetsAuthGateProps> = ({
  status,
  onTokenCheck,
  children,
}) => {
  const { t } = useTranslation();

  switch (status) {
    case 'unauthenticated':
      return <NotAuthenticated />;
    case 'checking':
      return <LoadingSpinner className="py-6 mb-4" />;
    case 'unlinked':
      return (
        <GoogleAuthCard
          title={t('sheets.googleNotLinked')}
          description={t('sheets.googleNotLinkedDesc')}
          buttonLabel={t('settings.cloud.linkGoogle')}
          onAction={onTokenCheck}
          variant="primary"
          className="mb-4"
        />
      );
    case 'expired':
      return (
        <GoogleAuthCard
          title={t('sheets.googleSessionExpired')}
          description={t('sheets.googleSessionExpiredDesc')}
          buttonLabel={t('settings.cloud.linkGoogle')}
          onAction={onTokenCheck}
          variant="warning"
          className="mb-4"
        />
      );
    case 'ready':
      return <>{children}</>;
  }
};

export default SheetsAuthGate;
