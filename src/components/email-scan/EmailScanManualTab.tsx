import React from 'react';
import { useTranslation } from 'react-i18next';
import { CHATBOTS } from '../../utils/constants';
import type { Email } from '../../mails/types';

interface EmailScanManualTabProps {
  snippetLength: number;
  selectedEmailIds: Set<string>;
  pastedJson: string;
  enabledChatbots: string[];
  emails: Email[];
  onSnippetLengthChange: (length: number) => void;
  onGeneratePrompt: (chatbot?: { id: string; name: string; url: string }) => void;
  onSelectAllEmails: () => void;
  onToggleEmail: (id: string) => void;
  onPastedJsonChange: (json: string) => void;
  onProcessJson: () => void;
  formatDate: (date: string) => string;
}

const EmailScanManualTab: React.FC<EmailScanManualTabProps> = ({
  snippetLength,
  selectedEmailIds,
  pastedJson,
  enabledChatbots,
  emails,
  onSnippetLengthChange,
  onGeneratePrompt,
  onSelectAllEmails,
  onToggleEmail,
  onPastedJsonChange,
  onProcessJson,
  formatDate,
}) => {
  const { t } = useTranslation();
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-300">
      {emails.length > 0 && (
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-4 border border-gray-200 dark:border-gray-600">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label htmlFor="snippetLength" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('settings.emailScan.snippetLength')}
                </label>
                <input
                  type="number"
                  id="snippetLength"
                  value={snippetLength}
                  onChange={(e) => onSnippetLengthChange(parseInt(e.target.value) || 200)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('settings.emailScan.generatePrompt')}
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => onGeneratePrompt()}
                  disabled={selectedEmailIds.size === 0}
                  className="px-4 py-2 rounded-lg font-medium border border-indigo-200 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-900/30 dark:text-indigo-300 dark:hover:bg-indigo-900/20 transition flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                  </svg>
                  {t('common.copy')}
                </button>

                {CHATBOTS.filter(cb => enabledChatbots.includes(cb.id)).map(chatbot => (
                  <button
                    key={chatbot.id}
                    onClick={() => onGeneratePrompt(chatbot)}
                    disabled={selectedEmailIds.size === 0}
                    className="px-4 py-2 rounded-lg font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    {t('settings.emailScan.copyAndOpen', { name: chatbot.name })}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                {t('settings.emailScan.emailsFound', { count: emails.length })}
              </h4>
              <button onClick={onSelectAllEmails} className="text-xs text-indigo-600 hover:underline">
                {t('settings.emailScan.selectAll')}
              </button>
            </div>
            <div className="max-h-60 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-lg divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-800">
              {emails.map(email => (
                <div key={email.id} className="flex items-start gap-3 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <input
                    type="checkbox"
                    checked={selectedEmailIds.has(email.id)}
                    onChange={() => onToggleEmail(email.id)}
                    className="mt-1"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{email.subject}</p>
                    <p className="text-xs text-gray-500 truncate">{email.from}</p>
                  </div>
                  <span className="text-[10px] text-gray-400 whitespace-nowrap">{formatDate(email.date)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-2 border border-gray-200 dark:border-gray-600">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {t('settings.emailScan.pasteJson')}
        </label>
        <textarea
          value={pastedJson}
          onChange={(e) => onPastedJsonChange(e.target.value)}
          className="w-full h-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm font-mono"
          placeholder='{ "additions": [...], "updates": [...] }'
        />
        <button
          onClick={onProcessJson}
          disabled={!pastedJson.trim()}
          className="w-full px-4 py-2 rounded-lg font-medium bg-green-600 text-white hover:bg-green-700 transition"
        >
          {t('settings.emailScan.processJson')}
        </button>
      </div>
    </div>
  );
};

export default EmailScanManualTab;
