// src/components/ApplicationCard.tsx
import React, { memo } from 'react';
import { useTranslation } from 'react-i18next';
import type { JobApplication } from '../types/applications';
import type { TableColumn } from '../types/table';
import { sanitizeUrl } from '../utils/localStorage';
import DOMPurify from 'dompurify';

interface ApplicationCardProps {
  item: JobApplication;
  otherColumns: TableColumn[];
  onEdit: (application: JobApplication) => void;
  onDeleteRequest: (application: JobApplication) => void;
  getCellValue: (item: JobApplication, columnId: string) => string;
}

// This is a memoized component. It will only re-render if its props change.
// This is crucial for performance on mobile, especially with long lists, as it
// prevents every card from re-rendering due to state changes in the parent
// (e.g., opening a confirmation dialog for another card).
const ApplicationCard: React.FC<ApplicationCardProps> = ({
  item,
  otherColumns,
  onEdit,
  onDeleteRequest,
  getCellValue,
}) => {
  const { t } = useTranslation();
  const createMarkup = (htmlContent: string) => {
    return { __html: DOMPurify.sanitize(htmlContent) };
  };

  const positionValue = getCellValue(item, 'position') || 'No Position';
  const companyValue = getCellValue(item, 'company') || 'No Company';
  const rawStatus = getCellValue(item, 'status');
  const statusValue = rawStatus
    ? t(`statuses.${rawStatus.toLowerCase()}`, rawStatus)
    : 'N/A';

  return (
    <div
      onClick={() => onEdit(item)}
      className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md border border-gray-100 dark:border-gray-700 cursor-pointer hover:shadow-lg transition-shadow"
      data-testid={`card-${item.id}`}
    >
      {/* Primary Info */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate">
            {positionValue}
          </h3>
          <h4 className="text-sm text-gray-600 dark:text-gray-400 truncate mt-0.5">
            {companyValue}
          </h4>
        </div>
        <div className="ml-3 flex-shrink-0">
          <span className="inline-block px-2 py-1 text-xs font-medium rounded bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200">
            {statusValue}
          </span>
        </div>
      </div>

      {/* Other Important Info */}
      <div className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
        {otherColumns.slice(0, 3).map((column) => {
          let value = getCellValue(item, column.id);
          if (column.id === 'platform') {
            value = t(`form.platforms.${value}`, value);
          }
          if (!value) return null;
          const isLink = column.id === 'link';

          return (
            <div key={column.id} className="flex items-center">
              <span className="font-medium text-gray-500 dark:text-gray-500 w-24 flex-shrink-0">
                {column.label}:
              </span>
              {isLink ? (
                <a
                  href={sanitizeUrl(value)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 truncate text-indigo-600 dark:text-indigo-400 hover:underline"
                  onClick={(e) => e.stopPropagation()}
                  dangerouslySetInnerHTML={createMarkup(value)}
                />
              ) : (
                <span
                  className="flex-1 truncate"
                  dangerouslySetInnerHTML={createMarkup(value)}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 flex justify-end">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDeleteRequest(item);
          }}
          className="text-xs font-semibold text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 px-3 py-1 rounded transition"
          aria-label={t('home.deleteConfirm.titleFor', { position: item.position, company: item.company })}
          data-testid={`delete-btn-${item.id}`}
        >
          {t('common.delete')}
        </button>
      </div>
    </div>
  );
};

export default memo(ApplicationCard);
