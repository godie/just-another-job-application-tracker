import React, { useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface GeminiKeyFormFieldsProps {
  apiKey: string;
  setApiKey: (value: string) => void;
  confirmApiKey: string;
  setConfirmApiKey: (value: string) => void;
  masterPassword: string;
  setMasterPassword: (value: string) => void;
  confirmMasterPassword: string;
  setConfirmMasterPassword: (value: string) => void;
  showPassword: boolean;
  setShowPassword: (value: boolean) => void;
  keyAlreadyStored: boolean;
  isLoading: boolean;
  isNewKey: boolean;
}

export const GeminiKeyFormFields: React.FC<GeminiKeyFormFieldsProps> = ({
  apiKey,
  setApiKey,
  confirmApiKey,
  setConfirmApiKey,
  masterPassword,
  setMasterPassword,
  confirmMasterPassword,
  setConfirmMasterPassword,
  showPassword,
  setShowPassword,
  isLoading,
  isNewKey,
}) => {
  const { t } = useTranslation();
  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const rafId = requestAnimationFrame(() => firstInputRef.current?.focus());
    return () => cancelAnimationFrame(rafId);
  }, []);

  return (
    <div className="space-y-4">
      {isNewKey && (
        <>
          <div className="space-y-1.5">
            <label
              htmlFor="gemini-api-key"
              className="block text-sm font-semibold text-foreground"
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
              aria-label={t('geminiKeyModal.apiKeyLabel')}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-ring focus:border-ring outline-none transition"
              autoComplete="off"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="confirm-api-key"
              className="block text-sm font-semibold text-foreground"
            >
              {t('geminiKeyModal.confirmApiKeyLabel')}
            </label>
            <input
              id="confirm-api-key"
              type={showPassword ? 'text' : 'password'}
              value={confirmApiKey}
              onChange={(e) => setConfirmApiKey(e.target.value)}
              placeholder="AIza..."
              aria-label={t('geminiKeyModal.confirmApiKeyLabel')}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-ring focus:border-ring outline-none transition"
              autoComplete="off"
              disabled={isLoading}
            />
          </div>
        </>
      )}

      <div className="space-y-1.5">
        <label
          htmlFor="master-password"
          className="block text-sm font-semibold text-foreground"
        >
          {t('geminiKeyModal.masterPasswordLabel')}
        </label>
        <input
          ref={isNewKey ? undefined : firstInputRef}
          id="master-password"
          type={showPassword ? 'text' : 'password'}
          value={masterPassword}
          onChange={(e) => setMasterPassword(e.target.value)}
          placeholder={t('geminiKeyModal.masterPasswordPlaceholder')}
          aria-label={t('geminiKeyModal.masterPasswordLabel')}
          className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-ring focus:border-ring outline-none transition"
          autoComplete="off"
          disabled={isLoading}
        />
      </div>

      {isNewKey && (
        <div className="space-y-1.5">
          <label
            htmlFor="confirm-master-password"
            className="block text-sm font-semibold text-foreground"
          >
            {t('geminiKeyModal.confirmMasterPasswordLabel')}
          </label>
          <input
            id="confirm-master-password"
            type={showPassword ? 'text' : 'password'}
            value={confirmMasterPassword}
            onChange={(e) => setConfirmMasterPassword(e.target.value)}
            placeholder={t('geminiKeyModal.confirmMasterPasswordPlaceholder')}
            aria-label={t('geminiKeyModal.confirmMasterPasswordLabel')}
            className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-ring focus:border-ring outline-none transition"
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
          aria-label={t('geminiKeyModal.showPassword')}
          className="rounded border-border text-primary focus:ring-ring"
        />
        <label
          htmlFor="show-password"
          className="text-sm text-muted-foreground cursor-pointer select-none"
        >
          {t('geminiKeyModal.showPassword')}
        </label>
      </div>
    </div>
  );
};
