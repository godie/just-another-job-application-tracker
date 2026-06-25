import { useReducer, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { encryptAndSave, decryptKey, hasKeyStored } from '../hooks/useCrypto';
import { useGeminiKeyStore } from '../store/geminiKeyStore';
import { GeminiKeyFormFields } from './GeminiKeyFormFields';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from './ui/Dialog';

interface GeminiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (apiKey: string) => void;
}

interface GeminiKeyModalState {
  apiKey: string;
  confirmApiKey: string;
  masterPassword: string;
  confirmMasterPassword: string;
  showPassword: boolean;
}

type GeminiKeyModalAction =
  | { type: 'SET_API_KEY'; value: string }
  | { type: 'SET_CONFIRM_API_KEY'; value: string }
  | { type: 'SET_MASTER_PASSWORD'; value: string }
  | { type: 'SET_CONFIRM_MASTER_PASSWORD'; value: string }
  | { type: 'SET_SHOW_PASSWORD'; value: boolean };

function geminiKeyModalReducer(state: GeminiKeyModalState, action: GeminiKeyModalAction): GeminiKeyModalState {
  switch (action.type) {
    case 'SET_API_KEY':
      return { ...state, apiKey: action.value };
    case 'SET_CONFIRM_API_KEY':
      return { ...state, confirmApiKey: action.value };
    case 'SET_MASTER_PASSWORD':
      return { ...state, masterPassword: action.value };
    case 'SET_CONFIRM_MASTER_PASSWORD':
      return { ...state, confirmMasterPassword: action.value };
    case 'SET_SHOW_PASSWORD':
      return { ...state, showPassword: action.value };
    default:
      return state;
  }
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

  const [state, dispatch] = useReducer(geminiKeyModalReducer, {
    apiKey: '',
    confirmApiKey: '',
    masterPassword: '',
    confirmMasterPassword: '',
    showPassword: false,
  });

  const { apiKey, confirmApiKey, masterPassword, confirmMasterPassword, showPassword } = state;

  const handleOpenChange = useCallback((open: boolean) => {
    if (!open) {
      clearKeyFromMemory();
      onClose();
    }
  }, [onClose, clearKeyFromMemory]);

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

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {keyAlreadyStored
              ? t('geminiKeyModal.unlockTitle')
              : t('geminiKeyModal.setupTitle')}
          </DialogTitle>
          <DialogDescription>
            {keyAlreadyStored
              ? t('geminiKeyModal.unlockDescription')
              : t('geminiKeyModal.setupDescription')}
          </DialogDescription>
        </DialogHeader>

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

        <GeminiKeyFormFields
          apiKey={apiKey}
          setApiKey={(v) => dispatch({ type: 'SET_API_KEY', value: v })}
          confirmApiKey={confirmApiKey}
          setConfirmApiKey={(v) => dispatch({ type: 'SET_CONFIRM_API_KEY', value: v })}
          masterPassword={masterPassword}
          setMasterPassword={(v) => dispatch({ type: 'SET_MASTER_PASSWORD', value: v })}
          confirmMasterPassword={confirmMasterPassword}
          setConfirmMasterPassword={(v) => dispatch({ type: 'SET_CONFIRM_MASTER_PASSWORD', value: v })}
          showPassword={showPassword}
          setShowPassword={(v) => dispatch({ type: 'SET_SHOW_PASSWORD', value: v })}
          keyAlreadyStored={keyAlreadyStored}
          isLoading={isLoading}
          isNewKey={!keyAlreadyStored}
        />

        <DialogFooter>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-4 py-2.5 rounded-lg font-medium border border-border text-muted-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isLoading}
            className="flex-1 px-4 py-2.5 rounded-lg font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
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
        </DialogFooter>

        {!keyAlreadyStored && (
          <div className="pt-2 border-t border-border">
            <p className="text-xs text-muted-foreground">
              {t('geminiKeyModal.securityNote')}
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
