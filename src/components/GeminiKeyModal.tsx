import { useEffect, useRef, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import useKeyboardEscape from '../hooks/useKeyboardEscape';
import { encryptAndSave, decryptKey, hasKeyStored } from '../hooks/useCrypto';
import { useGeminiKeyStore } from '../store/geminiKeyStore';

interface GeminiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (apiKey: string) => void;
}

export function GeminiKeyModal({ isOpen, onClose, onSuccess }: GeminiKeyModalProps) {
  const { t } = useTranslation();
  const keyAlreadyStored = hasKeyStored();

  const setDecryptedKey = useGeminiKeyStore((state) => state.setDecryptedKey);
  const clearKeyFromMemory = useGeminiKeyStore((state) => state.clearKeyFromMemory);
  const error = useGeminiKeyStore((state) => state.error);
  const setError = useGeminiKeyStore((state) => state.setError);
  const isLoading = useGeminiKeyStore((state) => state.isLoading);
  const setLoading = useGeminiKeyStore((state) => state.setLoading);

  const [apiKey, setApiKey] = useState('');
  const [confirmApiKey, setConfirmApiKey] = useState('');
  const [masterPassword, setMasterPassword] = useState('');
  const [confirmMasterPassword, setConfirmMasterPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    if (isOpen) {
      timeoutId = setTimeout(() => firstInputRef.current?.focus(), 0);
    } else {
      setApiKey('');
      setConfirmApiKey('');
      setMasterPassword('');
      setConfirmMasterPassword('');
      setError(null);
      clearKeyFromMemory();
    }
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isOpen, clearKeyFromMemory, setError]);

  useKeyboardEscape(onClose, isOpen);

  const handleSubmit = useCallback(async () => {
    setError(null);

    if (!keyAlreadyStored) {
      if (!apiKey.trim()) {
        setError(t('geminiKeyModal.errors.apiKeyRequired'));
        return;
      }
      if (apiKey !== confirmApiKey) {
        setError(t('geminiKeyModal.errors.apiKeyMismatch'));
        return;
      }
      if (!masterPassword.trim()) {
        setError(t('geminiKeyModal.errors.masterPasswordRequired'));
        return;
      }
      if (masterPassword !== confirmMasterPassword) {
        setError(t('geminiKeyModal.errors.masterPasswordMismatch'));
        return;
      }
    } else {
      if (!masterPassword.trim()) {
        setError(t('geminiKeyModal.errors.masterPasswordRequired'));
        return;
      }
    }

    setLoading(true);

    try {
      if (keyAlreadyStored) {
        const decrypted = await decryptKey(masterPassword);
        setDecryptedKey(decrypted);
        onSuccess(decrypted);
      } else {
        await encryptAndSave(apiKey.trim(), masterPassword);
        setDecryptedKey(apiKey.trim());
        onSuccess(apiKey.trim());
      }
    } catch (err) {
      const message =
        err instanceof Error && err.message.toLowerCase().includes('no encrypted key')
          ? t('geminiKeyModal.errors.noKeyStored')
          : err instanceof Error &&
              (err.message.toLowerCase().includes('decrypt') ||
                err.message.toLowerCase().includes('operation failed'))
            ? t('geminiKeyModal.errors.wrongPassword')
            : err instanceof Error
              ? err.message
              : t('geminiKeyModal.errors.generic');
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [
    keyAlreadyStored,
    apiKey,
    confirmApiKey,
    masterPassword,
    confirmMasterPassword,
    setError,
    setLoading,
    setDecryptedKey,
    onSuccess,
    t,
  ]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      e.preventDefault();
      handleSubmit();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="gemini-key-modal-title"
        ref={modalRef}
        className="w-full max-w-md mx-4 bg-white dark:bg-earth-800 rounded-xl shadow-2xl border border-earth-200 dark:border-earth-700 p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200"
        onKeyDown={handleKeyDown}
      >
        <div className="flex items-start justify-between">
          <div>
            <h2
              id="gemini-key-modal-title"
              className="text-xl font-bold text-earth-900 dark:text-earth-100"
            >
              {keyAlreadyStored
                ? t('geminiKeyModal.unlockTitle')
                : t('geminiKeyModal.setupTitle')}
            </h2>
            <p className="text-sm text-earth-500 dark:text-earth-400 mt-1">
              {keyAlreadyStored
                ? t('geminiKeyModal.unlockDescription')
                : t('geminiKeyModal.setupDescription')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-earth-400 hover:text-earth-600 dark:hover:text-earth-300 hover:bg-earth-100 dark:hover:bg-earth-700 transition"
            aria-label={t('common.close')}
          >
            <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div
            className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm flex items-start gap-2"
            role="alert"
          >
            <svg className="size-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-4">
          {!keyAlreadyStored && (
            <>
              <div className="space-y-1.5">
                <label
                  htmlFor="gemini-api-key"
                  className="block text-sm font-semibold text-earth-700 dark:text-earth-300"
                >
                  {t('geminiKeyModal.apiKeyLabel')}
                </label>
                <input
                  ref={firstInputRef}
                  id="gemini-api-key"
                  type={showPassword ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="AIza..."
                  className="w-full px-3 py-2 border border-earth-300 dark:border-earth-600 rounded-lg bg-white dark:bg-earth-900 text-earth-900 dark:text-earth-100 text-sm focus:ring-2 focus:ring-sage-500 focus:border-sage-500 outline-none transition"
                  autoComplete="off"
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="confirm-api-key"
                  className="block text-sm font-semibold text-earth-700 dark:text-earth-300"
                >
                  {t('geminiKeyModal.confirmApiKeyLabel')}
                </label>
                <input
                  id="confirm-api-key"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmApiKey}
                  onChange={(e) => setConfirmApiKey(e.target.value)}
                  placeholder="AIza..."
                  className="w-full px-3 py-2 border border-earth-300 dark:border-earth-600 rounded-lg bg-white dark:bg-earth-900 text-earth-900 dark:text-earth-100 text-sm focus:ring-2 focus:ring-sage-500 focus:border-sage-500 outline-none transition"
                  autoComplete="off"
                  disabled={isLoading}
                />
              </div>
            </>
          )}

          <div className="space-y-1.5">
            <label
              htmlFor="master-password"
              className="block text-sm font-semibold text-earth-700 dark:text-earth-300"
            >
              {t('geminiKeyModal.masterPasswordLabel')}
            </label>
            <input
              ref={keyAlreadyStored ? firstInputRef : undefined}
              id="master-password"
              type={showPassword ? 'text' : 'password'}
              value={masterPassword}
              onChange={(e) => setMasterPassword(e.target.value)}
              placeholder={t('geminiKeyModal.masterPasswordPlaceholder')}
              className="w-full px-3 py-2 border border-earth-300 dark:border-earth-600 rounded-lg bg-white dark:bg-earth-900 text-earth-900 dark:text-earth-100 text-sm focus:ring-2 focus:ring-sage-500 focus:border-sage-500 outline-none transition"
              autoComplete="off"
              disabled={isLoading}
            />
          </div>

          {!keyAlreadyStored && (
            <div className="space-y-1.5">
              <label
                htmlFor="confirm-master-password"
                className="block text-sm font-semibold text-earth-700 dark:text-earth-300"
              >
                {t('geminiKeyModal.confirmMasterPasswordLabel')}
              </label>
              <input
                id="confirm-master-password"
                type={showPassword ? 'text' : 'password'}
                value={confirmMasterPassword}
                onChange={(e) => setConfirmMasterPassword(e.target.value)}
                placeholder={t('geminiKeyModal.confirmMasterPasswordPlaceholder')}
                className="w-full px-3 py-2 border border-earth-300 dark:border-earth-600 rounded-lg bg-white dark:bg-earth-900 text-earth-900 dark:text-earth-100 text-sm focus:ring-2 focus:ring-sage-500 focus:border-sage-500 outline-none transition"
                autoComplete="off"
                disabled={isLoading}
              />
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="show-password"
              checked={showPassword}
              onChange={(e) => setShowPassword(e.target.checked)}
              className="rounded border-earth-300 dark:border-earth-600 text-sage-600 focus:ring-sage-500"
            />
            <label
              htmlFor="show-password"
              className="text-sm text-earth-600 dark:text-earth-400 cursor-pointer select-none"
            >
              {t('geminiKeyModal.showPassword')}
            </label>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-4 py-2.5 rounded-lg font-medium border border-earth-300 dark:border-earth-600 text-earth-700 dark:text-earth-300 hover:bg-earth-50 dark:hover:bg-earth-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isLoading}
            className="flex-1 px-4 py-2.5 rounded-lg font-medium bg-sage-600 text-white hover:bg-sage-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin size-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                {keyAlreadyStored
                  ? t('geminiKeyModal.unlocking')
                  : t('geminiKeyModal.saving')}
              </>
            ) : (
              keyAlreadyStored
                ? t('geminiKeyModal.unlockAction')
                : t('geminiKeyModal.saveAction')
            )}
          </button>
        </div>

        {!keyAlreadyStored && (
          <div className="pt-2 border-t border-earth-200 dark:border-earth-700">
            <p className="text-xs text-earth-500 dark:text-earth-400">
              {t('geminiKeyModal.securityNote')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
