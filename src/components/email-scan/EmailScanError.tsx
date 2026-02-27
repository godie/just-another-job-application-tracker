import React from 'react';
import { useTranslation } from 'react-i18next';
import { isGmailRateLimitError } from '../../mails/errors';

interface EmailScanErrorProps {
  error: Error | null;
}

const EmailScanError: React.FC<EmailScanErrorProps> = ({ error }) => {
  const { t } = useTranslation();

  if (!error) return null;

  return (
    <div
      className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm"
      role="alert"
    >
      {isGmailRateLimitError(error)
        ? t('settings.emailScan.rateLimitError')
        : error.message}
    </div>
  );
};

export default EmailScanError;
