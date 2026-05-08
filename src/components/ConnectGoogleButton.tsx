import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGoogleLogin } from '@react-oauth/google';

import { useAuthStore } from '../stores/authStore';
import { useAlert } from './AlertProvider';
import { linkGoogleAccount } from '../utils/api';

interface ConnectGoogleButtonProps {
  /** Custom label for the button. Defaults to "Link Google account" */
  label?: string;
  /** Custom CSS classes for the button */
  className?: string;
  /** Called after successful Google account linking */
  onSuccess?: () => void;
  /** Called when linking fails */
  onError?: (error: string) => void;
}

export const ConnectGoogleButton: React.FC<ConnectGoogleButtonProps> = ({
  label,
  className,
  onSuccess,
  onError,
}) => {
  const { t } = useTranslation();
  const { fetchMe } = useAuthStore();
  const { showSuccess, showError } = useAlert();
  const [isLinking, setIsLinking] = useState(false);

  const googleLogin = useGoogleLogin({
    flow: 'auth-code',
    onSuccess: async (codeResponse) => {
      setIsLinking(true);
      try {
        const data = await linkGoogleAccount(codeResponse.code);
        if (data.success) {
          await fetchMe();
          showSuccess(t('settings.cloud.googleLinkedSuccess'));
          onSuccess?.();
        } else {
          const errorMsg = data.error || t('settings.cloud.googleLinkFailed');
          showError(errorMsg);
          onError?.(errorMsg);
        }
      } catch {
        const errorMsg = t('settings.cloud.googleLinkNetworkError');
        showError(errorMsg);
        onError?.(errorMsg);
      } finally {
        setIsLinking(false);
      }
    },
    onError: () => {
      const errorMsg = t('settings.cloud.googleOAuthError');
      showError(errorMsg);
      onError?.(errorMsg);
    },
  });

  return (
    <button
      type="button"
      onClick={() => googleLogin()}
      disabled={isLinking}
      aria-busy={isLinking}
      aria-label={t('settings.cloud.linkGoogleAriaLabel')}
      className={
        className ||
        'flex items-center gap-2 px-4 py-2 text-sm font-medium border border-sage-300 dark:border-sage-600 text-sage-700 dark:text-sage-300 hover:bg-sage-50 dark:hover:bg-sage-800 transition-colors rounded disabled:opacity-50 disabled:cursor-not-allowed'
      }
    >
      {isLinking ? (
        <span className="w-5 h-5 border-2 border-sage-400 border-t-transparent rounded-full animate-spin" />
      ) : (
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
      )}
      {isLinking ? t('settings.cloud.linking') : (label || t('settings.cloud.linkGoogle'))}
    </button>
  );
};
