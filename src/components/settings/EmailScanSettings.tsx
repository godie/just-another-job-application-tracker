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
    <div className="space-y-8">
      <section>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          {t('settings.emailScan.title')}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          {t('settings.emailScan.subtitle')}
        </p>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              {t('settings.emailScan.defaultPeriod')}
            </label>
            <div className="flex flex-wrap gap-3">
              {monthOptions.map((months) => (
                <button
                  key={months}
                  onClick={() => onEmailScanMonthsChange(months)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    emailScanMonths === months
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  {t('settings.emailScan.months', { count: months })}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              {t('settings.emailScan.enabledChatbots')}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {CHATBOTS.map((chatbot) => (
                <label
                  key={chatbot.id}
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${
                    enabledChatbots.includes(chatbot.id)
                      ? 'bg-indigo-50/50 border-indigo-200 dark:bg-indigo-900/10 dark:border-indigo-900/30'
                      : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={enabledChatbots.includes(chatbot.id)}
                    onChange={() => onChatbotToggle(chatbot.id)}
                    className="h-4 w-4 text-indigo-600 border-gray-300 dark:border-gray-600 rounded focus:ring-indigo-500"
                  />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {chatbot.name}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default EmailScanSettings;
