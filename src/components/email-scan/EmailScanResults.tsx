import React from 'react';
import { useTranslation } from 'react-i18next';
import { type ProposedAddition, type ProposedUpdate } from '../../mails/types';

interface EmailScanResultsProps {
  proposedAdditions: ProposedAddition[];
  proposedUpdates: ProposedUpdate[];
  selectedAdditions: Set<string>;
  selectedUpdates: Set<string>;
  forceAddIds: Set<string>;
  isDuplicate: (company: string, position: string) => boolean;
  onToggleAddition: (id: string) => void;
  onToggleUpdate: (id: string) => void;
  onSelectAllAdditions: () => void;
  onSelectAllUpdates: () => void;
  onToggleForceAdd: (id: string) => void;
  formatDate: (date: string) => string;
}

const EmailScanResults: React.FC<EmailScanResultsProps> = ({
  proposedAdditions,
  proposedUpdates,
  selectedAdditions,
  selectedUpdates,
  forceAddIds,
  isDuplicate,
  onToggleAddition,
  onToggleUpdate,
  onSelectAllAdditions,
  onSelectAllUpdates,
  onToggleForceAdd,
  formatDate,
}) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-6 mt-8">
      {proposedAdditions.length > 0 && (
        <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 text-xs dark:bg-indigo-900/40 dark:text-indigo-300">
                {proposedAdditions.length}
              </span>
              {t('settings.emailScan.newApplications', {
                count: proposedAdditions.length,
              })}
            </h3>
            <button
              type="button"
              onClick={onSelectAllAdditions}
              className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              {t('settings.emailScan.selectAll')}
            </button>
          </div>
          <ul className="grid gap-3">
            {proposedAdditions.map((item) => {
              const duplicate = isDuplicate(item.data.company, item.data.position);
              const isForced = forceAddIds.has(item.id);
              const disabled = duplicate && !isForced;

              return (
                <li
                  key={item.id}
                  className={`group flex items-start gap-4 p-4 rounded-xl border transition-all duration-200 ${
                    duplicate
                      ? 'bg-amber-50/50 border-amber-200 dark:bg-amber-900/10 dark:border-amber-900/30'
                      : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-500/50 shadow-sm'
                  }`}
                >
                  <input
                    type="checkbox"
                    id={item.id}
                    checked={selectedAdditions.has(item.id)}
                    onChange={() => onToggleAddition(item.id)}
                    disabled={disabled}
                    className="mt-1 h-5 w-5 text-indigo-600 border-gray-300 dark:border-gray-600 rounded focus:ring-indigo-500 disabled:opacity-30"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <label htmlFor={item.id} className="font-bold text-gray-900 dark:text-white cursor-pointer group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {item.data.position} <span className="text-gray-400 font-normal mx-1">@</span> {item.data.company}
                      </label>
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {item.data.platform}
                      </span>
                    </div>

                    {duplicate && (
                      <div className="flex flex-col gap-2 mt-2 mb-3">
                        <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 text-xs font-medium">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          {t('settings.emailScan.duplicateWarning')}
                        </div>
                        <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isForced}
                            onChange={() => onToggleForceAdd(item.id)}
                            className="h-3.5 w-3.5 rounded border-gray-300 dark:border-gray-600 text-indigo-600"
                          />
                          {t('settings.emailScan.addAnyway')}
                        </label>
                      </div>
                    )}

                    <div className="flex items-center gap-3 mt-1">
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate flex-1">
                        {item.source.subject}
                      </p>
                      <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
                        {formatDate(item.source.date)}
                      </span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {proposedUpdates.length > 0 && (
        <section className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100 text-green-700 text-xs dark:bg-green-900/40 dark:text-indigo-300">
                {proposedUpdates.length}
              </span>
              {t('settings.emailScan.updatesToExisting', {
                count: proposedUpdates.length,
              })}
            </h3>
            <button
              type="button"
              onClick={onSelectAllUpdates}
              className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              {t('settings.emailScan.selectAll')}
            </button>
          </div>
          <ul className="grid gap-3">
            {proposedUpdates.map((item) => (
              <li
                key={item.id}
                className="group flex items-start gap-4 p-4 rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-green-300 dark:hover:border-green-500/50 shadow-sm transition-all duration-200"
              >
                <input
                  type="checkbox"
                  id={item.id}
                  checked={selectedUpdates.has(item.id)}
                  onChange={() => onToggleUpdate(item.id)}
                  className="mt-1 h-5 w-5 text-green-600 border-gray-300 dark:border-gray-600 rounded focus:ring-green-500"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <label htmlFor={item.id} className="font-bold text-gray-900 dark:text-white cursor-pointer group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                      {item.position} <span className="text-gray-400 font-normal mx-1">@</span> {item.company}
                    </label>
                    <span className="px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-[10px] font-bold uppercase tracking-wider">
                      +{t(`insights.interviewTypes.${item.newEvent.type}`)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate flex-1">
                      {item.source.subject}
                    </p>
                    <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
                      {formatDate(item.source.date)}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {proposedAdditions.length === 0 && proposedUpdates.length === 0 && (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-700/30 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700">
          <p className="text-gray-500 dark:text-gray-400">
            {t('settings.emailScan.nothingFound')}
          </p>
        </div>
      )}
    </div>
  );
};

export default EmailScanResults;
