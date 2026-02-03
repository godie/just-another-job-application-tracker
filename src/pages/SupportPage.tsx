import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { FaCoffee, FaHeart, FaClipboard } from 'react-icons/fa';
import { useAlert } from '../components/AlertProvider';

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

const SupportPage: React.FC = () => {
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
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [explanation, setExplanation] = useState('');
  const [captchaId, setCaptchaId] = useState<string | null>(null);
  const [captchaChallenge, setCaptchaChallenge] = useState<string | null>(null);
  const [captchaInput, setCaptchaInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshingCaptcha, setIsRefreshingCaptcha] = useState(false);

  const resetFormFields = () => {
    setSelectedTypes([]);
    setExplanation('');
    setCaptchaInput('');

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
    setSelectedTypes((prev) =>
      prev.includes(typeId) ? prev.filter((current) => current !== typeId) : [...prev, typeId]
    );
  };

  const fetchCaptcha = useCallback(async () => {
    setIsRefreshingCaptcha(true);
    try {
      if (isTestingEnvironment) {
        setCaptchaId('test-captcha');
        setCaptchaChallenge('12345');
        setCaptchaInput('');
        return;
      }

      const response = await fetch(`${SUPPORT_API_BASE_URL}/captcha.php`, {
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

      setCaptchaId(String(data.captchaId));
      setCaptchaChallenge(String(data.challenge));
      setCaptchaInput('');
    } catch (error) {
      console.error('Error fetching captcha:', error);
      setCaptchaId(null);
      setCaptchaChallenge(null);
      const alertFn = showErrorRef.current;
      const translate = translationRef.current;
      const fallbackMessage =
        translate?.('support.captchaError') ?? 'We could not verify the captcha. Please try again.';
      alertFn?.(error instanceof Error ? error.message : fallbackMessage);
    } finally {
      setIsRefreshingCaptcha(false);
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

    setIsSubmitting(true);

    try {
      const response = await fetch(`${SUPPORT_API_BASE_URL}/suggestions.php`, {
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
      setIsSubmitting(false);
    }
  };

  const isSubmitDisabled = isTestingEnvironment
    ? false
    : isSubmitting || !explanation.trim() || !captchaInput.trim() || !captchaId || isRefreshingCaptcha;

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 pb-24">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">{t('support.title')}</h1>
        <p className="text-gray-600 dark:text-gray-400">{t('support.subtitle')}</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <section className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-pink-100 dark:bg-pink-900 rounded-lg text-pink-600 dark:text-pink-300">
              <FaHeart size={24} />
            </div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">{t('support.donations')}</h2>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{t('support.donationsDesc')}</p>
          <a
            href="https://buymeacoffee.com/godieboy"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-3 w-full py-4 bg-[#FFDD00] hover:bg-[#FFCC00] text-black font-bold rounded-xl transition-transform hover:scale-105 shadow-lg"
          >
            <FaCoffee size={24} />
            <span>{t('support.buyMeACoffee')}</span>
          </a>
          <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-4">
            {t('common.anyAport')}
          </p>
        </section>

        <section className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900 rounded-lg text-indigo-600 dark:text-indigo-300">
              <FaClipboard size={24} />
            </div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">{t('support.suggestions')}</h2>
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
                onChange={(event) => setExplanation(event.target.value)}
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
                <button
                  type="button"
                  onClick={() => void fetchCaptcha()}
                  disabled={isRefreshingCaptcha}
                  className={`px-4 py-3 rounded-xl font-semibold border border-indigo-200 dark:border-indigo-700 transition ${
                    isRefreshingCaptcha
                      ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
                      : 'bg-white dark:bg-gray-900 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-gray-800'
                  }`}
                >
                  {t('support.captchaRefresh')}
                </button>
              </div>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={captchaInput}
                onChange={(event) => setCaptchaInput(event.target.value)}
                placeholder={t('support.captchaPlaceholder')}
                className="mt-3 w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 dark:text-white outline-none"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="submit"
                disabled={isSubmitDisabled}
                className={`flex-1 font-semibold py-3 px-4 rounded-xl transition flex items-center justify-center ${
                  isSubmitDisabled
                    ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md'
                }`}
              >
                {isSubmitting ? t('support.submitting') : t('support.submit')}
              </button>
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400">{t('support.submitInfo')}</p>
          </form>
        </section>
      </div>

      <section className="mt-12 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl p-6 border border-indigo-100 dark:border-indigo-900/30">
        <h3 className="text-lg font-bold text-indigo-800 dark:text-indigo-300 mb-2">{t('support.howItWorks')}</h3>
        <p className="text-indigo-700 dark:text-indigo-400 text-sm">
          <Trans i18nKey="support.howItWorksDesc">
            Las sugerencias se envían a una pequeña cola.
          </Trans>
        </p>
      </section>
    </div>
  );
};

export default SupportPage;
