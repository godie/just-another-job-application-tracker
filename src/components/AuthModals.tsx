// src/components/AuthModals.tsx
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../stores/authStore';
import { Button } from './ui';

type AuthMode = 'login' | 'register';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: AuthMode;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, initialMode = 'login' }) => {
  const { t } = useTranslation();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const { login, register, loginWithGoogle, isLoading, error } = useAuthStore();

  React.useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setDisplayName('');
      setLocalError(null);
    }
  }, [isOpen, initialMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!email || !password) {
      setLocalError(t('auth.errors.required'));
      return;
    }

    if (mode === 'register') {
      if (password !== confirmPassword) {
        setLocalError(t('auth.errors.passwordMismatch'));
        return;
      }
      if (password.length < 8) {
        setLocalError(t('auth.errors.weakPassword'));
        return;
      }
      try {
        await register(email, password, displayName || undefined);
        onClose();
      } catch {
        // Error is handled by store
      }
    } else {
      try {
        await login(email, password);
        onClose();
      } catch {
        // Error is handled by store
      }
    }
  };

  const handleGoogleLogin = () => {
    loginWithGoogle('mock-token');
  };

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    setLocalError(null);
    setPassword('');
    setConfirmPassword('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md bg-white dark:bg-earth-800 rounded-lg shadow-xl border border-earth-200 dark:border-earth-700 overflow-hidden">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-earth-800 dark:text-earth-100">
              {mode === 'login' ? t('auth.login') : t('auth.register')}
            </h2>
            <button
              onClick={onClose}
              className="p-2 text-earth-500 hover:text-earth-700 dark:text-earth-400 dark:hover:text-earth-200 transition-colors"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {(localError || error) && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md text-red-700 dark:text-red-300 text-sm">
              {localError || error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="auth-email" className="block text-sm font-medium text-earth-700 dark:text-earth-300 mb-1">
                {t('auth.email')}
              </label>
              <input
                id="auth-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-earth-300 dark:border-earth-600 rounded-md bg-white dark:bg-earth-700 text-earth-800 dark:text-earth-100 focus:outline-none focus:ring-2 focus:ring-sage-500 focus:border-transparent"
                placeholder="you@example.com"
                required
              />
            </div>

            <div>
              <label htmlFor="auth-password" className="block text-sm font-medium text-earth-700 dark:text-earth-300 mb-1">
                {t('auth.password')}
              </label>
              <input
                id="auth-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-earth-300 dark:border-earth-600 rounded-md bg-white dark:bg-earth-700 text-earth-800 dark:text-earth-100 focus:outline-none focus:ring-2 focus:ring-sage-500 focus:border-transparent"
                placeholder="••••••••"
                required
              />
            </div>

            {mode === 'register' && (
              <>
                <div>
                  <label htmlFor="auth-confirm-password" className="block text-sm font-medium text-earth-700 dark:text-earth-300 mb-1">
                    {t('auth.confirmPassword')}
                  </label>
                  <input
                    id="auth-confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-earth-300 dark:border-earth-600 rounded-md bg-white dark:bg-earth-700 text-earth-800 dark:text-earth-100 focus:outline-none focus:ring-2 focus:ring-sage-500 focus:border-transparent"
                    placeholder="••••••••"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="auth-display-name" className="block text-sm font-medium text-earth-700 dark:text-earth-300 mb-1">
                    {t('auth.displayName')}
                  </label>
                  <input
                    id="auth-display-name"
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full px-3 py-2 border border-earth-300 dark:border-earth-600 rounded-md bg-white dark:bg-earth-700 text-earth-800 dark:text-earth-100 focus:outline-none focus:ring-2 focus:ring-sage-500 focus:border-transparent"
                    placeholder={t('auth.displayName')}
                  />
                </div>
              </>
            )}

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? t('common.loading') : (mode === 'login' ? t('auth.login') : t('auth.register'))}
            </Button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-earth-300 dark:border-earth-600"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white dark:bg-earth-800 text-earth-500">{t('common.orDivider')}</span>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-earth-300 dark:border-earth-600 rounded-md bg-white dark:bg-earth-700 text-earth-700 dark:text-earth-200 hover:bg-earth-50 dark:hover:bg-earth-600 transition-colors font-medium"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                {t('auth.loginWithGoogle')}
              </button>

              <button
                type="button"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-earth-300 dark:border-earth-600 rounded-md bg-white dark:bg-earth-700 text-earth-700 dark:text-earth-200 hover:bg-earth-50 dark:hover:bg-earth-600 transition-colors font-medium"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 3a5 5 0 015 5v8a5 5 0 01-5 5H5a5 5 0 01-5-5v-8a5 5 0 015-5h14zm-9 14.5v-5l4.5 2.5-4.5 2.5z" />
                </svg>
                {t('auth.loginWithLinkedin')}
              </button>
            </div>
          </div>

          <div className="mt-6 text-center text-sm text-earth-600 dark:text-earth-400">
            {mode === 'login' ? (
              <p>
                {t('auth.noAccount')}{' '}
                <button
                  type="button"
                  onClick={() => switchMode('register')}
                  className="text-sage-600 dark:text-sage-400 hover:underline font-medium"
                >
                  {t('auth.register')}
                </button>
              </p>
            ) : (
              <p>
                {t('auth.hasAccount')}{' '}
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="text-sage-600 dark:text-sage-400 hover:underline font-medium"
                >
                  {t('auth.login')}
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuthModals = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [initialMode, setInitialMode] = useState<AuthMode>('login');

  const openLogin = React.useCallback(() => {
    setInitialMode('login');
    setIsOpen(true);
  }, []);

  const openRegister = React.useCallback(() => {
    setInitialMode('register');
    setIsOpen(true);
  }, []);

  const closeModal = React.useCallback(() => {
    setIsOpen(false);
  }, []);

  return {
    isOpen,
    initialMode,
    openLogin,
    openRegister,
    closeModal,
    AuthModal,
  };
};

export default AuthModal;