import React from 'react';
import { useTranslation } from 'react-i18next';
import { CHATBOTS } from '../../utils/constants';

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

  const monthOptions = [3, 6, 9, 12];

  return (
    <div className="space-y-10">
      <section>
        <div className="flex items-center gap-2 mb-6">
          <div className="p-2 bg-amber-100 dark:bg-amber-900/30 text-amber-600 rounded-lg">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            {t('settings.emailScan.defaultPeriod')}
          </h3>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {monthOptions.map((months) => (
            <button
              key={months}
              onClick={() => onEmailScanMonthsChange(months)}
              className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
                emailScanMonths === months
                  ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300'
                  : 'border-gray-100 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-200 dark:hover:border-gray-600'
              }`}
            >
              <span className="text-2xl font-bold">{months}</span>
              <span className="text-xs uppercase tracking-wider font-semibold">{t('settings.emailScan.months', { count: months }).split(' ')[1]}</span>
            </button>
          ))}
        </div>
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400 italic">
          {t('settings.emailScan.subtitle')}
        </p>
      </section>

      <section>
        <div className="flex items-center gap-2 mb-6">
          <div className="p-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 rounded-lg">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zm-4 0H9v2h2V9z" clipRule="evenodd" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            {t('settings.emailScan.enabledChatbots')}
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {CHATBOTS.map((chatbot) => {
            const isEnabled = enabledChatbots.includes(chatbot.id);
            return (
              <label
                key={chatbot.id}
                className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  isEnabled
                    ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/20'
                    : 'border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isEnabled}
                  onChange={() => onChatbotToggle(chatbot.id)}
                  className="h-5 w-5 text-indigo-600 border-gray-300 dark:border-gray-600 rounded focus:ring-indigo-500"
                />
                <span className={`font-bold ${isEnabled ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-700 dark:text-gray-300'}`}>
                  {chatbot.name}
                </span>
              </label>
            );
          })}
        </div>
      </section>
    </div>
  );
};

export default EmailScanSettings;
