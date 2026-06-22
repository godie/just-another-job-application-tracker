import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CHATBOTS } from '../../utils/constants';
import { GeminiKeyModal } from '../GeminiKeyModal';
import { hasKeyStored, clearStoredKey } from '../../hooks/useCrypto';

interface EmailScanSettingsProps {
  emailScanMonths: number;
  enabledChatbots: string[];
  onEmailScanMonthsChange: (months: number) => void;
  onChatbotToggle: (chatbotId: string) => void;
}

const EmailScanSettings: React.FC<EmailScanSettingsProps> = ({
  emailScanMonths,
  enabledChatbots,
  onEmailScanMonthsChange,
  onChatbotToggle,
}) => {
  const { t } = useTranslation();
  const [showGeminiModal, setShowGeminiModal] = useState(false);
  const [, forceUpdate] = useState(0);
  const keyConfigured = hasKeyStored();

  const handleGeminiKeySuccess = () => {
    setShowGeminiModal(false);
  };

  const handleRemoveKey = () => {
    clearStoredKey();
    forceUpdate(n => n + 1);
  };

  const monthOptions = [3, 6, 9, 12];

  return (
    <div className="space-y-10">
      <section>
        <div className="flex items-center gap-2 mb-6">
          <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 rounded-lg">
            <svg xmlns="http://www.w3.org/2000/svg" className="size-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-earth-800 dark:text-earth-100">
            {t('settings.emailScan.geminiApiKey')}
          </h3>
        </div>

        <div className="bg-earth-50 dark:bg-earth-700/50 rounded-lg border border-earth-200 dark:border-earth-600 p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {keyConfigured ? (
                <>
                  <div className="size-8 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                    <svg className="size-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-earth-800 dark:text-earth-100">{t('settings.emailScan.geminiKeyConfigured')}</p>
                    <p className="text-xs text-earth-500 dark:text-earth-400">{t('settings.emailScan.geminiKeyConfiguredDesc')}</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="size-8 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
                    <svg className="size-4 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-earth-800 dark:text-earth-100">{t('settings.emailScan.geminiKeyNotConfigured')}</p>
                    <p className="text-xs text-earth-500 dark:text-earth-400">{t('settings.emailScan.geminiKeyNotConfiguredDesc')}</p>
                  </div>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              {keyConfigured && (
                <button
                  type='button'
                  onClick={handleRemoveKey}
                  className="px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded border border-red-200 dark:border-red-800 transition"
                >
                  {t('settings.emailScan.geminiKeyRemove')}
                </button>
              )}
              <button
                type='button'
                onClick={() => setShowGeminiModal(true)}
                className="px-4 py-2 text-sm font-medium bg-sage-600 text-white hover:bg-sage-700 rounded transition"
              >
                {keyConfigured ? t('settings.emailScan.geminiKeyChange') : t('settings.emailScan.geminiKeySetup')}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="flex items-center gap-2 mb-6">
          <div className="p-2 bg-amber-100 dark:bg-amber-900/30 text-amber-600 rounded-lg">
            <svg xmlns="http://www.w3.org/2000/svg" className="size-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-earth-800 dark:text-earth-100">
            {t('settings.emailScan.defaultPeriod')}
          </h3>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {monthOptions.map((months) => (
            <button
              type='button'
              key={months}
              onClick={() => onEmailScanMonthsChange(months)}
              className={`flex flex-col items-center justify-center p-4 rounded border-2 transition-all ${
                emailScanMonths === months
                  ? 'border-sage-600 bg-sage-50/50 dark:bg-sage-900/20 text-sage-700 dark:text-sage-300'
                  : 'border-earth-200 dark:border-earth-700 text-earth-500 dark:text-earth-400 hover:border-earth-300 dark:hover:border-earth-600'
              }`}
            >
              <span className="text-2xl font-bold">{months}</span>
              <span className="text-xs uppercase tracking-wider font-semibold">{t('settings.emailScan.months', { count: months }).split(' ')[1]}</span>
            </button>
          ))}
        </div>
        <p className="mt-4 text-sm text-earth-500 dark:text-earth-400 italic">
          {t('settings.emailScan.subtitle')}
        </p>
      </section>

      <section>
        <div className="flex items-center gap-2 mb-6">
          <div className="p-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 rounded-lg">
            <svg xmlns="http://www.w3.org/2000/svg" className="size-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zm-4 0H9v2h2V9z" clipRule="evenodd" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-earth-800 dark:text-earth-100">
            {t('settings.emailScan.enabledChatbots')}
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {CHATBOTS.map((chatbot) => {
            const isEnabled = enabledChatbots.includes(chatbot.id);
            return (
              <label
                key={chatbot.id}
                className={`flex items-center gap-4 p-4 rounded border-2 cursor-pointer transition-all ${
                  isEnabled
                    ? 'border-sage-600 bg-sage-50/50 dark:bg-sage-900/20'
                    : 'border-earth-200 dark:border-earth-700 hover:border-earth-300 dark:hover:border-earth-600'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isEnabled}
                  onChange={() => onChatbotToggle(chatbot.id)}
                  aria-label={chatbot.name}
                  className='size-5 text-sage-600 border-earth-300 dark:border-earth-600 rounded focus:ring-sage-500'
                />
                <span className={`font-bold ${isEnabled ? 'text-sage-700 dark:text-sage-300' : 'text-earth-700 dark:text-earth-300'}`}>
                  {chatbot.name}
                </span>
              </label>
            );
          })}
        </div>
      </section>

      <GeminiKeyModal
        isOpen={showGeminiModal}
        onClose={() => setShowGeminiModal(false)}
        onSuccess={handleGeminiKeySuccess}
      />
    </div>
  );
};

export default EmailScanSettings;
