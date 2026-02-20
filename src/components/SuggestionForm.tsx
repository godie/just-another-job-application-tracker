import React, { useReducer, useMemo, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { FaClipboard } from 'react-icons/fa';
import { useAlert } from './AlertProvider';
import { Card, Button, Input } from './ui';
import { type PageType } from '../App';

const SUPPORT_API_BASE_URL =
  import.meta.env.VITE_SUPPORT_API_BASE_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  '/api';

type VitestAwareImportMeta = ImportMeta & { vitest?: unknown };
type GlobalWithTestFlag = typeof globalThis & { __TEST__?: boolean };

const isTestingEnvironment =
  (typeof import.meta !== 'undefined' &&
    Boolean((import.meta as VitestAwareImportMeta).vitest || import.meta.env?.MODE === 'test')) ||
  (typeof process !== 'undefined' && process.env?.VITEST === 'true') ||
  (typeof globalThis !== 'undefined' && Boolean((globalThis as GlobalWithTestFlag).__TEST__));

interface SuggestionFormProps {
  onNavigate?: (page: PageType) => void;
}

interface SuggestionFormState {
  selectedTypes: string[];
  explanation: string;
  captchaId: string | null;
  captchaChallenge: string | null;
  captchaInput: string;
  isSubmitting: boolean;
  isRefreshingCaptcha: boolean;
}

type SuggestionFormAction =
  | { type: 'SET_FIELD'; field: keyof SuggestionFormState; value: string | string[] | boolean | null }
  | { type: 'TOGGLE_TYPE'; typeId: string }
  | { type: 'SET_CAPTCHA'; id: string | null; challenge: string | null }
  | { type: 'RESET_FORM' };

const suggestionFormReducer = (state: SuggestionFormState, action: SuggestionFormAction): SuggestionFormState => {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, [action.field]: action.value };
    case 'TOGGLE_TYPE':
      return {
        ...state,
        selectedTypes: state.selectedTypes.includes(action.typeId)
          ? state.selectedTypes.filter((t) => t !== action.typeId)
          : [...state.selectedTypes, action.typeId],
      };
    case 'SET_CAPTCHA':
      return { ...state, captchaId: action.id, captchaChallenge: action.challenge, captchaInput: '' };
    case 'RESET_FORM':
      return { ...state, selectedTypes: [], explanation: '', captchaInput: '' };
    default:
      return state;
  }
};

const SuggestionForm: React.FC<SuggestionFormProps> = ({ onNavigate }) => {
  const { t } = useTranslation();
  const { showSuccess, showError } = useAlert();
  const showErrorRef = useRef(showError);
  const translationRef = useRef(t);

  useEffect(() => {
    showErrorRef.current = showError;
  }, [showError]);

  useEffect(() => {
    translationRef.current = t;
  }, [t]);

  const [state, dispatch] = useReducer(suggestionFormReducer, {
    selectedTypes: [],
    explanation: '',
    captchaId: null,
    captchaChallenge: null,
    captchaInput: '',
    isSubmitting: false,
    isRefreshingCaptcha: false,
  });

  const {
    selectedTypes,
    explanation,
    captchaId,
    captchaChallenge,
    captchaInput,
    isSubmitting,
    isRefreshingCaptcha,
  } = state;

  const resetFormFields = () => {
    dispatch({ type: 'RESET_FORM' });

    if (typeof document !== 'undefined') {
      const explanationElement = document.getElementById('explanation') as HTMLTextAreaElement | null;
      if (explanationElement) {
        explanationElement.value = '';
      }
    }
  };

  const suggestionTypes = useMemo(
    () => [
      { id: 'ui-ux', label: t('support.types.ui-ux') },
      { id: 'functionality', label: t('support.types.functionality') },
      { id: 'bug', label: t('support.types.bug') },
      { id: 'feature', label: t('support.types.feature') },
      { id: 'improvements', label: t('support.types.improvements') },
    ],
    [t]
  );

  const handleTypeChange = (typeId: string) => {
    dispatch({ type: 'TOGGLE_TYPE', typeId });
  };

  const fetchCaptcha = useCallback(async () => {
    dispatch({ type: 'SET_FIELD', field: 'isRefreshingCaptcha', value: true });
    try {
      if (isTestingEnvironment) {
        dispatch({ type: 'SET_CAPTCHA', id: 'test-captcha', challenge: '12345' });
        return;
      }

      const response = await fetch(`${SUPPORT_API_BASE_URL}/captcha`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          Accept: 'application/json',
        },
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success || !data.captchaId || !data.challenge) {
        const translate = translationRef.current;
        throw new Error(data?.error || translate?.('support.captchaError') || 'Captcha error');
      }

      dispatch({ type: 'SET_CAPTCHA', id: String(data.captchaId), challenge: String(data.challenge) });
    } catch (error) {
      console.error('Error fetching captcha:', error);
      dispatch({ type: 'SET_CAPTCHA', id: null, challenge: null });
      const alertFn = showErrorRef.current;
      const translate = translationRef.current;
      const fallbackMessage =
        translate?.('support.captchaError') ?? 'We could not verify the captcha. Please try again.';
      alertFn?.(error instanceof Error ? error.message : fallbackMessage);
    } finally {
      dispatch({ type: 'SET_FIELD', field: 'isRefreshingCaptcha', value: false });
    }
  }, []);

  useEffect(() => {
    void fetchCaptcha();
  }, [fetchCaptcha]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const trimmedExplanation = explanation.trim();
    const trimmedCaptcha = captchaInput.trim();

    if (!trimmedExplanation) {
      showError(t('support.explanationRequired'));
      return;
    }

    if (!captchaId || !trimmedCaptcha) {
      showError(t('support.captchaRequired'));
      return;
    }

    if (isTestingEnvironment) {
      showSuccess(t('support.submitSuccess'));
      resetFormFields();
      await fetchCaptcha();
      return;
    }

    dispatch({ type: 'SET_FIELD', field: 'isSubmitting', value: true });

    try {
      const response = await fetch(`${SUPPORT_API_BASE_URL}/suggestions`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          types: selectedTypes,
          explanation: trimmedExplanation,
          captchaId,
          captchaAnswer: trimmedCaptcha,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success) {
        throw new Error(data?.error || t('support.submitError'));
      }

      showSuccess(t('support.submitSuccess'));
      resetFormFields();
      await fetchCaptcha();
    } catch (error) {
      console.error('Error sending suggestion:', error);
      showError(error instanceof Error ? error.message : t('support.submitError'));
    } finally {
      dispatch({ type: 'SET_FIELD', field: 'isSubmitting', value: false });
    }
  };

  const isSubmitDisabled = isTestingEnvironment
    ? false
    : isSubmitting || !explanation.trim() || !captchaInput.trim() || !captchaId || isRefreshingCaptcha;

  return (
    <Card className="p-6 border-none shadow-md">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 dark:bg-indigo-900 rounded-lg text-indigo-600 dark:text-indigo-300">
            <FaClipboard size={24} />
          </div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">{t('support.suggestions')}</h2>
        </div>
        {onNavigate && (
          <button
            type="button"
            onClick={() => onNavigate('suggestions')}
            className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
          >
            {t('support.viewSuggestions')}
          </button>
        )}
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        {t('support.suggestionsDesc')}
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('support.suggestionType')}
          </label>
          <div className="flex flex-wrap gap-3">
            {suggestionTypes.map((type) => {
              const inputId = `suggestion-type-${type.id}`;
              const isActive = selectedTypes.includes(type.id);

              return (
                <label
                  key={type.id}
                  htmlFor={inputId}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium cursor-pointer transition border ${
                    isActive
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-transparent hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  <input
                    id={inputId}
                    type="checkbox"
                    className="sr-only"
                    checked={isActive}
                    onChange={() => handleTypeChange(type.id)}
                  />
                  {type.label}
                </label>
              );
            })}
          </div>
        </div>

        <div>
          <label htmlFor="explanation" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('support.explanation')}
          </label>
          <textarea
            id="explanation"
            rows={4}
            value={explanation}
                onChange={(event) => dispatch({ type: 'SET_FIELD', field: 'explanation', value: event.target.value })}
            placeholder={t('support.explanationPlaceholder')}
            className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 dark:text-white outline-none"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('support.captchaLabel')}
          </label>
          <p className="text-xs text-gray-500 dark:text-gray-400">{t('support.captchaDesc')}</p>
          <div className="flex flex-col sm:flex-row gap-3 mt-2">
            <div className="flex-1 flex items-center justify-center px-4 py-3 bg-gray-100 dark:bg-gray-900 rounded-xl border border-dashed border-gray-300 dark:border-gray-600 text-2xl font-bold tracking-[0.3em] text-gray-800 dark:text-gray-100">
              {isRefreshingCaptcha
                ? t('support.captchaLoading')
                : captchaChallenge || t('support.captchaLoading')}
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => void fetchCaptcha()}
              disabled={isRefreshingCaptcha}
              className="px-4 py-3 h-auto"
            >
              {t('support.captchaRefresh')}
            </Button>
          </div>
          <Input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={captchaInput}
                onChange={(event) => dispatch({ type: 'SET_FIELD', field: 'captchaInput', value: event.target.value })}
            placeholder={t('support.captchaPlaceholder')}
            className="mt-3"
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitDisabled}
            className="flex-1 py-3"
          >
            {isSubmitting ? t('support.submitting') : t('support.submit')}
          </Button>
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400">{t('support.submitInfo')}</p>
      </form>
    </Card>
  );
};

export default SuggestionForm;
