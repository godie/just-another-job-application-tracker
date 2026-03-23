import React from 'react';
import { useTranslation } from 'react-i18next';
import type { ProposedAddition } from '../mails/types';

interface ProposedAdditionItemProps {
  addition: ProposedAddition;
  isSelected: boolean;
  onToggle: () => void;
  duplicate: boolean;
  isForced: boolean;
  onToggleForce: (forced: boolean) => void;
  formatDate: (date: string) => string;
}

export const ProposedAdditionItem: React.FC<ProposedAdditionItemProps> = ({
  addition,
  isSelected,
  onToggle,
  duplicate,
  isForced,
  onToggleForce,
  formatDate,
}) => {
  const { t } = useTranslation();
  const disabled = duplicate && !isForced;

  return (
    <li
      className={`group flex items-start gap-4 p-4 rounded-xl border transition-all duration-200 ${
        duplicate
          ? 'bg-amber-50/50 border-amber-200 dark:bg-amber-900/10 dark:border-amber-900/30'
          : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-500/50 shadow-sm'
      }`}
    >
      <input
        type="checkbox"
        id={addition.id}
        checked={isSelected}
        onChange={onToggle}
        disabled={disabled}
        className="mt-1 h-5 w-5 text-indigo-600 border-gray-300 dark:border-gray-600 rounded focus:ring-indigo-500 disabled:opacity-30"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <label htmlFor={addition.id} className="font-bold text-gray-900 dark:text-white cursor-pointer group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
            {addition.data.position} <span className="text-gray-400 font-normal mx-1">@</span> {addition.data.company}
          </label>
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            {addition.data.platform}
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
                onChange={(e) => onToggleForce(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-gray-300 dark:border-gray-600 text-indigo-600"
              />
              {t('settings.emailScan.addAnyway')}
            </label>
          </div>
        )}

        <div className="flex items-center gap-3 mt-1">
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate flex-1">
            {addition.source.subject}
          </p>
          <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
            {formatDate(addition.source.date)}
          </span>
        </div>
      </div>
    </li>
  );
};
