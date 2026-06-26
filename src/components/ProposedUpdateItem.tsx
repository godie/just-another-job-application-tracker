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
      className="group flex items-start gap-4 p-4 rounded-xl border border-border bg-card hover:border-green-300 dark:hover:border-green-500/50 transition-all duration-200"
    >
      <input
        type="checkbox"
        id={update.id}
        checked={isSelected}
        onChange={onToggle}
        aria-label={`Select update: ${update.position} at ${update.company}`}
        className="mt-1 size-5 text-green-600 dark:text-green-300 border-border rounded focus:ring-green-500"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <label htmlFor={update.id} className="font-bold text-foreground cursor-pointer group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
            {update.position} <span className="text-muted-foreground font-normal mx-1">@</span> {update.company}
          </label>
          <span className="px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-[10px] font-bold uppercase tracking-wider">
            +{t(`insights.interviewTypes.${update.newEvent.type}`)}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-1">
          <p className="text-xs text-muted-foreground truncate flex-1">
            {update.source.subject}
          </p>
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {formatDate(update.source.date)}
          </span>
        </div>
      </div>
    </li>
  );
};
