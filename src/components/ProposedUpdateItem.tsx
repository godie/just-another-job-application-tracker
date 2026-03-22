import React from 'react';
import { useTranslation } from 'react-i18next';
import type { ProposedUpdate } from '../mails/types';

interface ProposedUpdateItemProps {
  update: ProposedUpdate;
  isSelected: boolean;
  onToggle: () => void;
  formatDate: (date: string) => string;
}

export const ProposedUpdateItem: React.FC<ProposedUpdateItemProps> = ({
  update,
  isSelected,
  onToggle,
  formatDate,
}) => {
  const { t } = useTranslation();

  return (
    <li
      className="group flex items-start gap-4 p-4 rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-green-300 dark:hover:border-green-500/50 shadow-sm transition-all duration-200"
    >
      <input
        type="checkbox"
        id={update.id}
        checked={isSelected}
        onChange={onToggle}
        className="mt-1 h-5 w-5 text-green-600 border-gray-300 dark:border-gray-600 rounded focus:ring-green-500"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <label htmlFor={update.id} className="font-bold text-gray-900 dark:text-white cursor-pointer group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
            {update.position} <span className="text-gray-400 font-normal mx-1">@</span> {update.company}
          </label>
          <span className="px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-[10px] font-bold uppercase tracking-wider">
            +{t(`insights.interviewTypes.${update.newEvent.type}`)}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-1">
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate flex-1">
            {update.source.subject}
          </p>
          <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
            {formatDate(update.source.date)}
          </span>
        </div>
      </div>
    </li>
  );
};
