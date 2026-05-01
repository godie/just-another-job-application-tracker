// src/components/ApplicationCard.tsx
import React, { memo } from 'react';
import { useTranslation } from 'react-i18next';
import type { JobApplication } from '../types/applications';
import type { ApplicationWithMetadata } from '../hooks/useFilteredApplications';
import type { TableColumn } from '../types/table';
import { sanitizeUrl } from '../utils/localStorage';
import { Card, Badge, Button, Separator } from './ui';
import { getBadgeVariantForStatus } from '../utils/status';

interface ApplicationCardProps {
  item: ApplicationWithMetadata;
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

  const positionValue = getCellValue(item, 'position') || 'No Position';
  const companyValue = getCellValue(item, 'company') || 'No Company';
  // ⚡ Bolt: Use pre-calculated status translation
  const statusValue = item.translatedStatus || 'N/A';


  return (
    <Card
      onClick={() => onEdit(item)}
      className='p-4 cursor-pointer border border-earth-200 dark:border-earth-700 bg-white dark:bg-earth-800 hover:border-sage-300 dark:hover:border-sage-700 transition-colors'
      data-testid={`card-${item.id}`}
    >
      {/* Primary Info */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-earth-900 dark:text-earth-100 truncate" title={positionValue}>
            {positionValue}
          </h3>
          <h4 className="text-sm text-earth-600 dark:text-earth-400 truncate mt-0.5" title={companyValue}>
            {companyValue}
          </h4>
        </div>
        <div className="ml-3 flex-shrink-0">
          <Badge variant={getBadgeVariantForStatus(item.status)}>
            {statusValue}
          </Badge>
        </div>
      </div>

      {/* Other Important Info */}
      <div className="space-y-2 text-xs text-earth-600 dark:text-earth-400">
        {otherColumns.slice(0, 3).map((column) => {
          let value = getCellValue(item, column.id);
          // ⚡ Bolt: Use pre-calculated translations
          if (column.id === 'platform' && item.translatedPlatform) {
            value = item.translatedPlatform;
          } else if (column.id === 'workType' && item.translatedWorkType) {
            value = item.translatedWorkType;
          }
          if (!value) return null;
          const isLink = column.id === 'link';

          return (
            <div key={column.id} className="flex items-center min-w-0">
              <span className="font-medium text-earth-500 dark:text-earth-400 w-24 flex-shrink-0 truncate">
                {column.label}:
              </span>
              {isLink ? (
                <a
                  href={sanitizeUrl(value)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 min-w-0 truncate text-sage-600 dark:text-sage-400 hover:underline"
                  onClick={(e) => e.stopPropagation()}
                  title={value}
                >
                  {value}
                </a>
              ) : (
                <span className="flex-1 min-w-0 truncate" title={value}>
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
