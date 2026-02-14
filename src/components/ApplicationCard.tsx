// src/components/ApplicationCard.tsx
import React, { memo } from 'react';
import { useTranslation } from 'react-i18next';
import type { TableColumn } from '../types/table';
import { sanitizeUrl } from '../utils/localStorage';
import { Card, Badge, Button, Separator } from './ui';
import type { ApplicationWithMetadata } from '../hooks/useFilteredApplications';

interface ApplicationCardProps {
  item: ApplicationWithMetadata;
  otherColumns: TableColumn[];
  onEdit: (application: ApplicationWithMetadata) => void;
  onDeleteRequest: (application: ApplicationWithMetadata) => void;
  getCellValue: (item: ApplicationWithMetadata, columnId: string) => string;
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

  const positionValue = getCellValue(item, 'position') || 'No Position';
  const companyValue = getCellValue(item, 'company') || 'No Company';

  // ⚡ Bolt: Use pre-calculated translated values from item metadata.
  const statusValue = item.translatedStatus || 'N/A';

  return (
    <Card
      onClick={() => onEdit(item)}
      className="p-4 cursor-pointer hover:shadow-lg transition-shadow"
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
          <Badge variant="indigo">
            {statusValue}
          </Badge>
        </div>
      </div>

      {/* Other Important Info */}
      <div className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
        {otherColumns.slice(0, 3).map((column) => {
          let value = getCellValue(item, column.id);

          // ⚡ Bolt: Use pre-calculated translated values from item metadata.
          if (column.id === 'platform') {
            value = item.translatedPlatform || value;
          } else if (column.id === 'workType') {
            value = item.translatedWorkType || value;
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
                >
                  {value}
                </a>
              ) : (
                <span className="flex-1 truncate">
                  {value}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <Separator className="my-3" />
      <div className="flex justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onDeleteRequest(item);
          }}
          className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 px-3 py-1 rounded transition"
          aria-label={t('home.deleteConfirm.titleFor', { position: item.position, company: item.company })}
          data-testid={`delete-btn-${item.id}`}
        >
          {t('common.delete')}
        </Button>
      </div>
    </Card>
  );
};

export default memo(ApplicationCard);
